import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { AuthContext, type AuthContextValue } from './authContextDef'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Backend is not configured yet.' }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Backend is not configured yet.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Backend is not configured yet.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/account`,
    })
    return { error: error?.message ?? null }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: 'Backend is not configured yet.' }
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setPasswordRecovery(false)
    return { error: error?.message ?? null }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: (session?.user as User | undefined) ?? null,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      passwordRecovery,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [session, loading, passwordRecovery, signUp, signIn, signOut, resetPassword, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
