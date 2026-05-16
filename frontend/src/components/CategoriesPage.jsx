import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/ticket-management-api';

import {
  Box, Typography, Button, Paper, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack
} from '@mui/material';

const CategoryNode = ({ category, allCategories, onEdit, onDelete, isAdmin, level = 0 }) => {
  const children = allCategories.filter(c => c.parent === category.id);
  const hasChildren = children.length > 0;

  return (
    <Box>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          py: 1.5, 
          px: 2, 
          ml: level * 4, 
          mb: 1,
          bgcolor: level === 0 ? '#f8fafc' : 'transparent',
          border: level === 0 ? '1px solid #e2e8f0' : 'none',
          borderLeft: level > 0 ? '2px solid #cbd5e1' : '1px solid #e2e8f0',
          borderRadius: level === 0 ? 2 : 0,
          '&:hover': { bgcolor: '#f1f5f9' }
        }}
      >
        <Box>
          <Typography variant="body1" fontWeight={level === 0 ? 'bold' : 'medium'} color="#0f172a">
            {category.name}
          </Typography>
          {category.description && (
            <Typography variant="caption" color="text.secondary" display="block">
              {category.description}
            </Typography>
          )}
        </Box>

        {isAdmin && (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="text" onClick={() => onEdit(category)}>Изменить</Button>
            <Button size="small" variant="text" color="error" onClick={() => onDelete(category.id)}>Удалить</Button>
          </Stack>
        )}
      </Box>

      {hasChildren && (
        <Box>
          {children.map(child => (
            <CategoryNode 
              key={child.id} 
              category={child} 
              allCategories={allCategories} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              isAdmin={isAdmin}
              level={level + 1}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const CategoriesPage = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', parent: '' });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await getCategories();
      setCategories(response.data.results || response.data);
    } catch (err) {
      setError('Не удалось загрузить категории');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить эту категорию? Убедитесь, что к ней не привязаны заявки.")) return;
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Ошибка при удалении категории.");
    }
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        parent: category.parent || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', parent: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      name: formData.name,
      description: formData.description,
      parent: formData.parent ? parseInt(formData.parent) : null
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }
      fetchCategories();
      closeModal();
    } catch (err) {
      alert('Ошибка при сохранении категории');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rootCategories = categories.filter(c => !c.parent);

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" sx={{ mt: 10, px: 2, py: 4 }}>
        <CircularProgress size={40} />
        <Typography mt={2} color="text.secondary">Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        boxSizing: 'border-box',
        px: { xs: '16px', sm: '24px', md: '32px' },
        py: { xs: 3, sm: 4, md: 5 },
        mb: { xs: 4, sm: 6 },
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={2}
        mb={{ xs: 3, sm: 4 }}
        textAlign={{ xs: 'center', sm: 'left' }}
      >
        <Typography variant="h4" fontWeight="bold" color="#1e293b" sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}>
          Справочник категорий
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => openModal()}
            sx={{ alignSelf: { xs: 'center', sm: 'auto' }, flexShrink: 0 }}
          >
            Добавить категорию
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 3.5 },
          border: '1px solid #e2e8f0',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        {rootCategories.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
            Категории не найдены
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {rootCategories.map((rootCat) => (
              <CategoryNode
                key={rootCat.id}
                category={rootCat}
                allCategories={categories}
                onEdit={openModal}
                onDelete={handleDelete}
                isAdmin={isAdmin}
              />
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={isModalOpen} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle fontWeight="bold" sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
            <Stack spacing={3}>
              <TextField
                label="Название"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                fullWidth
                required
              />
              <TextField
                select
                label="Родительская категория"
                name="parent"
                value={formData.parent}
                onChange={handleFormChange}
                fullWidth
              >
                <MenuItem value="">-- Корневая категория --</MenuItem>
                {categories
                  .filter(c => !editingCategory || c.id !== editingCategory.id)
                  .map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)
                }
              </TextField>
              <TextField
                label="Описание"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                multiline
                rows={3}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={closeModal} color="inherit" disabled={isSubmitting}>Отмена</Button>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default CategoriesPage;
