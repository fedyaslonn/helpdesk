import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthContext, AuthProvider, LoginForm, LogOutButton } from './auth';

import { UsersList, UserCreate, UserUpdate, TicketsPage, OrganizationsList, CreateOrganization, TicketCreateForm, ProtectedRoute, CreateComment, TicketDetail, EditTicket, ShiftManagement, OrganizationMembers, OrganizationApplications, UserProfile, OrganizationUpdate } from './components'
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
                <Route path="create" element={<TicketCreateForm />} />
                <Route path=":id" element={<TicketDetail />} />
                  <Route path="/helpdesk/tickets/:id/update" element={<EditTicket />} />
              </Route>
            </Route>

            <Route path="users">
              <Route index element={<UsersList />} />
              <Route path="update/:id" element={<UserUpdate />} />
              <Route path=":id/profile" element={<UserProfile />} />
            </Route>

            <Route path="organizations">
              <Route index element={<OrganizationsList />} />
              <Route path="create" element={<CreateOrganization />} />
              <Route path=":organizationId/members" element={<OrganizationMembers />} />
              <Route path="shift-management" element={<ShiftManagement />} />
              <Route path="applications" element={<OrganizationApplications />} />
              <Route path="/organizations/:id/update" element={<OrganizationUpdate />} />
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
