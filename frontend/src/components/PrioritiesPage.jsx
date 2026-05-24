import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPriorities, createPriority, updatePriority, deletePriority } from '../services/ticket-management-api';

import { PageLayout, PageHeader } from './ui';
import {
  Box, Typography, TextField, Button, Paper,
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
      <Box display="flex" flexDirection="column" alignItems="center" sx={{ mt: 10, px: 2, py: 4 }}>
        <CircularProgress size={40} />
        <Typography mt={2} color="text.secondary">Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <PageLayout maxWidth="max-w-3xl">
      <PageHeader title="Справочник приоритетов" subtitle="Уровни приоритета для заявок" />

      {error && <Alert severity="error" sx={{ mb: 3, mx: { xs: 0.5, sm: 0 } }}>{error}</Alert>}

      {isAdmin && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            mb: { xs: 3, sm: 4 },
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 3,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, px: { xs: 0.5, sm: 1 } }}>
            {isEditing ? 'Редактирование приоритета' : 'Новый приоритет'}
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              p: { xs: 1.5, sm: 2 },
              pt: { xs: 2, sm: 2.5 },
              bgcolor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
            }}
          >
            <TextField 
              label="Название" 
              name="name" 
              placeholder="Напр. Критический" 
              value={formData.name} 
              onChange={handleFormChange} 
              required 
              sx={{ flexGrow: 1, minWidth: 200, bgcolor: 'white' }}
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
              sx={{ width: { xs: '100%', sm: 120 }, maxWidth: 160, bgcolor: 'white' }}
              size="small"
            />
            <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' }, pt: { xs: 0.5, sm: 0 } }}>
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
        <Alert severity="info" sx={{ mx: { xs: 0.5, sm: 0 } }}>Приоритеты не настроены.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            mt: 1,
            mx: { xs: 0.5, sm: 0 },
            overflow: 'hidden',
          }}
        >
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
    </PageLayout>
  );
};

export default PrioritiesPage;
