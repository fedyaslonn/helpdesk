import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { getTickets, getCategories, createTicket } from '../services/ticket-management-api';

import { PageLayout, PageHeader, LoadingState } from './ui';
import {
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

const horizontalScrollStyles = {
  display: 'flex',
  flexDirection: 'row',
  overflowX: 'auto',
  gap: 4, 
  pb: 3, 
  pt: 2, 
  px: 1, 
  '&::-webkit-scrollbar': {
    height: '10px', 
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#f1f5f9',
    borderRadius: '5px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#cbd5e1',
    borderRadius: '5px',
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

const myRequests = tickets.filter(
    ticket => ticket.user === currentUser?.id || ticket.user?.id === currentUser?.id || ticket.requestor?.id === currentUser?.id
  );

  // 🔥 Исправленная фильтрация для "В моей работе" (как инженера)
  const assignedToMe = tickets.filter(
    ticket => ticket.assignee && ticket.assignee.id === currentUser?.id
  );

  const renderTicketCard = (ticket) => {
    const statusConfig = getStatusConfig(ticket.status);
    
    return (
      <Card 
        key={ticket.id} 
        sx={{ 
          minWidth: 320, 
          width: 320, 
          flexShrink: 0, 
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 2, 
          borderRadius: 3, 
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s', 
          '&:hover': { 
            boxShadow: 6,
            transform: 'translateY(-4px)' 
          } 
        }}
      >
        <CardContent sx={{ pb: 2, pt: 3, px: 3, flexGrow: 1 }}> 
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}> 
            <Chip label={statusConfig.label} color={statusConfig.color} size="small" sx={{ fontWeight: 'bold' }} />
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              {ticket.ticket_number}
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 3, color: '#0f172a', lineHeight: 1.4 }}> 
            {ticket.description.length > 70 ? `${ticket.description.substring(0, 70)}...` : ticket.description}
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Категория:</Typography> 
              <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 140 }}>
                {ticket.category?.name || ticket.category || 'Без категории'}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Дедлайн:</Typography> 
              <Typography variant="body2" fontWeight="medium" color={ticket.sla_deadline ? 'text.primary' : 'text.secondary'}>
                {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleDateString() : '—'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
        
        <CardActions sx={{ px: 3, pb: 3, pt: 0 }}> 
          <Button component={Link} to={`/helpdesk/tickets/${ticket.id}`} variant="outlined" size="small" color="primary" fullWidth sx={{ py: 1 }}> 
            Подробнее
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (isLoading && tickets.length === 0) {
    return (
      <PageLayout maxWidth="max-w-[1400px]">
        <LoadingState message="Загрузка заявок…" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout maxWidth="max-w-[1400px]">
        <Alert severity="error">{error}</Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="max-w-[1400px]" className="!pb-16">
      <CreateTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchTickets} />

      <PageHeader
        title="Заявки"
        subtitle="Управление обращениями и отслеживание статусов"
        actions={
          <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
            + Новая заявка
          </Button>
        }
      />

      {/* Панель фильтров (Tabs) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 6 }}> 
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ '& .MuiTab-root': { py: 2 } }} 
        >
          {STATUSES.map(status => (
            <Tab 
              key={status.value} 
              value={status.value} 
              label={<Box display="flex" alignItems="center" gap={1.5}><span>{status.icon}</span> {status.label}</Box>} 
              sx={{ textTransform: 'none', fontWeight: 'medium', fontSize: '1rem' }}
            />
          ))}
        </Tabs>
      </Box>

      {/* СЕКЦИЯ 1: Мои обращения */}
      <Box mb={8}> 
        <Box display="flex" alignItems="center" gap={2} mb={3}> 
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
          <Typography color="text.secondary" sx={{ bgcolor: '#f1f5f9', p: 4, borderRadius: 2, maxWidth: 500, textAlign: 'center' }}> 
            У вас пока нет созданных заявок.
          </Typography>
        )}
      </Box>

      {/* СЕКЦИЯ 2: В моей работе */}
      {currentUser?.role !== 'client' && (
        <Box mb={8}>
          <Box display="flex" alignItems="center" gap={2} mb={3}> 
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
            <Typography color="text.secondary" sx={{ bgcolor: '#f1f5f9', p: 4, borderRadius: 2, maxWidth: 500, textAlign: 'center' }}> 
              У вас пока нет назначенных заявок.
            </Typography>
          )}
        </Box>
      )}

      {/* 🔥 СЕКЦИЯ 3: Все заявки платформы (ТОЛЬКО ДЛЯ АДМИНА) 🔥 */}
      {currentUser?.role === 'admin' && (
        <Box mb={8}>
          <Box display="flex" alignItems="center" gap={2} mb={3}> 
            <Typography variant="h5" fontWeight="bold" color="#7c3aed"> {/* Фиолетовый акцент для админки */}
              Все заявки системы 
            </Typography>
            <Badge badgeContent={tickets.length} color="error" sx={{ ml: 1 }} />
          </Box>
          
          {tickets.length > 0 ? (
            <Box sx={horizontalScrollStyles}>
              {tickets.map(renderTicketCard)}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ bgcolor: '#f1f5f9', p: 4, borderRadius: 2, maxWidth: 500, textAlign: 'center' }}> 
              В системе пока нет заявок.
            </Typography>
          )}
        </Box>
      )}

    </PageLayout>
  );
};

export default TicketsPage;
