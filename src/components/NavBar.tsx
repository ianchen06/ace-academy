import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function NavBar() {
  const { isConfigured, user } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location])

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand" end onClick={() => setOpen(false)}>
          <span className="brand-ball" aria-hidden="true" />
          Ace Academy
        </NavLink>
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/curriculum">Curriculum</NavLink>
          <NavLink to="/drills">Drills</NavLink>
          <NavLink to="/quizzes">Quizzes</NavLink>
          {isConfigured && (
            <NavLink to="/account">{user ? user.email : 'Sign In'}</NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
