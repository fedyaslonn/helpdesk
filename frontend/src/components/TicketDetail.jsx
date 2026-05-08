import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { 
  getTicketDetails, 
  deleteTicket, 
  autoAssignTicket, 
  assignTicket, 
  unassignTicket, // 🔥 Импортировали новый метод
  closeTicket, 
  updateTicket,
  getEngineers,
  approveResolution
} from "../services/ticket-management-api";

import TicketResolution from "./TicketResolution";
import TicketSessions from "./TicketSessions";
import TicketComments from "./TicketComments";

import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  Stack,
  Alert
} from "@mui/material";

const getStatusChip = (status) => {
  const statusMap = {
    'OP': { label: 'Открыта', color: 'error' },
    'IP': { label: 'В работе', color: 'warning' },
    'WR': { label: 'Ожидание', color: 'info' },
    'RS': { label: 'Решена', color: 'success' },
    'CL': { label: 'Закрыта', color: 'default' }
  };
  const config = statusMap[status] || { label: status, color: 'default' };
  
  return (
    <Chip 
      label={config.label} 
      color={config.color} 
      sx={{ fontWeight: 'bold', borderRadius: 1.5 }} 
    />
  );
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [ticket, setTicket] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const ticketResp = await getTicketDetails(id);
      setTicket(ticketResp.data);
      
      if (currentUser?.role === 'admin' || currentUser?.role === 'engineer') {
        const engResp = await getEngineers();
        setEngineers(engResp.data.results || engResp.data);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404 || err.response?.status === 403) {
        alert("Заявка не найдена или у вас нет доступа");
        navigate('/helpdesk/tickets');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, currentUser]);

  const handleDelete = async () => {
    if (!window.confirm("Вы уверены, что хотите удалить заявку НАВСЕГДА?")) return;
    try {
      await deleteTicket(id);
      navigate('/helpdesk/tickets');
    } catch (err) {
      setActionError("Ошибка при удалении заявки");
    }
  };

  const handleAutoAssign = async () => {
    setActionError(null);
    try {
      await autoAssignTicket(id);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.error || "Не удалось автоматически назначить инженера");
    }
  };

  const handleManualAssign = async () => {
    setActionError(null);
    if (!selectedEngineer) {
      setActionError("Выберите инженера из списка");
      return;
    }
    try {
      await assignTicket(id, selectedEngineer);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.error || "Ошибка при назначении");
    }
  };

  // 🔥 Обработчик снятия инженера
  const handleUnassign = async () => {
    setActionError(null);
    if (!window.confirm("Снять текущего инженера с заявки? Заявка снова станет Открытой (OP).")) return;
    try {
      await unassignTicket(id);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.error || "Ошибка при снятии инженера");
    }
  };

  const handleStatusChange = async () => {
    setActionError(null);
    if (!selectedStatus) return;
    try {
      await updateTicket(id, { status: selectedStatus });
      loadData();
      setSelectedStatus("");
    } catch (err) {
      setActionError(err.response?.data?.non_field_errors?.[0] || "Недопустимый переход статуса");
    }
  };

  const handleClose = async () => {
    setActionError(null);
    if (!window.confirm("Заявка будет окончательно закрыта и перенесена в архив. Продолжить?")) return;
    try {
      await closeTicket(id);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.error || "Нельзя закрыть заявку в этом статусе");
    }
  };

  const handleApproveResolution = async () => {
    setActionError(null);
    try {
      await approveResolution(id);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.error || "Ошибка при подтверждении решения");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress color="primary" />
        <Typography mt={2} color="text.secondary">Загрузка данных...</Typography>
      </Box>
    );
  }
  
  if (!ticket) return null;

  // Логика прав доступа
  const isAdmin = currentUser?.role === 'admin';
  const isEngineer = currentUser?.role === 'engineer';
  const isAuthor = ticket.requestor?.id === currentUser?.id;
  const isAssignee = ticket.assignee?.id === currentUser?.id;

  const canDelete = isAdmin;
  const canAssign = isAdmin || isEngineer;
  const canChangeStatus = isAdmin || isAssignee;
  const canEditDesc = isAuthor;
  const canClose = (isAuthor || isAssignee || isAdmin) && ['RS', 'WR'].includes(ticket.status);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      
      {actionError && <Alert severity="error" sx={{ mb: 3 }}>{actionError}</Alert>}

      {/* ШАПКА ЗАЯВКИ */}
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 5, pb: 2, borderBottom: '1px solid #e2e8f0' }}>
        <Button 
          variant="outlined" 
          color="inherit" 
          size="small" 
          onClick={() => navigate('/helpdesk/tickets')}
          sx={{ position: 'absolute', left: 0 }}
        >
          Назад
        </Button>
        <Typography variant="h4" fontWeight="bold" color="#1e293b" sx={{ m: 0, textAlign: 'center' }}>
          Заявка {ticket.ticket_number}
        </Typography>
      </Box>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'flex-start',
        gap: 4 
      }}>
        
        {/* ЛЕВАЯ КОЛОНКА: ИНФО О ЗАЯВКЕ */}
        <Box sx={{ width: { xs: '100%', md: '65%' } }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: { xs: 3, md: 5 }, '&:last-child': { pb: { xs: 3, md: 5 } } }}>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="caption" color="text.secondary" fontSize="0.9rem">Автор обращения</Typography>
                  <Typography variant="body1" fontWeight="bold" fontSize="1.1rem">{ticket.requestor?.username || 'Неизвестно'}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 45%' }}>
                  <Typography variant="caption" color="text.secondary" fontSize="0.9rem">Назначенный инженер</Typography>
                  <Typography variant="body1" fontWeight="bold" fontSize="1.1rem">{ticket.assignee?.username || 'Не назначен'}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="caption" color="text.secondary" fontSize="0.9rem">Категория проблемы</Typography>
                  <Typography variant="body1" fontWeight="bold" fontSize="1.1rem">{ticket.organization?.name || ticket.category_name || 'Без категории'}</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 4 }} />

              <Typography variant="subtitle1" fontWeight="bold" mb={2} color="#334155" textTransform="uppercase">
                Описание проблемы
              </Typography>
              <Typography variant="body1" sx={{ 
                whiteSpace: 'pre-wrap', color: '#0f172a', lineHeight: 1.8, fontSize: '1.05rem',
                bgcolor: '#f8fafc', p: 3, borderRadius: 2, border: '1px solid #e2e8f0'
              }}>
                {ticket.description}
              </Typography>

              <Box sx={{ mt: 5, pt: 3, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                    Текущий статус:
                  </Typography>
                  {getStatusChip(ticket.status)}
                </Box>
                {canDelete && (
                  <Button variant="outlined" color="error" onClick={handleDelete}>
                    Удалить заявку
                  </Button>
                )}
              </Box>

            </CardContent>
          </Card>
        </Box>

        {/* ПРАВАЯ КОЛОНКА: ПАНЕЛЬ ДЕЙСТВИЙ */}
        <Box sx={{ width: { xs: '100%', md: '35%' }, position: 'sticky', top: 90 }}>
          <Stack spacing={3}>

            {/* Блок подтверждения решения (Появляется только у Автора/Админа в статусе WR) */}
            {ticket.status === 'WR' && (isAuthor || isAdmin) && (
              <Card elevation={0} sx={{ bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#166534" mb={1}>
                    Подтверждение решения
                  </Typography>
                  <Typography variant="body2" display="block" color="#14532d" mb={3}>
                    Служба поддержки предложила решение. Пожалуйста, подтвердите, если проблема успешно устранена.
                  </Typography>
                  <Button variant="contained" color="success" size="large" fullWidth onClick={handleApproveResolution}>
                    Подтвердить решение
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Блок действий автора */}
            {canEditDesc && (
              <Card elevation={0} sx={{ bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#334155" mb={2}>
                    Управление заявкой
                  </Typography>
                  <Button variant="outlined" fullWidth size="large" color="primary" onClick={() => navigate(`/helpdesk/tickets/${id}/update`)}>
                    Редактировать описание
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Блок назначения (Админ / Инженер) */}
            {canAssign && ticket.status !== 'CL' && (
              <Card elevation={0} sx={{ bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#334155" mb={3}>
                    Назначение инженера
                  </Typography>
                  
                  <Button variant="contained" color="primary" size="large" fullWidth sx={{ mb: 4 }} onClick={handleAutoAssign} disableElevation>
                    Авто-назначение
                  </Button>
                  
                  <Box display="flex" flexDirection="column">
                    <TextField
                      select
                      size="small"
                      label="Выбрать вручную"
                      value={selectedEngineer}
                      onChange={(e) => setSelectedEngineer(e.target.value)}
                      fullWidth
                      sx={{ bgcolor: 'white', mb: 2.5 }} 
                    >
                      <MenuItem value=""><em>Не выбран</em></MenuItem>
                      {engineers.map(eng => (
                        <MenuItem key={eng.id} value={eng.id}>{eng.username}</MenuItem>
                      ))}
                    </TextField>
                    <Button variant="outlined" color="primary" size="large" fullWidth onClick={handleManualAssign} disabled={!selectedEngineer}>
                      Назначить
                    </Button>

                    {/* 🔥 НОВАЯ КНОПКА СНЯТИЯ ИНЖЕНЕРА */}
                    {ticket.assignee && isAdmin && (
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="large" 
                        fullWidth 
                        onClick={handleUnassign} 
                        sx={{ mt: 2 }}
                      >
                        Снять инженера
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Блок статуса (Админ / Назначенный инженер) */}
            {canChangeStatus && ticket.status !== 'CL' && (
              <Card elevation={0} sx={{ bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#92400e" mb={3}>
                    Изменить статус
                  </Typography>
                  
                  <Box display="flex" flexDirection="column">
                    <TextField
                      select
                      size="small"
                      label="Новый статус"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      fullWidth
                      sx={{ bgcolor: 'white', mb: 2.5 }}
                    >
                      <MenuItem value="OP">Открыта (OP)</MenuItem>
                      <MenuItem value="IP">В работе (IP)</MenuItem>
                      <MenuItem value="WR">Ожидание (WR)</MenuItem>
                      {(isAuthor || isAdmin) && <MenuItem value="RS">Решена (RS)</MenuItem>}
                    </TextField>
                    <Button variant="contained" color="warning" size="large" fullWidth onClick={handleStatusChange} disabled={!selectedStatus} disableElevation>
                      Обновить статус
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Блок финального закрытия */}
            {canClose && (
              <Card elevation={0} sx={{ bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#991b1b" mb={1}>
                    Закрытие заявки
                  </Typography>
                  <Typography variant="body2" display="block" color="#7f1d1d" mb={3}>
                    Перевести заявку в финальный статус "Закрыта" (Архив).
                  </Typography>
                  <Button variant="contained" color="error" size="large" fullWidth onClick={handleClose} disableElevation>
                    Закрыть окончательно
                  </Button>
                </CardContent>
              </Card>
            )}

          </Stack>
        </Box>

      </Box>

      {/* ДОЧЕРНИЕ КОМПОНЕНТЫ */}
      <Box mt={5}>
        <TicketResolution ticketId={ticket.id} />
      </Box>
      <Box mt={4}>
        <TicketSessions ticketId={ticket.id} assigneeId={ticket.assignee?.id} />
      </Box>
      <Box mt={4}>
        <TicketComments ticketId={ticket.id} />
      </Box>

    </Container>
  );
};

export default TicketDetail;
