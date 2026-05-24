import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from '../services/ticket-management-api';
import { PageLayout, PageHeader, ButtonGroup, LoadingState, EmptyState } from './ui';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params = filter === 'unread' ? { is_read: false } : {};
      const response = await getNotifications(params);
      setNotifications(response.data.results || response.data);
    } catch (err) {
      console.error('Ошибка загрузки уведомлений', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      alert('Ошибка при обновлении');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    if (notification.ticket) {
      navigate(`/helpdesk/tickets/${notification.ticket}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <PageLayout maxWidth="max-w-3xl">
      <PageHeader
        title="Уведомления"
        subtitle={unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитаны'}
        actions={
          <ButtonGroup>
            <Select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="!min-w-[180px]"
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="unread">Только непрочитанные</MenuItem>
            </Select>
            {unreadCount > 0 && (
              <Button variant="outlined" onClick={handleMarkAllRead}>
                Прочитать все
              </Button>
            )}
          </ButtonGroup>
        }
      />

      {isLoading ? (
        <LoadingState message="Загрузка уведомлений…" />
      ) : notifications.length === 0 ? (
        <EmptyState title="Нет уведомлений" description="Здесь появятся обновления по вашим заявкам." />
      ) : (
        <Box className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <Paper
              key={notification.id}
              elevation={0}
              onClick={() => handleNotificationClick(notification)}
              className={`hd-card cursor-pointer !p-4 transition-colors hover:bg-slate-50 ${
                !notification.is_read ? '!border-l-4 !border-l-teal-500 bg-teal-50/50' : ''
              }`}
            >
              <Box className="flex items-start justify-between gap-3">
                <Box className="min-w-0 flex-1">
                  <Typography fontWeight={notification.is_read ? 400 : 700}>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" className="!mt-1 !block">
                    {new Date(notification.created_at).toLocaleString()}
                    {notification.ticket && ` • Заявка #${notification.ticket}`}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => handleDelete(notification.id, e)}
                  aria-label="удалить"
                >
                  ✕
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </PageLayout>
  );
};

export default NotificationsPage;
