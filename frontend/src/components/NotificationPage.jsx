import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getNotifications, 
  markAllNotificationsRead, 
  markNotificationRead, 
  deleteNotification 
} from '../services/ticket-management-api';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' или 'unread'

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params = filter === 'unread' ? { is_read: false } : {};
      const response = await getNotifications(params);
      setNotifications(response.data.results || response.data);
    } catch (err) {
      console.error("Ошибка загрузки уведомлений", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  // --- ОБРАБОТЧИКИ ---

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      // Локально обновляем стейт, чтобы не делать лишний запрос
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      alert("Ошибка при обновлении");
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Чтобы при клике на удаление не сработал переход в заявку
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  const handleNotificationClick = (notification) => {
    // Отмечаем прочитанным при клике
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    // Если уведомление привязано к заявке — переходим в нее
    if (notification.ticket) {
      navigate(`/helpdesk/tickets/${notification.ticket}`);
    }
  };

  // --- РЕНДЕР ---
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Уведомления {unreadCount > 0 && <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '14px' }}>{unreadCount}</span>}</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="form-control" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Все</option>
            <option value="unread">Только непрочитанные</option>
          </select>

          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>
              ✓ Прочитать все
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="spinner"></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
              Нет новых уведомлений
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '15px 20px', 
                  background: notification.is_read ? '#fff' : '#f0fdfa', 
                  borderLeft: notification.is_read ? '4px solid transparent' : '4px solid #0d9488',
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#0f172a', fontWeight: notification.is_read ? 'normal' : 'bold' }}>
                    {notification.message}
                  </p>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(notification.created_at).toLocaleString()} 
                    {notification.ticket && ` • Заявка #${notification.ticket}`}
                  </span>
                </div>

                <button 
                  className="btn btn-sm btn-light" 
                  onClick={(e) => handleDelete(notification.id, e)}
                  style={{ color: '#ef4444', border: 'none', background: 'transparent', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
