import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createSupabaseMock, makeSession } from '../test/supabaseMock'

const mockState: { client: unknown; configured: boolean } = { client: null, configured: false }

vi.mock('../lib/supabaseClient', () => ({
  get supabase() {
    return mockState.client
  },
  get isSupabaseConfigured() {
    return mockState.configured
  },
}))

const { Account } = await import('./Account')
const { AuthProvider } = await import('../context/AuthContext')

function renderAccount() {
  return { user: userEvent.setup(), ...render(<AuthProvider><Account /></AuthProvider>) }
}

function configure(options: Parameters<typeof createSupabaseMock>[0] = {}) {
  const mock = createSupabaseMock(options)
  mockState.client = mock.client
  mockState.configured = true
  return mock
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email = 'a@b.com', password = 'pw123456') {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: /^(Sign In|Sign Up)$/ }))
}

beforeEach(() => {
  mockState.client = null
  mockState.configured = false
})

describe('Account — no backend configured', () => {
  it('explains that progress is local only', () => {
    renderAccount()
    expect(screen.getByText(/saved locally/i)).toBeInTheDocument()
  })

  it('offers no sign-in form', () => {
    renderAccount()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })
})

describe('Account — signed out', () => {
  it('shows a loading state until the session resolves', async () => {
    configure({ session: null })
    renderAccount()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
  })

  it('renders the sign-in form by default', async () => {
    configure({ session: null })
    renderAccount()
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('requires an email and a six-character password', async () => {
    configure({ session: null })
    renderAccount()
    await screen.findByLabelText('Email')

    expect(screen.getByLabelText('Email')).toBeRequired()
    expect(screen.getByLabelText('Password')).toBeRequired()
    expect(screen.getByLabelText('Password')).toHaveAttribute('minLength', '6')
  })

  it('switches to sign-up mode', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Don't have an account/ }))

    expect(screen.getByRole('heading', { name: 'Create an Account' })).toBeInTheDocument()
  })

  it('shows sign-up-specific intro copy in sign-up mode', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Don't have an account/ }))

    expect(screen.getByText(/Create a free account to sync your progress/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sign in to sync your progress/i)).not.toBeInTheDocument()
  })

  it('switches back to sign-in mode', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Don't have an account/ }))
    await user.click(screen.getByRole('button', { name: /Already have an account/ }))

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('uses the right autocomplete hint per mode', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await screen.findByLabelText('Password')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')

    await user.click(screen.getByRole('button', { name: /Don't have an account/ }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('submits the typed credentials', async () => {
    const mock = configure({ session: null })
    const { user } = renderAccount()
    await screen.findByLabelText('Email')
    await fillAndSubmit(user)

    expect(mock.spies.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw123456' })
  })

  it('shows a confirmation notice after signing up', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Don't have an account/ }))
    await fillAndSubmit(user)

    expect(await screen.findByText(/Check your email to confirm/)).toBeInTheDocument()
  })

  it('surfaces a sign-in failure', async () => {
    const mock = configure({ session: null })
    mock.spies.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })

    const { user } = renderAccount()
    await screen.findByLabelText('Email')
    await fillAndSubmit(user)

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
  })

  it('clears a previous error when toggling mode', async () => {
    const mock = configure({ session: null })
    mock.spies.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })

    const { user } = renderAccount()
    await screen.findByLabelText('Email')
    await fillAndSubmit(user)
    await screen.findByText('Invalid login credentials')

    await user.click(screen.getByRole('button', { name: /Don't have an account/ }))
    expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument()
  })

  it('does not show the confirmation notice when sign-up fails', async () => {
    const mock = configure({ session: null })
    mock.spies.auth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } })

    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Don't have an account/ }))
    await fillAndSubmit(user)

    expect(await screen.findByText('User already registered')).toBeInTheDocument()
    expect(screen.queryByText(/Check your email to confirm/)).not.toBeInTheDocument()
  })
})

describe('Account — forgot password', () => {
  it('switches to forgot mode and hides the password field', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Forgot password/i }))

    expect(screen.getByRole('heading', { name: /Reset your password/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('shows reset-specific intro copy instead of the sign-in copy', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Forgot password/i }))

    expect(screen.getByText(/send you a link to reset your password/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sign in to sync your progress/i)).not.toBeInTheDocument()
  })

  it('sends a reset link and shows a neutral confirmation that does not disclose the account', async () => {
    const mock = configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Forgot password/i }))
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: /Send reset link/i }))

    expect(mock.spies.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', expect.anything())
    expect(await screen.findByText(/reset link is on its way/i)).toBeInTheDocument()
  })

  it('returns to sign-in and clears messages from the back link', async () => {
    configure({ session: null })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: /Forgot password/i }))
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: /Send reset link/i }))
    await screen.findByText(/reset link is on its way/i)

    await user.click(screen.getByRole('button', { name: /Back to sign in/i }))
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.queryByText(/reset link is on its way/i)).not.toBeInTheDocument()
  })
})

describe('Account — signed in', () => {
  it('greets the signed-in user by email', async () => {
    configure({ session: makeSession() })
    renderAccount()
    expect(await screen.findByText('player@example.com')).toBeInTheDocument()
  })

  it('offers a sign-out button instead of the form', async () => {
    configure({ session: makeSession() })
    renderAccount()
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('signs the user out', async () => {
    const mock = configure({ session: makeSession() })
    const { user } = renderAccount()
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(mock.spies.auth.signOut).toHaveBeenCalled()
  })
})
