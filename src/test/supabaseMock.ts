import { vi } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'

export interface ProgressRow {
  completed_lessons: string[]
  completed_drills: string[]
  quiz_attempts: Record<string, { score: number; total: number; date: string }>
}

export interface SupabaseMockOptions {
  /** Row returned by the `progress` select, or null when the user has no row yet. */
  progressRow?: ProgressRow | null
  /** Error returned by the `progress` select. */
  selectError?: { message: string } | null
  /** Session returned by `auth.getSession()`. */
  session?: Session | null
}

/**
 * A hand-rolled stand-in for the bits of the Supabase client this app touches.
 *
 * The real client is a deep builder chain, so rather than mocking method-by-method
 * at each call site we expose the same shape once and hand back spies the tests
 * can assert against.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const { progressRow = null, selectError = null, session = null } = options

  /**
   * Payloads that actually reached the "server".
   *
   * A real PostgrestBuilder is lazy: building the query issues no request, and
   * the fetch only happens when the builder is awaited or `.then()`-ed. The
   * mock reproduces that, so code which builds an upsert and never awaits it is
   * correctly seen as having sent nothing.
   */
  const upsertRequests: Record<string, unknown>[] = []

  const upsert = vi.fn((payload: Record<string, unknown>) => ({
    then(
      onFulfilled?: (value: { data: null; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      upsertRequests.push(payload)
      return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
    },
  }))

  const maybeSingle = vi.fn().mockResolvedValue({
    data: selectError ? null : progressRow,
    error: selectError,
  })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select, upsert }))

  const unsubscribe = vi.fn()
  let authCallback: ((event: string, session: Session | null) => void) | null = null

  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
      authCallback = cb
      return { data: { subscription: { unsubscribe } } }
    }),
    signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }

  return {
    client: { from, auth },
    spies: { from, select, eq, maybeSingle, upsert, auth, unsubscribe },
    /** Upserts that were actually executed (i.e. awaited), newest last. */
    upsertRequests,
    /** Drive `onAuthStateChange` the way GoTrue would after a sign-in or sign-out. */
    emitAuthChange(event: string, next: Session | null) {
      authCallback?.(event, next)
    },
  }
}

export function makeUser(id = 'user-1', email = 'player@example.com'): User {
  return { id, email, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' } as User
}

export function makeSession(user: User = makeUser()): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session
}
