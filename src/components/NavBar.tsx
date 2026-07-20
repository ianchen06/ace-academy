import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function NavBar() {
  const { isConfigured, user } = useAuth()

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand" end>
          <span className="brand-ball" aria-hidden="true" />
          Ace Academy
        </NavLink>
        <nav className="nav-links">
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
