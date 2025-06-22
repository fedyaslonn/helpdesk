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
          <LogOutButton />
        </nav>
      </div>
    </header>
  )
}

export default Header
