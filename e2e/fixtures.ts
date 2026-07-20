import { test as base, type Page } from '@playwright/test'

export interface ProgressRow {
  user_id: string
  completed_lessons: string[]
  completed_drills: string[]
  quiz_attempts: Record<string, { score: number; total: number; date: string }>
}

export interface SupabaseStub {
  /** Rows currently held by the fake `progress` table, keyed by user id. */
  rows: Map<string, ProgressRow>
  /** Set the row a signed-in user will pull down on their next sync. */
  seedRow(userId: string, row: Partial<Omit<ProgressRow, 'user_id'>>): void
  /** Every upsert the app has sent, in order. */
  upserts: ProgressRow[]
  /** Force the next `progress` select to fail, to exercise the offline path. */
  failNextSelect(): void
}

const USER_ID = 'e2e-user-1'
export const TEST_EMAIL = 'player@example.com'
export const TEST_PASSWORD = 'pw123456'

function session() {
  return {
    access_token: 'stub-access-token',
    refresh_token: 'stub-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: TEST_EMAIL,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }
}

/**
 * Intercepts every call to the stub Supabase project so e2e runs are hermetic:
 * no network, no shared test account, no cleanup between runs.
 */
async function installSupabaseStub(page: Page): Promise<SupabaseStub> {
  const stub: SupabaseStub = {
    rows: new Map(),
    upserts: [],
    seedRow(userId, row) {
      stub.rows.set(userId, {
        user_id: userId,
        completed_lessons: row.completed_lessons ?? [],
        completed_drills: row.completed_drills ?? [],
        quiz_attempts: row.quiz_attempts ?? {},
      })
    },
    failNextSelect() {
      failSelect = true
    },
  }
  let failSelect = false

  // The stub project is a different origin from the preview server, so every
  // response needs CORS headers and preflights must be answered explicitly —
  // otherwise the browser blocks the request before the handler below matters.
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-expose-headers': 'content-range',
  }

  await page.route('https://stub.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(body),
      })

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders, body: '' })
    }

    // ---- auth ----
    if (pathname === '/auth/v1/token') {
      const body = request.postDataJSON() as { email?: string; password?: string }
      if (body.email !== TEST_EMAIL || body.password !== TEST_PASSWORD) {
        return json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400)
      }
      return json(session())
    }

    if (pathname === '/auth/v1/signup') {
      // Mirrors a project with email confirmation on: no session until confirmed.
      return json({ ...session().user, identities: [] })
    }

    if (pathname === '/auth/v1/logout') {
      return route.fulfill({ status: 204, headers: corsHeaders, body: '' })
    }

    if (pathname === '/auth/v1/recover') {
      // GoTrue always returns 200 here regardless of whether the email exists,
      // so the client can't be used to enumerate accounts.
      return json({})
    }

    // GET returns the current user; PUT (updateUser) changes the password and
    // echoes the updated user back.
    if (pathname === '/auth/v1/user') {
      return json(session().user)
    }

    // ---- progress table ----
    if (pathname === '/rest/v1/progress') {
      if (request.method() === 'GET') {
        if (failSelect) {
          failSelect = false
          return json({ message: 'simulated outage' }, 500)
        }
        // PostgREST filters look like `user_id=eq.<id>`.
        const filter = url.searchParams.get('user_id') ?? ''
        const userId = filter.replace(/^eq\./, '')
        const row = stub.rows.get(userId)
        return json(row ? [row] : [])
      }

      if (request.method() === 'POST') {
        const payload = request.postDataJSON() as ProgressRow | ProgressRow[]
        for (const row of Array.isArray(payload) ? payload : [payload]) {
          stub.upserts.push(row)
          stub.rows.set(row.user_id, row)
        }
        return json([], 201)
      }
    }

    return json({}, 200)
  })

  return stub
}

export const test = base.extend<{ supabase: SupabaseStub }>({
  // The fixture callback is named `provide` rather than the conventional `use`
  // so the react-hooks lint rule does not mistake it for a React hook.
  supabase: async ({ page }, provide) => {
    const stub = await installSupabaseStub(page)
    await provide(stub)
  },
})

export { expect } from '@playwright/test'
export { USER_ID }
