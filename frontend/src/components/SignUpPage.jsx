// src/components/SignUpPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { registerUser } from '../services/user-management-api';
import { message } from 'antd'; 

import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
  CircularProgress
} from '@mui/material';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
        password_confirm: form.password2,
      });

      await login(form.username, form.password);

      message.success('Регистрация успешна!');
      navigate('/helpdesk/tickets');

    } catch (err) {
      const errors = err.response?.data;
      if (errors?.email) setError(errors.email[0]);
      else if (errors?.username) setError(errors.username[0]);
      else if (errors?.password) setError(errors.password[0]);
      else if (errors?.password_confirm) setError(errors.password_confirm[0]);
      else if (errors?.detail) setError(errors.detail);
      else setError('Ошибка регистрации. Попробуйте позже.');

      message.error('Регистрация не удалась');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={6} 
        sx={{ 
          mt: 8, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 3 
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e293b' }}>
          Регистрация
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Имя пользователя"
            name="username"
            autoComplete="username"
            autoFocus
            value={form.username}
            onChange={handleChange}
            disabled={loading}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Электронная почта"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Пароль"
            type="password"
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password2"
            label="Подтвердите пароль"
            type="password"
            id="password2"
            value={form.password2}
            onChange={handleChange}
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary" // MUI сам подхватит наш фиолетовый цвет из темы!
            disabled={loading}
            sx={{ 
              mt: 4, 
              mb: 2, 
              py: 1.5, 
              fontSize: '1rem',
              boxShadow: 3,
              '&:hover': {
                boxShadow: 6, // Красивая тень при наведении
              }
            }}
          >
            {loading ? <CircularProgress size={26} color="inherit" /> : 'Зарегистрироваться'}
          </Button>

          <Box textAlign="center" sx={{ mt: 1 }}>
            <Link component={RouterLink} to="/login" variant="body2" sx={{ textDecoration: 'none', color: 'primary.main' }}>
              Уже есть аккаунт? Войти
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
