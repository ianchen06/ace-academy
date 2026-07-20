import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

export function Account() {
  const { user, loading, isConfigured, passwordRecovery, signIn, signUp, signOut, resetPassword, updatePassword } =
    useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot'>('sign-in')
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

  if (passwordRecovery) {
    const handleUpdate = async (e: FormEvent) => {
      e.preventDefault()
      setError(null)
      setInfo(null)
      setSubmitting(true)
      const result = await updatePassword(password)
      setSubmitting(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setPassword('')
      setInfo('Your password has been updated. You are now signed in.')
    }

    return (
      <div className="page account-page">
        <h1>Set a New Password</h1>
        <p className="page-intro">
          Choose a new password for your account. Once saved, you'll stay signed in on this device.
        </p>

        <form className="auth-form" onSubmit={(e) => void handleUpdate(e)}>
          <label>
            New password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Please wait...' : 'Update password'}
          </button>
        </form>
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
    if (mode === 'forgot') {
      const result = await resetPassword(email)
      setSubmitting(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setInfo('If an account exists for that email, a password reset link is on its way.')
      return
    }
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

  const heading = mode === 'sign-in' ? 'Sign In' : mode === 'sign-up' ? 'Create an Account' : 'Reset Password'

  return (
    <div className="page account-page">
      <h1>{heading}</h1>
      <p className="page-intro">
        {mode === 'forgot'
          ? 'Enter your account email and we’ll send you a link to reset your password.'
          : 'Sign in to sync your progress across devices. Guests can still use the app — progress is saved locally on this device instead.'}
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
        {mode !== 'forgot' && (
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
        )}

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting
            ? 'Please wait...'
            : mode === 'sign-in'
              ? 'Sign In'
              : mode === 'sign-up'
                ? 'Sign Up'
                : 'Send reset link'}
        </button>
      </form>

      {mode === 'sign-in' && (
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode('forgot')
            setError(null)
            setInfo(null)
          }}
        >
          Forgot your password?
        </button>
      )}

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
