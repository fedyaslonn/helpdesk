import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthContext, AuthProvider, LoginForm, LogOutButton } from './auth';

// 🔥 Импортируем инструменты для темы из MUI
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { 
  UsersList, UserCreate, UserUpdate, TicketsPage, OrganizationsList, 
  CreateOrganization, TicketCreateForm, ProtectedRoute, CreateComment, 
  TicketDetail, EditTicket, ShiftManagement, OrganizationMembers, 
  OrganizationApplications, UserProfile, OrganizationUpdate, SignUpPage, 
  EngineersList, CategoriesPage, KBList, KBDetail, NotificationsPage, PrioritiesPage,
  ClassificationRulesPage, 
  KBArticleCreate, SystemMetrics // 🔥 ДОБАВИЛ ИМПОРТ КОМПОНЕНТА СОЗДАНИЯ СТАТЬИ БЗ (проверь название!)
} from './components'

import Layout from './components/Layout/Layout.jsx';

// 🔥 Создаем нашу фиолетовую тему
const theme = createTheme({
  palette: {
    primary: {
      main: '#7c3aed', 
      light: '#a78bfa',
      dark: '#5b21b6',
      contrastText: '#ffffff', 
    },
    secondary: {
      main: '#f43f5e', 
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', 
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, 
  },
});

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ThemeProvider theme={theme}>
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
                
                {/* 🔥 ВОТ СЮДА НУЖНО ВСТАВИТЬ МЕТРИКИ! 🔥 */}
                <Route path="api/metrics" element={<SystemMetrics />} />
                
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
              </Route> {/* 👈 Конец блока helpdesk */}

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
              
              {/* ❌ СТРОЧКУ С МЕТРИКАМИ ОТСЮДА (снизу) МЫ УБРАЛИ! ❌ */}
              
            </Route>
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
