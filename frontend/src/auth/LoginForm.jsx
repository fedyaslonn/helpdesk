import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/helpdesk/tickets';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Неверное имя пользователя или пароль');
      } else {
        setError('Произошла ошибка при подключении к серверу');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hd-page px-4 py-12">
      <Paper
        elevation={0}
        className="hd-card w-full max-w-md p-8"
      >
        <Box className="mb-6 text-center">
          <Typography component="span" className="text-3xl" aria-hidden>
          </Typography>
          <Typography component="h1" variant="h5" fontWeight={700} className="!mt-2">
            Вход в Службу технической поддержки
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" className="!mb-4">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            required
            fullWidth
            id="username"
            label="Имя пользователя"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <TextField
            required
            fullWidth
            name="password"
            label="Пароль"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            size="large"
            className="!mt-2"
          >
            {loading ? <CircularProgress size={26} color="inherit" /> : 'Войти'}
          </Button>

          <Box className="text-center">
            <Link component={RouterLink} to="/signup" variant="body2">
              Нет аккаунта? Зарегистрироваться
            </Link>
          </Box>
        </Box>
      </Paper>
    </div>
  );
}
