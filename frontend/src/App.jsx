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
  EngineersList, CategoriesPage, KBList, KBDetail, NotificationsPage, PrioritiesPage
} from './components'

import Layout from './components/Layout/Layout.jsx';

// 🔥 Создаем нашу фиолетовую тему
const theme = createTheme({
  palette: {
    primary: {
      main: '#7c3aed', // Красивый современный фиолетовый (Violet 600)
      light: '#a78bfa',
      dark: '#5b21b6',
      contrastText: '#ffffff', // Цвет текста на кнопке
    },
    // Вторичный цвет можешь настроить по желанию
    secondary: {
      main: '#f43f5e', // Например, розово-красный для акцентов
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Отключаем дурацкий капслок на кнопках по умолчанию
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // Немного скругляем все элементы по умолчанию
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
              
              {/* ✅ Уведомления вынесены на уровень helpdesk (/helpdesk/notifications) */}
              <Route path="notifications" element={<NotificationsPage />} />

              <Route path="priorities" element={<PrioritiesPage />} />
              <Route path="kb">
                <Route index element={<KBList />} /> {/* Сработает на /helpdesk/kb */}
                <Route path=":id" element={<KBDetail />} /> {/* Сработает на /helpdesk/kb/15 */}
              </Route>

              <Route path="tickets">
                <Route index element={<TicketsPage />} />
                <Route path="create" element={<TicketCreateForm />} />
                <Route path=":id" element={<TicketDetail />} />
                {/* ✅ Исправлен путь на относительный */}
                <Route path=":id/update" element={<EditTicket />} />
              </Route>
              <Route path="shift-management" element={<ShiftManagement />} />

            </Route>

            <Route path="users">
              <Route index element={<UsersList />} />
              <Route path="update/:id" element={<UserUpdate />} />
              <Route path=":id" element={<UserProfile />} />
              <Route path=":me/profile" element={<UserProfile />} />
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
