import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const navigateSpy = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateSpy }
})

const { ResetPassword } = await import('./ResetPassword')
const { AuthProvider } = await import('../context/AuthContext')

function renderReset() {
  return { user: userEvent.setup(), ...render(<AuthProvider><ResetPassword /></AuthProvider>) }
}

function configure(options: Parameters<typeof createSupabaseMock>[0] = {}) {
  const mock = createSupabaseMock(options)
  mockState.client = mock.client
  mockState.configured = true
  return mock
}

async function setPasswords(user: ReturnType<typeof userEvent.setup>, next: string, confirm: string) {
  await user.type(await screen.findByLabelText('New password'), next)
  await user.type(screen.getByLabelText('Confirm password'), confirm)
  await user.click(screen.getByRole('button', { name: /Update password/i }))
}

beforeEach(() => {
  mockState.client = null
  mockState.configured = false
  navigateSpy.mockClear()
})

describe('ResetPassword — no backend configured', () => {
  it('explains that cloud accounts are not set up', () => {
    renderReset()
    expect(screen.getByText(/aren't set up/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })
})

describe('ResetPassword — configured', () => {
  it('rejects mismatched passwords without calling the backend', async () => {
    const mock = configure({ session: makeSession() })
    const { user } = renderReset()
    await setPasswords(user, 'newpw123', 'different')

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mock.spies.auth.updateUser).not.toHaveBeenCalled()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('updates the password and redirects to the account page', async () => {
    const mock = configure({ session: makeSession() })
    const { user } = renderReset()
    await setPasswords(user, 'newpw123', 'newpw123')

    expect(mock.spies.auth.updateUser).toHaveBeenCalledWith({ password: 'newpw123' })
    expect(navigateSpy).toHaveBeenCalledWith('/account')
  })

  it('surfaces a backend error and does not redirect', async () => {
    const mock = configure({ session: makeSession() })
    mock.spies.auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'weak password' } })
    const { user } = renderReset()
    await setPasswords(user, 'newpw123', 'newpw123')

    expect(await screen.findByText('weak password')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
