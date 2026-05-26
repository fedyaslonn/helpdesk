import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  getPriorities,
} from '../services/ticket-management-api';
import { PageLayout, PageHeader } from './ui';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  MenuItem,
} from '@mui/material';

const emptyForm = {
  phrase: '',
  priority_name: '',
  resolution_minutes: '60',
  enabled: true,
  weight: '0',
};

function formatResolution(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '—';
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h} ч ${rest} мин` : `${h} ч`;
}

const ClassificationRulesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rules, setRules] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, prioRes] = await Promise.all([
        getClassificationRules(),
        getPriorities(),
      ]);
      const list = rulesRes.data;
      setRules(Array.isArray(list) ? list : list?.results || []);
      const pr = prioRes.data?.results || prioRes.data || [];
      setPriorityOptions(pr);
    } catch (e) {
      console.error(e);
      showMessage(
        e.response?.data?.detail || 'Не удалось загрузить правила классификации',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      phrase: row.phrase ?? '',
      priority_name: row.priority_name ?? '',
      resolution_minutes: String(row.resolution_minutes ?? 60),
      enabled: Boolean(row.enabled),
      weight: String(row.weight ?? 0),
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        phrase: form.phrase.trim(),
        priority_name: form.priority_name.trim(),
        resolution_minutes: parseInt(form.resolution_minutes, 10),
        enabled: form.enabled,
        weight: parseInt(form.weight, 10) || 0,
      };
      if (editingId) {
        await updateClassificationRule(editingId, payload);
        showMessage('Правило обновлено');
      } else {
        await createClassificationRule(payload);
        showMessage('Правило создано');
      }
      resetForm();
      await load();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (typeof data === 'object' && data && Object.values(data).flat().join(' ')) ||
        err.message ||
        'Ошибка сохранения';
      showMessage(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClassificationRule(deleteTarget.id);
      showMessage('Правило удалено');
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) resetForm();
      await load();
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Не удалось удалить правило', 'error');
      setDeleteTarget(null);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/helpdesk/tickets" replace />;
  }

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10} gap={2}>
        <CircularProgress size={44} />
        <Typography color="text.secondary">Загрузка правил…</Typography>
      </Box>
    );
  }

  return (
    <PageLayout maxWidth="max-w-5xl">
      <PageHeader
        title="Правила авто-классификации"
        subtitle="Ключевые фразы и SLA для Ollama: при создании заявки модель сопоставляет текст с правилами и выставляет приоритет."
      />

      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 3,
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.background.paper} 45%)`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          {editingId ? 'Редактировать правило' : 'Новое правило'}
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              required
              fullWidth
              name="phrase"
              label="Ключевая фраза"
              placeholder='Например: "упал сервер"'
              value={form.phrase}
              onChange={handleChange}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
            {priorityOptions.length > 0 ? (
              <TextField
                required
                select
                fullWidth
                name="priority_name"
                label="Приоритет (как в справочнике)"
                value={form.priority_name}
                onChange={handleChange}
                size="small"
                sx={{ minWidth: 220, bgcolor: 'background.paper' }}
                helperText="Должен совпадать с названием из «Приоритеты»"
              >
                <MenuItem value="">
                  <em>Выберите…</em>
                </MenuItem>
                {priorityOptions.map((p) => (
                  <MenuItem key={p.id} value={p.name}>
                    {`${p.name} (ур. ${p.level})`}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                required
                fullWidth
                name="priority_name"
                label="Название приоритета"
                placeholder="Как в справочнике приоритетов"
                value={form.priority_name}
                onChange={handleChange}
                size="small"
                sx={{ minWidth: 220, bgcolor: 'background.paper' }}
                helperText="Справочник приоритетов не загрузился — введите имя вручную"
              />
            )}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              required
              name="resolution_minutes"
              label="Время решения (SLA)"
              type="number"
              inputProps={{ min: 1 }}
              value={form.resolution_minutes}
              onChange={handleChange}
              size="small"
              sx={{ width: { xs: '100%', md: 200 }, bgcolor: 'background.paper' }}
              InputProps={{
                endAdornment: <InputAdornment position="end">мин</InputAdornment>,
              }}
            />
            <TextField
              name="weight"
              label="Вес (приоритет правила)"
              type="number"
              value={form.weight}
              onChange={handleChange}
              size="small"
              sx={{ width: { xs: '100%', md: 160 }, bgcolor: 'background.paper' }}
              helperText="Выше — важнее при конфликте"
            />
            <FormControlLabel
              control={
                <Switch name="enabled" checked={form.enabled} onChange={handleChange} color="primary" />
              }
              label="Активно"
            />
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {editingId && (
              <Button variant="outlined" color="inherit" onClick={resetForm} disabled={submitting}>
                Отмена
              </Button>
            )}
            <Button type="submit" variant="contained" disableElevation disabled={submitting}>
              {submitting ? 'Сохранение…' : editingId ? 'Сохранить изменения' : 'Добавить правило'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="h6" fontWeight={700} sx={{ mt: 4, mb: 2 }}>
        Все правила ({rules.length})
      </Typography>

      {rules.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Правил пока нет — добавьте первую фразу, чтобы включить контекст для LLM.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
        >
          <Table size="medium">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Фраза</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Приоритет</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SLA</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Вес
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Статус
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right" width={200}>
                  Действия
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Tooltip title={row.phrase}>
                      <Typography fontWeight={600} noWrap sx={{ maxWidth: 320 }}>
                        {row.phrase}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.priority_name} color="primary" variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {formatResolution(row.resolution_minutes)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.resolution_minutes} мин
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={row.weight ?? 0} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.enabled ? 'Вкл' : 'Выкл'}
                      color={row.enabled ? 'success' : 'default'}
                      size="small"
                      variant={row.enabled ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="text" onClick={() => startEdit(row)}>
                        Изменить
                      </Button>
                      <Button size="small" variant="text" color="error" onClick={() => setDeleteTarget(row)}>
                        Удалить
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Удалить правило?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget ? (
              <>
                Фраза: <strong>{deleteTarget.phrase}</strong>
              </>
            ) : null}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Отмена</Button>
          <Button color="error" variant="contained" disableElevation onClick={confirmDelete}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default ClassificationRulesPage;
