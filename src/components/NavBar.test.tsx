import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

const { NavBar } = await import('./NavBar')
const { AuthProvider } = await import('../context/AuthContext')

function renderNav(route = '/') {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <NavBar />
          <Routes>
            <Route path="*" element={<div />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    ),
  }
}

beforeEach(() => {
  mockState.client = null
  mockState.configured = false
})

describe('NavBar', () => {
  it('links to every top-level section', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Curriculum' })).toHaveAttribute('href', '/curriculum')
    expect(screen.getByRole('link', { name: 'Drills' })).toHaveAttribute('href', '/drills')
    expect(screen.getByRole('link', { name: 'Quizzes' })).toHaveAttribute('href', '/quizzes')
  })

  it('shows the brand link home', () => {
    renderNav()
    expect(screen.getByRole('link', { name: /Ace Academy/ })).toHaveAttribute('href', '/')
  })

  it('marks the current section as active', () => {
    renderNav('/drills')
    expect(screen.getByRole('link', { name: 'Drills' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Curriculum' })).not.toHaveClass('active')
  })

  it('does not mark Dashboard active on a nested route', () => {
    renderNav('/curriculum/beginner')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('active')
  })

  it('hides the account link when no backend is configured', () => {
    renderNav()
    expect(screen.queryByRole('link', { name: /Sign In/ })).not.toBeInTheDocument()
  })

  it('offers a Sign In link when configured but signed out', async () => {
    const mock = createSupabaseMock({ session: null })
    mockState.client = mock.client
    mockState.configured = true

    renderNav()
    expect(await screen.findByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/account')
  })

  it('shows the signed-in email in place of Sign In', async () => {
    const mock = createSupabaseMock({ session: makeSession() })
    mockState.client = mock.client
    mockState.configured = true

    renderNav()
    expect(await screen.findByRole('link', { name: 'player@example.com' })).toHaveAttribute('href', '/account')
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument()
  })

  describe('mobile menu', () => {
    it('starts closed', () => {
      const { container } = renderNav()
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
      expect(container.querySelector('.nav-links')).not.toHaveClass('open')
    })

    it('opens when the toggle is pressed', async () => {
      const { user, container } = renderNav()
      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
      expect(container.querySelector('.nav-links')).toHaveClass('open')
    })

    it('closes again when the toggle is pressed twice', async () => {
      const { user, container } = renderNav()
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      await user.click(screen.getByRole('button', { name: 'Close menu' }))

      expect(container.querySelector('.nav-links')).not.toHaveClass('open')
    })

    it('closes after navigating to another section', async () => {
      const { user, container } = renderNav()
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      await user.click(screen.getByRole('link', { name: 'Drills' }))

      expect(container.querySelector('.nav-links')).not.toHaveClass('open')
    })

    it('closes when the brand link is used', async () => {
      const { user, container } = renderNav('/drills')
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      await user.click(screen.getByRole('link', { name: /Ace Academy/ }))

      expect(container.querySelector('.nav-links')).not.toHaveClass('open')
    })
  })
})
