import { Link } from 'react-router-dom'
import { LogOutButton } from '../../auth/'

const Header = () => {
  return (
    <header className="header">
      <div className="header-left">
        <h1>Help desk</h1>
      </div>
      <div className="header-right">
        <nav className="main-nav">
          <Link to="/helpdesk/tickets">Tickets</Link>
          <Link to="/users">Users</Link>
          <Link to="/helpdesk/organizations">Organizations</Link>
          <LogOutButton />
        </nav>
      </div>
    </header>
  )
}

export default Header
