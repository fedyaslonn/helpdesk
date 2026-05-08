import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { getTickets, getCategories, createTicket } from '../services/ticket-management-api';

import {
  Container,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Badge
} from '@mui/material';

// ==========================================
// КОМПОНЕНТ МОДАЛЬНОГО ОКНА ДЛЯ СОЗДАНИЯ ЗАЯВКИ
// ==========================================
const CreateTicketModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    description: '',
    category: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getCategories();
        const cats = response.data.results || response.data;
        setCategories(cats);

        if (cats.length > 0) {
          setFormData({ description: '', category: cats[0].id.toString() });
        }
      } catch (err) {
        setError('Не удалось загрузить категории');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [isOpen]);

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
      onSuccess(); 
      onClose();   
    } catch (err) {
      setError('Ошибка при создании заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold', color: '#1e293b' }}>
        Создать новую заявку
      </DialogTitle>
      
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                select
                label="Категория проблемы"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                fullWidth
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Описание проблемы"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Подробно опишите суть проблемы..."
                multiline
                rows={5}
                required
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isSubmitting}
            sx={{ boxShadow: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Создать заявку'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};


// ==========================================
// ОСНОВНАЯ СТРАНИЦА ЗАЯВОК
// ==========================================
const STATUSES = [
  { value: 'ALL', label: 'Все заявки', icon: '📋' },
  { value: 'OP', label: 'Открыты', icon: '🔴', color: 'error' },
  { value: 'IP', label: 'В работе', icon: '🟡', color: 'warning' },
  { value: 'WR', label: 'Ожидание', icon: '🔵', color: 'info' },
  { value: 'RS', label: 'Решены', icon: '🟢', color: 'success' },
  { value: 'CL', label: 'Закрыты', icon: '⚫', color: 'default' }
];

const getStatusConfig = (statusCode) => {
  return STATUSES.find(s => s.value === statusCode) || { label: statusCode, color: 'default' };
};

// 🔥 Стили для контейнера с горизонтальным скроллом
const horizontalScrollStyles = {
  display: 'flex',
  flexDirection: 'row',
  overflowX: 'auto',
  gap: 3, // Расстояние между карточками
  pb: 2, // Отступ снизу для скроллбара
  pt: 1, // Отступ сверху для тени
  px: 1, // Отступ по бокам, чтобы тень первой карточки не обрезалась
  '&::-webkit-scrollbar': {
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#cbd5e1',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#94a3b8',
    }
  }
};

const TicketsPage = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentTab = searchParams.get('status') || 'ALL';

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = currentTab !== 'ALL' ? { status: currentTab } : {};
      const response = await getTickets(params);
      setTickets(response.data.results || response.data);
    } catch (err) {
      setError('Не удалось загрузить заявки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated, currentTab]);

  const handleTabChange = (event, newValue) => {
    if (newValue === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ status: newValue });
    }
  };

  const myRequests = tickets.filter(ticket => ticket.user === currentUser?.id || ticket.user?.id === currentUser?.id);
  
  const assignedToMe = tickets.filter(ticket => 
    ticket.assigned_engineer && 
    (ticket.assigned_engineer === currentUser?.id || ticket.assigned_engineer?.user === currentUser?.id)
  );

  const renderTicketCard = (ticket) => {
    const statusConfig = getStatusConfig(ticket.status);
    
    return (
      <Card 
        key={ticket.id} 
        sx={{ 
          // 🔥 Фиксируем ширину карточки и запрещаем ей сжиматься
          minWidth: 320, 
          width: 320, 
          flexShrink: 0, 
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 1, 
          transition: '0.2s', 
          '&:hover': { boxShadow: 4 } 
        }}
      >
        <CardContent sx={{ pb: 1, flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Chip label={statusConfig.label} color={statusConfig.color} size="small" sx={{ fontWeight: 'bold' }} />
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              {ticket.ticket_number}
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 2, color: '#0f172a', lineHeight: 1.3 }}>
            {ticket.description.length > 70 ? `${ticket.description.substring(0, 70)}...` : ticket.description}
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Категория:</Typography>
              <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 140 }}>
                {ticket.category?.name || ticket.category || 'Без категории'}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary" display="block">Дедлайн:</Typography>
              <Typography variant="body2" fontWeight="medium" color={ticket.sla_deadline ? 'text.primary' : 'text.secondary'}>
                {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleDateString() : '—'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
        
        <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Button component={Link} to={`/helpdesk/tickets/${ticket.id}`} variant="outlined" size="small" color="primary" fullWidth>
            Подробнее
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (isLoading && tickets.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress size={50} color="primary" />
        <Typography mt={2} color="text.secondary">Загрузка заявок...</Typography>
      </Box>
    );
  }
  
  if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <CreateTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchTickets} />

      {/* Заголовок и кнопка создания */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#1e293b">
          Заявки
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)} sx={{ boxShadow: 2, px: 3 }}>
          + Новая заявка
        </Button>
      </Box>

      {/* Панель фильтров (Tabs) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {STATUSES.map(status => (
            <Tab 
              key={status.value} 
              value={status.value} 
              label={<Box display="flex" alignItems="center" gap={1}><span>{status.icon}</span> {status.label}</Box>} 
              sx={{ textTransform: 'none', fontWeight: 'medium', fontSize: '0.95rem' }}
            />
          ))}
        </Tabs>
      </Box>

      {/* СЕКЦИЯ 1: Мои обращения */}
      <Box mb={5}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="h5" fontWeight="bold" color="#334155">
            Мои обращения
          </Typography>
          <Badge badgeContent={myRequests.length} color="primary" sx={{ ml: 1 }} />
        </Box>
        
        {myRequests.length > 0 ? (
          <Box sx={horizontalScrollStyles}>
            {myRequests.map(renderTicketCard)}
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ bgcolor: '#f1f5f9', p: 3, borderRadius: 2, maxWidth: 400 }}>
            У вас пока нет созданных заявок.
          </Typography>
        )}
      </Box>

      {/* СЕКЦИЯ 2: В моей работе (Под первой секцией) */}
      {currentUser?.role !== 'client' && (
        <Box mb={5}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h5" fontWeight="bold" color="#334155">
              В моей работе
            </Typography>
            <Badge badgeContent={assignedToMe.length} color="secondary" sx={{ ml: 1 }} />
          </Box>
          
          {assignedToMe.length > 0 ? (
            <Box sx={horizontalScrollStyles}>
              {assignedToMe.map(renderTicketCard)}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ bgcolor: '#f1f5f9', p: 3, borderRadius: 2, maxWidth: 400 }}>
              У вас пока нет назначенных заявок.
            </Typography>
          )}
        </Box>
      )}

    </Container>
  );
};

export default TicketsPage;
