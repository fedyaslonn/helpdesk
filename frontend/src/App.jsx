import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider, LoginForm } from './auth';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { muiTheme } from './theme/muiTheme';
import { LoadingState } from './components/ui';

import {
  UsersList,
  UserUpdate,
  TicketsPage,
  TicketCreateForm,
  ProtectedRoute,
  CreateComment,
  TicketDetail,
  EditTicket,
  ShiftManagement,
  UserProfile,
  SignUpPage,
  EngineersList,
  CategoriesPage,
  KBList,
  KBDetail,
  NotificationsPage,
  PrioritiesPage,
  ClassificationRulesPage,
  KBArticleCreate,
  SystemMetrics,
  GrafanaMetrics, // <-- ДОБАВЛЕН ИМПОРТ НОВОГО КОМПОНЕНТА
} from './components';

import Layout from './components/Layout/Layout.jsx';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <LoadingState message="Загрузка приложения..." fullScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignUpPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/helpdesk/tickets" />} />

              <Route path="helpdesk">
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="priorities" element={<PrioritiesPage />} />
                <Route path="classification-rules" element={<ClassificationRulesPage />} />

                {/* Существующие метрики API */}
                <Route path="api/metrics" element={<SystemMetrics />} />
                {/* <-- ДОБАВЛЕН МАРШРУТ ДЛЯ НОВОГО КОМПОНЕНТА С ГРАФАНОЙ --> */}
                <Route path="grafana-metrics" element={<GrafanaMetrics />} />

                <Route path="kb-articles">
                  <Route index element={<KBList />} />
                  <Route path="create" element={<KBArticleCreate />} />
                  <Route path=":id" element={<KBDetail />} />
                </Route>

                <Route path="tickets">
                  <Route index element={<TicketsPage />} />
                  <Route path="create" element={<TicketCreateForm />} />
                  <Route path=":id" element={<TicketDetail />} />
                  <Route path=":id/update" element={<EditTicket />} />
                </Route>
                <Route path="shift-management" element={<ShiftManagement />} />
              </Route>

              <Route path="users">
                <Route index element={<UsersList />} />
                <Route path="update/:id" element={<UserUpdate />} />
                <Route path=":id" element={<UserProfile />} />
                <Route path="me/profile" element={<UserProfile />} />
              </Route>

              <Route path="comments">
                <Route path="create" element={<CreateComment />} />
              </Route>

              <Route path="engineers">
                <Route index element={<EngineersList />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
