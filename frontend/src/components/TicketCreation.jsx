import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../auth/AuthContext";
import { getCategories, createTicket } from '../services/ticket-management-api';

import {
  Container, Box, Typography, TextField, Button, Paper, 
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
        setError('Необходимо выбрать категорию');
       return;
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
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress size={40} />
        <Typography mt={2} color="text.secondary">Подготовка формы...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="#1e293b" mb={3}>
          Новая заявка
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3} mb={4}>
            <TextField
              select
              label="Категория проблемы"
              name="category"
              value={formData.category}
              onChange={handleChange}
              fullWidth
              required
              sx={{ bgcolor: 'white' }}
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
              sx={{ bgcolor: 'white' }}
            />
          </Stack>

          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            size="large"
            fullWidth
            disabled={isSubmitting}
            sx={{ fontWeight: 'bold', py: 1.5 }}
          >
            {isSubmitting ? 'Создание...' : 'Создать заявку'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TicketCreateForm;
