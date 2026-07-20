import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createSupabaseMock, makeSession, makeUser } from '../test/supabaseMock'

const mockState: { client: unknown; configured: boolean } = { client: null, configured: false }

vi.mock('../lib/supabaseClient', () => ({
  get supabase() {
    return mockState.client
  },
  get isSupabaseConfigured() {
    return mockState.configured
  },
}))

const { AuthProvider } = await import('./AuthContext')
const { useAuth } = await import('../hooks/useAuth')

function Probe() {
  const { user, session, loading, isConfigured, signUp, signIn, signOut } = useAuth()
  return (
    <div>
      <span data-testid="user">{user?.email ?? 'anonymous'}</span>
      <span data-testid="session">{session ? 'active' : 'none'}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="configured">{String(isConfigured)}</span>
      <button onClick={() => void signUp('a@b.com', 'pw123456')}>sign up</button>
      <button onClick={() => void signIn('a@b.com', 'pw123456')}>sign in</button>
      <button onClick={() => void signOut()}>sign out</button>
    </div>
  )
}

function renderProbe() {
  return { user: userEvent.setup(), ...render(<AuthProvider><Probe /></AuthProvider>) }
}

function configure(options: Parameters<typeof createSupabaseMock>[0] = {}) {
  const mock = createSupabaseMock(options)
  mockState.client = mock.client
  mockState.configured = true
  return mock
}

beforeEach(() => {
  mockState.client = null
  mockState.configured = false
})

describe('AuthProvider — backend not configured', () => {
  it('reports itself unconfigured and not loading', () => {
    renderProbe()
    expect(screen.getByTestId('configured')).toHaveTextContent('false')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
  })

  it('returns an explanatory error from signUp instead of throwing', async () => {
    let result: { error: string | null } | undefined
    function Capture() {
      const { signUp } = useAuth()
      return <button onClick={async () => { result = await signUp('a@b.com', 'pw') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toMatch(/not configured/i)
  })

  it('returns an explanatory error from signIn instead of throwing', async () => {
    let result: { error: string | null } | undefined
    function Capture() {
      const { signIn } = useAuth()
      return <button onClick={async () => { result = await signIn('a@b.com', 'pw') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toMatch(/not configured/i)
  })

  it('makes signOut a safe no-op', async () => {
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'sign out' }))
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
  })

  it('returns an explanatory error from resetPasswordForEmail instead of throwing', async () => {
    let result: { error: string | null } | undefined
    function Capture() {
      const { resetPasswordForEmail } = useAuth()
      return <button onClick={async () => { result = await resetPasswordForEmail('a@b.com') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toMatch(/not configured/i)
  })

  it('returns an explanatory error from updatePassword instead of throwing', async () => {
    let result: { error: string | null } | undefined
    function Capture() {
      const { updatePassword } = useAuth()
      return <button onClick={async () => { result = await updatePassword('pw123456') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toMatch(/not configured/i)
  })

  it('throws a helpful error when useAuth is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/AuthProvider/i)
    spy.mockRestore()
  })
})

describe('AuthProvider — backend configured', () => {
  it('starts in a loading state and clears it once the session resolves', async () => {
    configure({ session: null })
    renderProbe()
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
  })

  it('exposes a restored session as the current user', async () => {
    configure({ session: makeSession() })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('player@example.com'))
    expect(screen.getByTestId('session')).toHaveTextContent('active')
  })

  it('stays anonymous when there is no stored session', async () => {
    configure({ session: null })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
  })

  it('picks up a sign-in pushed through onAuthStateChange', async () => {
    const mock = configure({ session: null })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    act(() => mock.emitAuthChange('SIGNED_IN', makeSession(makeUser('user-2', 'new@example.com'))))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('new@example.com'))
  })

  it('clears the user when signed out via onAuthStateChange', async () => {
    const mock = configure({ session: makeSession() })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('player@example.com'))

    act(() => mock.emitAuthChange('SIGNED_OUT', null))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'))
  })

  it('forwards credentials to signInWithPassword', async () => {
    const mock = configure({ session: null })
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'sign in' }))
    expect(mock.spies.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw123456' })
  })

  it('sends an email redirect that respects the deploy base path', async () => {
    const mock = configure({ session: null })
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'sign up' }))

    const options = mock.spies.auth.signUp.mock.calls[0][0]
    expect(options.email).toBe('a@b.com')
    expect(options.options.emailRedirectTo).toBe(window.location.origin + import.meta.env.BASE_URL)
  })

  it('surfaces a sign-in error message', async () => {
    const mock = configure({ session: null })
    mock.spies.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })

    let result: { error: string | null } | undefined
    function Capture() {
      const { signIn } = useAuth()
      return <button onClick={async () => { result = await signIn('a@b.com', 'bad') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toBe('Invalid login credentials')
  })

  it('surfaces a sign-up error message', async () => {
    const mock = configure({ session: null })
    mock.spies.auth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } })

    let result: { error: string | null } | undefined
    function Capture() {
      const { signUp } = useAuth()
      return <button onClick={async () => { result = await signUp('a@b.com', 'pw') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toBe('User already registered')
  })

  it('sends a password-reset email with a redirect that respects the deploy base path', async () => {
    const mock = configure({ session: null })
    let result: { error: string | null } | undefined
    function Capture() {
      const { resetPasswordForEmail } = useAuth()
      return <button onClick={async () => { result = await resetPasswordForEmail('a@b.com') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))

    expect(mock.spies.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: window.location.origin + import.meta.env.BASE_URL + 'reset-password',
    })
    expect(result?.error).toBeNull()
  })

  it('surfaces a reset-password error message', async () => {
    const mock = configure({ session: null })
    mock.spies.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { message: 'rate limited' } })

    let result: { error: string | null } | undefined
    function Capture() {
      const { resetPasswordForEmail } = useAuth()
      return <button onClick={async () => { result = await resetPasswordForEmail('a@b.com') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toBe('rate limited')
  })

  it('forwards the new password to updateUser', async () => {
    const mock = configure({ session: makeSession() })
    let result: { error: string | null } | undefined
    function Capture() {
      const { updatePassword } = useAuth()
      return <button onClick={async () => { result = await updatePassword('newpw123') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))

    expect(mock.spies.auth.updateUser).toHaveBeenCalledWith({ password: 'newpw123' })
    expect(result?.error).toBeNull()
  })

  it('surfaces an update-password error message', async () => {
    const mock = configure({ session: makeSession() })
    mock.spies.auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'weak password' } })

    let result: { error: string | null } | undefined
    function Capture() {
      const { updatePassword } = useAuth()
      return <button onClick={async () => { result = await updatePassword('short') }}>go</button>
    }
    const user = userEvent.setup()
    render(<AuthProvider><Capture /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(result?.error).toBe('weak password')
  })

  it('calls through to signOut', async () => {
    const mock = configure({ session: makeSession() })
    const { user } = renderProbe()
    await user.click(screen.getByRole('button', { name: 'sign out' }))
    expect(mock.spies.auth.signOut).toHaveBeenCalled()
  })

  it('unsubscribes from auth changes on unmount', async () => {
    const mock = configure({ session: null })
    const { unmount } = renderProbe()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    unmount()
    expect(mock.spies.unsubscribe).toHaveBeenCalled()
  })
})
