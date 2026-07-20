import { afterEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.fn(() => ({ marker: 'client' }))

vi.mock('@supabase/supabase-js', () => ({ createClient }))

/** The module reads env at import time, so each case needs a fresh module registry. */
async function importWith(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, '')
    else vi.stubEnv(key, value)
  }
  return import('./supabaseClient')
}

afterEach(() => {
  vi.unstubAllEnvs()
  createClient.mockClear()
})

describe('supabaseClient', () => {
  it('creates a client when both env vars are present', async () => {
    const mod = await importWith({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    })

    expect(mod.isSupabaseConfigured).toBe(true)
    expect(mod.supabase).not.toBeNull()
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key')
  })

  it('stays unconfigured when both env vars are missing', async () => {
    const mod = await importWith({ VITE_SUPABASE_URL: undefined, VITE_SUPABASE_ANON_KEY: undefined })

    expect(mod.isSupabaseConfigured).toBe(false)
    expect(mod.supabase).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('stays unconfigured when only the url is set', async () => {
    const mod = await importWith({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: undefined,
    })

    expect(mod.isSupabaseConfigured).toBe(false)
    expect(mod.supabase).toBeNull()
  })

  it('stays unconfigured when only the anon key is set', async () => {
    const mod = await importWith({
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    })

    expect(mod.isSupabaseConfigured).toBe(false)
    expect(mod.supabase).toBeNull()
  })
})
