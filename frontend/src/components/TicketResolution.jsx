import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getResolutions, createResolution, updateResolution, deleteResolution } from '../services/ticket-management-api';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Stack,
  Paper
} from '@mui/material';

const TicketResolution = ({ ticketId, externalSolutionDraft, onConsumeDraft }) => {
  const { user: currentUser } = useAuth();
  
  const isWorker = currentUser?.role === 'admin' || currentUser?.role === 'engineer';
  const isAdmin = currentUser?.role === 'admin';

  const [resolution, setResolution] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Стейт формы (SLA убрали из UI, но если бэкенд требует это поле, 
  // его можно оставить тут скрытым со значением по умолчанию)
  const [formData, setFormData] = useState({
    resolution_type: 'fixed',
    root_cause: '',
    solution_description: '',
    prevention_notes: '',
  });

  const fetchResolution = async () => {
    setIsLoading(true);
    try {
      const response = await getResolutions({ ticket: ticketId });
      const results = response.data.results || response.data;
      
      if (results.length > 0) {
        setResolution(results[0]);
        setFormData({
          resolution_type: results[0].resolution_type,
          root_cause: results[0].root_cause || '',
          solution_description: results[0].solution_description || '',
          prevention_notes: results[0].prevention_notes || '',
        });
      } else {
        setResolution(null);
      }
    } catch (err) {
      console.error("Ошибка загрузки результатов", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) fetchResolution();
  }, [ticketId]);

  useEffect(() => {
    if (!externalSolutionDraft) return;
    // Превращаем в "черновик" резолюции: открываем форму и заполняем описание решения
    setIsEditing(true);
    setFormData((prev) => ({
      ...prev,
      solution_description: externalSolutionDraft,
    }));
    if (onConsumeDraft) onConsumeDraft();
  }, [externalSolutionDraft, onConsumeDraft]);

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (resolution) {
        await updateResolution(resolution.id, formData);
      } else {
        await createResolution({ ...formData, ticket: ticketId });
      }
      setIsEditing(false);
      fetchResolution();
    } catch (err) {
      if (err.response?.data?.ticket) {
        alert("Результат для этой заявки уже существует!");
        fetchResolution(); 
      } else {
        alert("Ошибка при сохранении результата.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить этот результат обработки?")) return;
    try {
      await deleteResolution(resolution.id);
      setResolution(null);
      setFormData({
        resolution_type: 'fixed', root_cause: '', solution_description: '', prevention_notes: ''
      });
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={2} mt={3}>
        <CircularProgress size={24} color="primary" />
        <Typography color="text.secondary">Загрузка результатов...</Typography>
      </Box>
    );
  }

  if (!resolution && !isWorker) return null;

  const resolutionTypeDisplay = {
    fixed: 'Исправлено',
    workaround: 'Временное решение',
    not_reproduced: 'Не воспроизведено',
    wont_fix: 'Не будет исправлено'
  };

  return (
    <Card 
      elevation={0} 
      sx={{ 
        bgcolor: '#f0fdfa', 
        border: '1px solid #ccfbf1', 
        borderRadius: 3 
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        
        {/* ШАПКА БЛОКА */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="bold" color="#0f766e">
            Результат обработки заявки
          </Typography>
          
          {isWorker && resolution && !isEditing && (
            <Box display="flex" gap={1}>
              <Button variant="outlined" size="small" onClick={() => setIsEditing(true)}>
                ✏️ Редактировать
              </Button>
              {isAdmin && (
                <Button variant="outlined" color="error" size="small" onClick={handleDelete} title="Удалить резолюцию">
                  🗑️
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* РЕЖИМ РЕДАКТИРОВАНИЯ / СОЗДАНИЯ */}
        {(!resolution && isWorker) || isEditing ? (
          <Box component="form" onSubmit={handleSubmit}>
            {!resolution && (
              <Typography variant="body2" color="#0f766e" fontStyle="italic" mb={3}>
                Заявка обрабатывается. Зафиксируйте решение здесь.
              </Typography>
            )}
            
            <Stack spacing={3}>
              {/* 🔥 Grid убран, теперь поле растянуто на всю ширину */}
              <TextField
                select
                label="Тип решения *"
                name="resolution_type"
                value={formData.resolution_type}
                onChange={handleFormChange}
                fullWidth
                required
                sx={{ bgcolor: 'white' }}
              >
                <MenuItem value="fixed">Исправлено</MenuItem>
                <MenuItem value="workaround">Временное решение</MenuItem>
                <MenuItem value="not_reproduced">Не воспроизведено</MenuItem>
                <MenuItem value="wont_fix">Не будет исправлено</MenuItem>
              </TextField>

              <TextField
                label="Корневая причина"
                name="root_cause"
                placeholder="Например: Сбой драйвера принтера"
                value={formData.root_cause}
                onChange={handleFormChange}
                fullWidth
                sx={{ bgcolor: 'white' }}
              />

              <TextField
                label="Описание решения *"
                name="solution_description"
                placeholder="Что конкретно было сделано?"
                value={formData.solution_description}
                onChange={handleFormChange}
                multiline
                rows={3}
                required
                fullWidth
                sx={{ bgcolor: 'white' }}
              />

              <TextField
                label="Рекомендации по предотвращению"
                name="prevention_notes"
                placeholder="Как избежать этого в будущем?"
                value={formData.prevention_notes}
                onChange={handleFormChange}
                multiline
                rows={2}
                fullWidth
                sx={{ bgcolor: 'white' }}
              />

              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                {resolution && (
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    onClick={() => { setIsEditing(false); fetchResolution(); }}
                  >
                    Отмена
                  </Button>
                )}
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить результат'}
                </Button>
              </Box>
            </Stack>
          </Box>

        ) : (

          /* РЕЖИМ ПРОСМОТРА */
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #ccfbf1', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Тип решения</Typography>
                <Typography variant="body1" fontWeight="bold" color="#0f172a">
                  {resolutionTypeDisplay[resolution.resolution_type]}
                </Typography>
              </Box>

              {resolution.root_cause && (
                <Box sx={{ flexBasis: '100%' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Корневая причина</Typography>
                  <Typography variant="body1" fontWeight="bold" color="#0f172a">
                    {resolution.root_cause}
                  </Typography>
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #ccfbf1' }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Описание решения
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>
                {resolution.solution_description}
              </Typography>
            </Paper>

            {resolution.prevention_notes && (
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #ccfbf1' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Рекомендации по предотвращению
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>
                  {resolution.prevention_notes}
                </Typography>
              </Paper>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketResolution;
