import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSessions, createSession, endSession, deleteSession } from '../services/ticket-management-api';

import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';

const TicketSessions = ({ ticketId, assigneeId }) => { 
  const { user: currentUser } = useAuth();
  
  const isAssignedEngineer = currentUser?.id === assigneeId;
  const isAdmin = currentUser?.role === 'admin';

  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionsText, setActionsText] = useState('');

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await getSessions({ ticket: ticketId });
      setSessions(response.data.results || response.data);
    } catch (err) {
      console.error("Ошибка загрузки сессий", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) fetchSessions();
  }, [ticketId]);

  const handleStartSession = async () => {
    if (!actionsText.trim()) return alert("Пожалуйста, опишите запланированные действия");
    
    try {
      await createSession({
        ticket: ticketId,
        session_start: new Date().toISOString(),
        actions_performed: actionsText
      });
      setActionsText('');
      fetchSessions();
    } catch (err) {
      alert(err.response?.data?.detail || "Ошибка при создании сессии.");
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      await endSession(sessionId);
      fetchSessions();
    } catch (err) {
      alert("Ошибка при завершении сессии");
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm("Удалить запись о работе?")) return;
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  const getEngineerName = (session) => {
    const name = session.engineer_name || 
                 session.engineer?.user?.username || 
                 session.engineer?.username;
    return typeof name === 'string' ? name : 'Инженер';
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={2} mt={4}>
        <CircularProgress size={24} color="primary" />
        <Typography color="text.secondary">Загрузка журнала работ...</Typography>
      </Box>
    );
  }

  const hasActiveSession = sessions.some(s => s.session_end === null);

  return (
    <Box mt={10}> {/* 🔥 Увеличен отступ перед блоком журнала */}
      
      <Box display="flex" alignItems="center" gap={1.5} mb={5}> {/* 🔥 Увеличен отступ после заголовка */}
        <Typography variant="h5" fontWeight="bold" color="#1e293b">
          Журнал работ
        </Typography>
        <Chip 
          label={sessions.length} 
          size="small" 
          color="primary" 
          sx={{ fontWeight: 'bold', borderRadius: 1.5 }} 
        />
      </Box>

      {isAssignedEngineer && !hasActiveSession && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            mb: 4, 
            bgcolor: '#f8fafc', 
            border: '1px solid #e2e8f0',
            borderRadius: 3
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" mb={2} fontWeight="bold">
            ЗАПЛАНИРОВАТЬ РАБОТУ
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Опишите, какие действия вы собираетесь выполнить..."
              value={actionsText}
              onChange={(e) => setActionsText(e.target.value)}
              sx={{ bgcolor: 'white' }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleStartSession}
              sx={{ minWidth: '180px', height: '56px', fontWeight: 'bold' }}
            >
              ▶ Начать сессию
            </Button>
          </Stack>
        </Paper>
      )}

      <Stack spacing={2.5}>
        {sessions.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#f1f5f9', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
            <Typography color="text.secondary">
              Работы по заявке еще не проводились.
            </Typography>
          </Paper>
        ) : (
          sessions.map(session => {
            const engineerName = getEngineerName(session);
            
            return (
              <Card 
                key={session.id} 
                elevation={0} 
                sx={{ 
                  border: '1px solid #e2e8f0', 
                  borderLeft: '4px solid',
                  borderLeftColor: session.session_end ? '#10b981' : '#f59e0b', 
                  borderRadius: 2,
                  overflow: 'visible'
                }}
              >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light', fontSize: '1rem', fontWeight: 'bold' }}>
                        {typeof engineerName === 'string' && engineerName.length > 0 ? engineerName.charAt(0).toUpperCase() : 'И'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold" color="#0f172a">
                          {engineerName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(session.session_start).toLocaleString('ru-RU', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' 
                          })}
                        </Typography>
                      </Box>
                    </Box>

                    {isAdmin && (
                      <Button variant="text" color="error" size="small" onClick={() => handleDelete(session.id)}>
                        Удалить
                      </Button>
                    )}
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box mb={3}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      Выполненные действия:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>
                      {session.actions_performed}
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    
                    {session.session_end ? (
                      <Box display="flex" gap={1.5} flexWrap="wrap">
                        <Chip 
                          label={`✓ Завершено (${session.time_spent_min} мин.)`} 
                          color="success" 
                          variant="outlined" 
                          size="small" 
                          sx={{ fontWeight: 'bold', borderWidth: 2 }} 
                        />
                        {session.user_satisfaction && (
                          <Chip 
                            label={`★ Оценка: ${session.user_satisfaction}/5`} 
                            size="small" 
                            sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 'bold' }} 
                          />
                        )}
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ 
                            width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b',
                            animation: 'pulse 1.5s infinite',
                            '@keyframes pulse': {
                              '0%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)' },
                              '70%': { boxShadow: '0 0 0 6px rgba(245, 158, 11, 0)' },
                              '100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' }
                            }
                          }} />
                          <Typography variant="body2" fontWeight="bold" color="#b45309">
                            Работа идет...
                          </Typography>
                        </Box>
                        
                        {isAssignedEngineer && (
                          <Button 
                            variant="contained" 
                            color="warning" 
                            size="small" 
                            onClick={() => handleEndSession(session.id)}
                            sx={{ boxShadow: 0 }}
                          >
                            ⏹ Завершить
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>

                </CardContent>
              </Card>
            );
          })
        )}
      </Stack>
    </Box>
  );
};

export default TicketSessions;
