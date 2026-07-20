import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ResetPassword() {
  const { isConfigured, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isConfigured) {
    return (
      <div className="page account-page">
        <h1>Reset your password</h1>
        <p className="page-intro">
          Cloud accounts aren't set up yet on this deployment, so there's no password to reset.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setInfo('Password updated. Redirecting...')
    navigate('/account')
  }

  return (
    <div className="page account-page">
      <h1>Reset your password</h1>
      <p className="page-intro">Choose a new password for your account.</p>

      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
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
        <label>
          Confirm password
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
