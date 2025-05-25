import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import UsersList from './components/UsersList/index.jsx'
import UserCreate from './components/UserCreation/index.jsx'
import UserUpdate from './components/UserUpdate/index.jsx'
import OrganizationsList from './components/OrganizationList/index.jsx'
import CreateOrganization from './components/OrganizationCreation/index.jsx'
import CreateComment from './components/CommentCreation/index.jsx'
import CommentsList from './components/CommentsList/index.jsx'
import './App.css'

function App() {
  return (
    <Router>
      <nav>
        <Link to="/users">Users list</Link>
        <Link to="/users/create">Create User</Link>
        <Link to="/organizations/organizations_list">Organizations List</Link>
        <Link to="/organizations/create">Create Organization</Link>
        <Link to="/comments/comments_list">Comments list</Link>
        <Link to="/comments/create">Create Comment</Link>
      </nav>

      <Routes>
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/create" element={<UserCreate />} />
        <Route path="/users/updaet/:id" element={<UserUpdate />} />
        <Route path="/organizations/organizations_list/" element={<OrganizationsList />} />
        <Route path="/organizations/create/" element={<CreateOrganization />} />
        <Route path="/comments/list" element={<CommentsList />} />
        <Route path="/comments/create/" element={<CreateComment />} />
      </Routes>
    </Router>
  );
}

export default App
