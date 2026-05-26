import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createKBArticle, getCategories } from '../services/ticket-management-api';
import { PageLayout, PageHeader, ButtonGroup } from './ui';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Stack,
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
    is_published: true,
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
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        ...formData,
        category: formData.category ? parseInt(formData.category) : null,
      };
      const response = await createKBArticle(payload);
      navigate(`/helpdesk/kb-articles/${response.data.id}`);
    } catch (err) {
      setError('Ошибка при сохранении статьи. Проверьте правильность заполнения полей.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout maxWidth="max-w-3xl">
      <Button variant="outlined" color="inherit" size="small" onClick={() => navigate('/helpdesk/kb-articles')} className="!mb-4">
        ← Назад к списку
      </Button>

      <Paper elevation={0} className="hd-card !p-6 md:!p-8">
        <PageHeader title="Новая статья базы знаний" subtitle="Заполните поля и сохраните статью" />

        {error && <Alert severity="error" className="!mb-4">{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField label="Заголовок статьи" name="title" value={formData.title} onChange={handleChange} fullWidth required />
            <TextField select label="Категория" name="category" value={formData.category} onChange={handleChange} fullWidth>
              <MenuItem value=""><em>Без категории</em></MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Содержание" name="content" value={formData.content} onChange={handleChange} multiline rows={10} fullWidth required />
            <TextField label="Теги" name="tags" value={formData.tags} onChange={handleChange} fullWidth helperText="Через запятую: vpn, сеть, доступ" />
            <FormControlLabel
              control={<Switch name="is_published" checked={formData.is_published} onChange={handleChange} color="success" />}
              label={formData.is_published ? 'Опубликовано' : 'Черновик'}
            />
            <ButtonGroup>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение…' : 'Сохранить статью'}
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => navigate('/helpdesk/kb-articles')}>
                Отмена
              </Button>
            </ButtonGroup>
          </Stack>
        </Box>
      </Paper>
    </PageLayout>
  );
};

export default KBArticleCreate;
