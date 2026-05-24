import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  getShifts, createShift, updateShift, deleteShift, getTodayShifts, getEngineers 
} from '../services/ticket-management-api';

import { PageLayout, PageHeader, LoadingState } from './ui';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, TextField, Checkbox,
  FormControlLabel, MenuItem, CircularProgress, Alert, Chip, Grid, Stack
} from '@mui/material';

const ShiftManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [shifts, setShifts] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_shifts');

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = { 
    engineer: '', 
    shift_date: new Date().toISOString().split('T')[0], 
    shift_start: '09:00', 
    shift_end: '18:00', 
    is_active: true 
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shiftsRes, todayRes] = await Promise.all([getShifts(), getTodayShifts()]);
      setShifts(shiftsRes.data.results || shiftsRes.data);
      setTodayShifts(todayRes.data.results || todayRes.data);

      if (isAdmin) {
        const engRes = await getEngineers();
        setEngineers(engRes.data.results || engRes.data);
      }
    } catch (err) {
      console.error("Ошибка загрузки данных", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleTabChange = (e, newValue) => setActiveTab(newValue);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (isEditing) {
        await updateShift(editingId, data);
      } else {
        await createShift(data);
      }
      resetForm();
      loadData();
    } catch (err) {
      alert(err.response?.data?.non_field_errors?.[0] || "Ошибка: на эту дату смена уже существует.");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Загрузка расписания…" />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="max-w-5xl">
      <PageHeader title="Расписание смен" subtitle="График дежурств инженеров" />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab value="my_shifts" label={isAdmin ? 'Все смены' : 'Мой график'} />
          <Tab value="today" label={`Сегодня на смене (${todayShifts.length})`} />
        </Tabs>
      </Box>

      {activeTab === 'today' ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          {todayShifts.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>Сегодня нет инженеров на смене.</Alert>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: '#f0fdf4' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Инженер</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Время работы</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayShifts.map(s => (
                  <TableRow key={s.id}>
                    <TableCell><Typography fontWeight="medium">{s.engineer_name}</Typography></TableCell>
                    <TableCell>{s.shift_start.slice(0, 5)} — {s.shift_end.slice(0, 5)}</TableCell>
                    <TableCell><Chip label="Активен" color="success" size="small" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              {isEditing ? 'Редактировать смену' : 'Добавить новую смену'}
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2} alignItems="center" mb={2}>
                {isAdmin && (
                  <Grid item xs={12} sm={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Инженер"
                      value={formData.engineer}
                      onChange={e => setFormData({...formData, engineer: e.target.value})}
                      required
                      sx={{ bgcolor: 'white' }}
                    >
                      {engineers.map(e => <MenuItem key={e.id} value={e.id}>{e.username}</MenuItem>)}
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12} sm={3}>
                  <TextField type="date" fullWidth size="small" label="Дата" value={formData.shift_date} onChange={e => setFormData({...formData, shift_date: e.target.value})} required InputLabelProps={{ shrink: true }} sx={{ bgcolor: 'white' }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField type="time" fullWidth size="small" label="Начало" value={formData.shift_start} onChange={e => setFormData({...formData, shift_start: e.target.value})} required InputLabelProps={{ shrink: true }} sx={{ bgcolor: 'white' }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField type="time" fullWidth size="small" label="Конец" value={formData.shift_end} onChange={e => setFormData({...formData, shift_end: e.target.value})} required InputLabelProps={{ shrink: true }} sx={{ bgcolor: 'white' }} />
                </Grid>
              </Grid>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={<Checkbox checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} color="success" />}
                  label="Смена активна"
                />
                <Stack direction="row" spacing={2}>
                  {isEditing && <Button onClick={resetForm} color="inherit">Отмена</Button>}
                  <Button type="submit" variant="contained" color="primary">
                    {isEditing ? 'Обновить' : 'Сохранить'}
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Paper>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  {isAdmin && <TableCell sx={{ fontWeight: 'bold' }}>Инженер</TableCell>}
                  <TableCell sx={{ fontWeight: 'bold' }}>Дата</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Время</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shifts.map(s => (
                  <TableRow key={s.id} hover>
                    {isAdmin && <TableCell>{s.engineer_name}</TableCell>}
                    <TableCell>{new Date(s.shift_date).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell>{s.shift_start.slice(0,5)} - {s.shift_end.slice(0,5)}</TableCell>
                    <TableCell>
                      {s.is_active ? <Chip label="Активна" color="success" variant="outlined" size="small" /> : <Chip label="Отключена" color="default" size="small" />}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button variant="text" size="small" onClick={() => { setIsEditing(true); setEditingId(s.id); setFormData(s); }}>
                          Изменить
                        </Button>
                        <Button variant="text" color="error" size="small" onClick={() => deleteShift(s.id).then(loadData)}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </PageLayout>
  );
};

export default ShiftManagement;
