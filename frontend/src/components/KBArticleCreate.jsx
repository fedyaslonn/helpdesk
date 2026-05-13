import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createKBArticle, getCategories } from '../services/ticket-management-api';

import {
  Container, Box, Typography, TextField, Button, Paper, 
  MenuItem, FormControlLabel, Switch, Alert, Stack
} from '@mui/material';

const KBArticleCreate = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    is_published: true
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        setCategories(response.data.results || response.data);
      } catch (err) {
        console.error('Ошибка загрузки категорий', err);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Преобразуем category в число, если оно выбрано
      const payload = {
        ...formData,
        category: formData.category ? parseInt(formData.category) : null
      };
      
      const response = await createKBArticle(payload);
      // После успешного создания перекидываем на страницу самой статьи
      navigate(`/helpdesk/kb-articles/${response.data.id}`);
    } catch (err) {
      setError('Ошибка при сохранении статьи. Проверьте правильность заполнения полей.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
      <Button 
        variant="outlined" 
        color="inherit" 
        size="small" 
        onClick={() => navigate('/helpdesk/kb-articles')}
        sx={{ mb: 4 }}
      >
        ← Назад к списку
      </Button>

      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="#0f172a" mb={4}>
          Новая статья базы знаний
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Заголовок статьи"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Например: Как настроить VPN подключение"
            />

            <TextField
              select
              label="Категория"
              name="category"
              value={formData.category}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value=""><em>Без категории</em></MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Содержание статьи"
              name="content"
              value={formData.content}
              onChange={handleChange}
              multiline
              rows={10}
              fullWidth
              required
              placeholder="Подробно опишите решение проблемы..."
            />

            <TextField
              label="Теги (ключевые слова)"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              fullWidth
              placeholder="vpn, сеть, доступ (через запятую)"
              helperText="Теги помогут инженерам быстрее находить эту статью"
            />

            <FormControlLabel
              control={
                <Switch 
                  name="is_published" 
                  checked={formData.is_published} 
                  onChange={handleChange} 
                  color="success" 
                />
              }
              label={formData.is_published ? "Опубликовано (доступно всем)" : "Черновик (скрыто)"}
            />

            <Box display="flex" gap={2} mt={2}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                size="large" 
                disabled={isSubmitting}
                disableElevation
              >
                {isSubmitting ? 'Сохранение...' : 'Сохранить статью'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default KBArticleCreate;
