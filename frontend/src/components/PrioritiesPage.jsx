import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPriorities, createPriority, updatePriority, deletePriority } from '../services/ticket-management-api';

import {
  Container, Box, Typography, TextField, Button, Paper, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Stack, Chip
} from '@mui/material';

const PrioritiesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [priorities, setPriorities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', level: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPriorities = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getPriorities();
      setPriorities(response.data.results || response.data);
    } catch (err) {
      setError("Ошибка загрузки приоритетов");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startEditing = (priority) => {
    setIsEditing(true);
    setEditingId(priority.id);
    setFormData({ name: priority.name, level: priority.level });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', level: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        level: parseInt(formData.level, 10)
      };

      if (isEditing) {
        await updatePriority(editingId, payload);
      } else {
        await createPriority(payload);
      }
      resetForm();
      fetchPriorities();
    } catch (err) {
      alert(err.response?.data?.name?.[0] || err.response?.data?.level?.[0] || "Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить этот приоритет? Заявки с этим приоритетом могут пострадать.")) return;
    try {
      await deletePriority(id);
      setPriorities(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Ошибка при удалении. Возможно, этот приоритет уже используется в заявках.");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress size={40} />
        <Typography mt={2} color="text.secondary">Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
      <Typography variant="h4" fontWeight="bold" color="#1e293b" mb={4}>
        Справочник приоритетов
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {isAdmin && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>
            {isEditing ? 'Редактирование приоритета' : 'Новый приоритет'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
            <TextField 
              label="Название" 
              name="name" 
              placeholder="Напр. Критический" 
              value={formData.name} 
              onChange={handleFormChange} 
              required 
              sx={{ flexGrow: 1, bgcolor: 'white' }}
              size="small"
            />
            <TextField 
              label="Уровень (вес)" 
              name="level" 
              type="number" 
              inputProps={{ min: 1 }}
              value={formData.level} 
              onChange={handleFormChange} 
              required 
              sx={{ width: 120, bgcolor: 'white' }}
              size="small"
            />
            <Stack direction="row" spacing={1}>
              {isEditing && (
                <Button variant="outlined" color="inherit" onClick={resetForm} disabled={isSubmitting}>
                  Отмена
                </Button>
              )}
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                {isSubmitting ? '...' : (isEditing ? 'Сохранить' : 'Добавить')}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {priorities.length === 0 ? (
        <Alert severity="info">Приоритеты не настроены.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '100px', textAlign: 'center' }}>Уровень</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Название</TableCell>
                {isAdmin && <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {priorities.map(priority => (
                <TableRow key={priority.id} hover>
                  <TableCell align="center">
                    <Chip label={priority.level} color="primary" size="small" sx={{ fontWeight: 'bold' }} />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">{priority.name}</Typography>
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button variant="text" size="small" onClick={() => startEditing(priority)}>
                          Изменить
                        </Button>
                        <Button variant="text" color="error" size="small" onClick={() => handleDelete(priority.id)}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default PrioritiesPage;
