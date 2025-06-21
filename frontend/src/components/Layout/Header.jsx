import { Link } from 'react-router-dom'
import { LogOutButton } from '../../auth/'

const Header = () => {
    const userId = localStorage.getItem('user_id')
  return (
    <header className="header">
      <div className="header-left">
        <h1>Help desk</h1>
      </div>
          {userId && (
            <Link
              to={`/users/${userId}/profile`}
              className="profile-link"
              style={{ marginLeft: "100px" }}
            >
              My Profile
            </Link>
       )}
      <div className="header-right">
        <nav className="main-nav">
          <LogOutButton />
        </nav>
      </div>
    </header>
  )
}

export default Header
