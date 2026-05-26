import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../auth/AuthContext";
import { getCategories, createTicket } from '../services/ticket-management-api';

import { PageLayout, PageHeader, ButtonGroup } from './ui';
import {
  Box, Typography, TextField, Button, Paper,
  Alert, CircularProgress, MenuItem, Stack
} from '@mui/material';

const TicketCreateForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ description: '', category: '' });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        const cats = response.data.results || response.data;
        setCategories(cats);

        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, category: cats[0].id.toString() }));
        }
      } catch (err) {
        setError('Не удалось загрузить категории');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) {
      setError('Необходимо выбрать категорию')
      return
    }
    setIsSubmitting(true);
    try {
      const ticketData = {
        description: formData.description,
        category: parseInt(formData.category),
        user: user.id 
      };
      await createTicket(ticketData);
      navigate('/helpdesk/tickets');
    } catch (err) {
      setError('Ошибка при создании заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" sx={{ mt: 10, px: 2, py: 4 }}>
        <CircularProgress size={40} />
        <Typography mt={2} color="text.secondary">Подготовка формы...</Typography>
      </Box>
    );
  }

  return (
    <PageLayout maxWidth="max-w-xl">
      <Paper elevation={0} className="hd-card !p-6 md:!p-8">
        <PageHeader title="Новая заявка" subtitle="Опишите проблему и выберите категорию" />

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Stack spacing={3} mb={4}>
            <TextField
              select
              label="Категория проблемы"
              name="category"
              value={formData.category}
              onChange={handleChange}
              fullWidth
              required
              sx={{ bgcolor: 'background.paper' }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Подробное описание проблемы"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Подробно опишите, с чем вы столкнулись..."
              multiline
              rows={6}
              fullWidth
              required
              sx={{ bgcolor: 'background.paper' }}
            />
          </Stack>

          <ButtonGroup vertical className="!mt-2">
            <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Создание…' : 'Создать заявку'}
            </Button>
            <Button variant="outlined" color="inherit" fullWidth onClick={() => navigate('/helpdesk/tickets')}>
              Отмена
            </Button>
          </ButtonGroup>
        </Box>
      </Paper>
    </PageLayout>
  );
};

export default TicketCreateForm;
