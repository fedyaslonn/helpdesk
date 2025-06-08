import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute';

import UsersList from './components/UsersList';
import UserCreate from './components/UserCreation';
import UserUpdate from './components/UserUpdate';
import OrganizationsList from './components/OrganizationsList';
import CreateOrganization from './components/OrganizationCreation';
import CreateComment from './components/CommentCreation';
import LoginForm from './auth/LoginForm';
import LogoutButton from './auth/Logout';
import TicketsPage from './components/TicketsList';
import TicketCreateForm from './components/TicketCreation';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<UserCreate />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/helpdesk/tickets" />} />

            <Route path="helpdesk">
              <Route path="tickets">
                <Route index element={<TicketsPage />} />
                <Route path="create" element={<TicketCreateForm />} />
              </Route>
            </Route>

            <Route path="users">
              <Route index element={<UsersList />} />
              <Route path="update/:id" element={<UserUpdate />} />
            </Route>

            <Route path="organizations">
              <Route index element={<OrganizationsList />} />
              <Route path="create" element={<CreateOrganization />} />
            </Route>

            <Route path="comments">
              <Route path="create" element={<CreateComment />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
