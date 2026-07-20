import { NavLink } from 'react-router-dom'

export function NavBar() {
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
        </nav>
      </div>
    </header>
  )
}
