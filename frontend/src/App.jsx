import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthContext, AuthProvider, LoginForm, LogOutButton } from './auth';

import { UsersList, UserCreate, UserUpdate, TicketsPage, OrganizationsList, CreateOrganization, TicketCreateForm, ProtectedRoute, CreateComment } from './components'
import Layout from './components/Layout/Layout.jsx';


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
                <Route path="helpdesk/tickets/create" element={<TicketCreateForm />} />
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
