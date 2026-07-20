import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

export function Account() {
  const { user, loading, isConfigured, signIn, signUp, signOut } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isConfigured) {
    return (
      <div className="page account-page">
        <h1>Account</h1>
        <p className="page-intro">
          Cloud accounts aren't set up yet on this deployment. Progress is being saved locally
          on this device in the meantime.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page account-page">
        <h1>Account</h1>
        <p className="page-intro">Loading...</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="page account-page">
        <h1>Account</h1>
        <p className="page-intro">
          Signed in as <strong>{user.email}</strong>. Your progress syncs to this account across
          devices.
        </p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            void signOut()
          }}
        >
          Sign out
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const result = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (mode === 'sign-up') {
      setInfo('Account created. Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="page account-page">
      <h1>{mode === 'sign-in' ? 'Sign In' : 'Create an Account'}</h1>
      <p className="page-intro">
        Sign in to sync your progress across devices. Guests can still use the app — progress is
        saved locally on this device instead.
      </p>

      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
          setError(null)
          setInfo(null)
        }}
      >
        {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
