import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { registerUser } from '../services/user-management-api';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
  CircularProgress,
  Snackbar,
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
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
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
      setSuccessMsg('Регистрация успешна!');
      navigate('/helpdesk/tickets');
    } catch (err) {
      const errors = err.response?.data;
      if (errors?.email) setError(errors.email[0]);
      else if (errors?.username) setError(errors.username[0]);
      else if (errors?.password) setError(errors.password[0]);
      else if (errors?.password_confirm) setError(errors.password_confirm[0]);
      else if (errors?.detail) setError(errors.detail);
      else setError('Ошибка регистрации. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hd-page px-4 py-12">
      <Paper elevation={0} className="hd-card w-full max-w-md p-8">
        <Typography component="h1" variant="h5" fontWeight={700} className="!mb-6 !text-center">
          Регистрация
        </Typography>

        {error && <Alert severity="error" className="!mb-4">{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField required fullWidth name="username" label="Имя пользователя" value={form.username} onChange={handleChange} disabled={loading} autoFocus />
          <TextField required fullWidth name="email" label="Электронная почта" type="email" value={form.email} onChange={handleChange} disabled={loading} />
          <TextField required fullWidth name="password" label="Пароль" type="password" value={form.password} onChange={handleChange} disabled={loading} />
          <TextField required fullWidth name="password2" label="Подтвердите пароль" type="password" value={form.password2} onChange={handleChange} disabled={loading} />

          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} className="!mt-2">
            {loading ? <CircularProgress size={26} color="inherit" /> : 'Зарегистрироваться'}
          </Button>

          <Box className="text-center">
            <Link component={RouterLink} to="/login" variant="body2">
              Уже есть аккаунт? Войти
            </Link>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={Boolean(successMsg)} autoHideDuration={3000} onClose={() => setSuccessMsg('')} message={successMsg} />
    </div>
  );
}
