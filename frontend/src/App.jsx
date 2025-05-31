import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import UsersList from './components/UsersList.jsx'
import UserCreate from './components/UserCreation.jsx'
import UserUpdate from './components/UserUpdate.jsx'
import OrganizationsList from './components/OrganizationsList.jsx'
import CreateOrganization from './components/OrganizationCreation.jsx'
import CreateComment from './components/CommentCreation.jsx'
import './App.css'

function App() {
  return (
    <Router>
      <nav>
        <Link to="/users">Users list</Link>
        <Link to="/users/create">Create User</Link>
        <Link to="/organizations/organizations_list">Organizations List</Link>
        <Link to="/organizations/create">Create Organization</Link>
        <Link to="/comments/create">Create Comment</Link>
      </nav>

      <Routes>
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/create" element={<UserCreate />} />
        <Route path="/users/updaet/:id" element={<UserUpdate />} />
        <Route path="/organizations/organizations_list/" element={<OrganizationsList />} />
        <Route path="/organizations/create/" element={<CreateOrganization />} />
        <Route path="/comments/create/" element={<CreateComment />} />
      </Routes>
    </Router>
  );
}

export default App
