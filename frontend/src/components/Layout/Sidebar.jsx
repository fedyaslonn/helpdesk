import { Link, useLocation } from 'react-router-dom'

const Sidebar = () => {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <nav className="nav-menu">
        <ul>
          <li className={location.pathname.startsWith('/helpdesk') ? 'active' : ''}>
            <Link to="/helpdesk/tickets">
              <span className="icon">📋</span>
              Tickets
            </Link>
          </li>
          <li className={location.pathname.startsWith('/users') ? 'active' : ''}>
            <Link to="/users">
              <span className="icon">👥</span>
              Users
            </Link>
          </li>
          <li className={location.pathname.startsWith('/organizations') ? 'active' : ''}>
            <Link to="/organizations">
              <span className="icon">🏢</span>
              Organizations
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
