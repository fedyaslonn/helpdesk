import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
  Divider,
  Chip
} from '@mui/material';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Состояния для управления открытием выпадающих меню
  const [anchorElTickets, setAnchorElTickets] = useState(null);
  const [anchorElKB, setAnchorElKB] = useState(null);           
  const [anchorElShifts, setAnchorElShifts] = useState(null);   
  const [anchorElUsers, setAnchorElUsers] = useState(null);
  const [anchorElDicts, setAnchorElDicts] = useState(null);
  const [anchorElProfile, setAnchorElProfile] = useState(null);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isEngineer = user.role === 'engineer';
  const isClient = user.role === 'client';

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'engineer': return 'Инженер';
      default: return 'Клиент';
    }
  };

  const handleLogout = () => {
    setAnchorElProfile(null);
    logout();
    navigate('/login');
  };

  // Единая функция закрытия всех меню
  const closeAllMenus = () => {
    setAnchorElTickets(null);
    setAnchorElKB(null);
    setAnchorElShifts(null);
    setAnchorElUsers(null);
    setAnchorElDicts(null);
    setAnchorElProfile(null);
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: 'primary.dark', boxShadow: 3 }}>
      <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
        
        {/* ЛОГОТИП */}
        <Typography 
          variant="h6" 
          component={RouterLink} 
          to="/" 
          sx={{ 
            textDecoration: 'none', 
            color: 'inherit', 
            fontWeight: 'bold',
            mr: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <span>🛠️</span> HelpDesk
        </Typography>

        {/* ОСНОВНАЯ НАВИГАЦИЯ */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          
          {/* 1. ТИКЕТЫ */}
          <Button 
            color="inherit" 
            onClick={(e) => setAnchorElTickets(e.currentTarget)}
            sx={{ textTransform: 'none', fontSize: '15px' }}
          >
            Заявки ▾
          </Button>
          <Menu anchorEl={anchorElTickets} open={Boolean(anchorElTickets)} onClose={closeAllMenus} disableScrollLock>
            {isClient && [
              <MenuItem key="my" component={RouterLink} to="/helpdesk/tickets" onClick={closeAllMenus}>Мои заявки</MenuItem>,
              <MenuItem key="create" component={RouterLink} to="/helpdesk/tickets/create" onClick={closeAllMenus}>Создать заявку</MenuItem>
            ]}
            {isEngineer && [
              <MenuItem key="avail" component={RouterLink} to="/helpdesk/tickets" onClick={closeAllMenus}>Доступные заявки</MenuItem>,
              <MenuItem key="create" component={RouterLink} to="/helpdesk/tickets/create" onClick={closeAllMenus}>Создать заявку</MenuItem>
            ]}
            {isAdmin && [
              <MenuItem key="all" component={RouterLink} to="/helpdesk/tickets" onClick={closeAllMenus}>Все заявки</MenuItem>,
              <MenuItem key="create" component={RouterLink} to="/helpdesk/tickets/create" onClick={closeAllMenus}>Создать заявку</MenuItem>
            ]}
          </Menu>

          {/* 2. БАЗА ЗНАНИЙ */}
          <Button 
            color="inherit" 
            onClick={(e) => setAnchorElKB(e.currentTarget)}
            sx={{ textTransform: 'none', fontSize: '15px' }}
          >
            База знаний ▾
          </Button>
          <Menu anchorEl={anchorElKB} open={Boolean(anchorElKB)} onClose={closeAllMenus} disableScrollLock>
            <MenuItem component={RouterLink} to="/helpdesk/kb-articles" onClick={closeAllMenus}>
              Все статьи
            </MenuItem>
            {(isAdmin || isEngineer) && (
              <MenuItem component={RouterLink} to="/helpdesk/kb-articles/create" onClick={closeAllMenus}>
                Добавить статью
              </MenuItem>
            )}
          </Menu>

          {/* 3. РАСПИСАНИЕ СМЕН */}
          {(isAdmin || isEngineer) && (
            <>
              <Button 
                color="inherit" 
                onClick={(e) => setAnchorElShifts(e.currentTarget)}
                sx={{ textTransform: 'none', fontSize: '15px' }}
              >
                Расписание смен ▾
              </Button>
              <Menu anchorEl={anchorElShifts} open={Boolean(anchorElShifts)} onClose={closeAllMenus} disableScrollLock>
                {isAdmin ? (
                  <MenuItem component={RouterLink} to="/helpdesk/shift-management" onClick={closeAllMenus}>
                    Управление сменами
                  </MenuItem>
                ) : (
                  <MenuItem component={RouterLink} to="/helpdesk/shift-management" onClick={closeAllMenus}>
                    Мой график
                  </MenuItem>
                )}
                <MenuItem component={RouterLink} to="/helpdesk/shift-management" onClick={closeAllMenus}>
                  Кто сегодня дежурит?
                </MenuItem>
              </Menu>
            </>
          )}

          {/* 4. ПОЛЬЗОВАТЕЛИ */}
          {isAdmin && (
            <>
              <Button color="inherit" onClick={(e) => setAnchorElUsers(e.currentTarget)} sx={{ textTransform: 'none', fontSize: '15px' }}>
                Пользователи ▾
              </Button>
              <Menu anchorEl={anchorElUsers} open={Boolean(anchorElUsers)} onClose={closeAllMenus} disableScrollLock>
                <MenuItem component={RouterLink} to="/users" onClick={closeAllMenus}>Все пользователи</MenuItem>
                <MenuItem component={RouterLink} to="/engineers" onClick={closeAllMenus}>Инженеры</MenuItem>
              </Menu>
            </>
          )}

          {/* 5. СПРАВОЧНИКИ И МЕТРИКИ */}
          {isAdmin && (
            <>
              <Button color="inherit" onClick={(e) => setAnchorElDicts(e.currentTarget)} sx={{ textTransform: 'none', fontSize: '15px' }}>
                Справочники ▾
              </Button>
              <Menu anchorEl={anchorElDicts} open={Boolean(anchorElDicts)} onClose={closeAllMenus} disableScrollLock>
                <MenuItem component={RouterLink} to="/helpdesk/categories" onClick={closeAllMenus}>Категории</MenuItem>
                <MenuItem component={RouterLink} to="/helpdesk/priorities" onClick={closeAllMenus}>Приоритеты</MenuItem>
                <MenuItem component={RouterLink} to="/helpdesk/classification-rules" onClick={closeAllMenus}>
                  Правила авто-классификации
                </MenuItem>
                
                {/* 🔥 ДОБАВЛЕННЫЙ БЛОК ДЛЯ МЕТРИК */}
                <Divider sx={{ my: 1 }} />
                <MenuItem 
  component={RouterLink} 
  to="/helpdesk/api/metrics" 
  onClick={closeAllMenus}
  sx={{ color: 'primary.main', fontWeight: 'bold' }}
>
  📊 Системные метрики
</MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* ПРАВАЯ ПАНЕЛЬ */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton component={RouterLink} to="/helpdesk/notifications" color="inherit" title="Уведомления">
            🔔
          </IconButton>

          <Button color="inherit" onClick={(e) => setAnchorElProfile(e.currentTarget)} sx={{ textTransform: 'none', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '14px', fontWeight: 'bold' }}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.username || user?.email || 'Профиль'} ▾
            </Typography>
          </Button>

          <Menu
            anchorEl={anchorElProfile}
            open={Boolean(anchorElProfile)}
            onClose={closeAllMenus}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            disableScrollLock
          >
            <Box sx={{ px: 2, py: 1, outline: 'none' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {user?.full_name || user?.username || 'Пользователь'}
              </Typography>
              <Chip label={getRoleLabel(user.role)} size="small" color="primary" variant="outlined" sx={{ mt: 1, fontSize: '11px', height: '20px' }} />
            </Box>
            <Divider sx={{ my: 1 }} />
            <MenuItem component={RouterLink} to={`/users/${user.id}/profile`} onClick={closeAllMenus}>
              Мой профиль
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 'bold' }}>
              Выйти
            </MenuItem>
          </Menu>
        </Box>

      </Toolbar>
    </AppBar>
  );
};

export default Header;
