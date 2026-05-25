import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorElProfile, setAnchorElProfile] = useState(null);

  if (!user) return null;

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'engineer':
        return 'Инженер';
      default:
        return 'Клиент';
    }
  };

  const handleLogout = () => {
    setAnchorElProfile(null);
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      className="!border-b !border-slate-200 !bg-hd-surface !text-hd-text"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar className="!min-h-14 !gap-4 !px-4">
        <IconButton
          edge="start"
          color="inherit"
          aria-label="меню"
          onClick={onMenuClick}
          className="!text-slate-700 md:!hidden"
        >
          ☰
        </IconButton>

        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          className="!flex !items-center !gap-2 !font-bold !text-hd-primary !no-underline"
        >
          <span aria-hidden>🛠️</span>
          Служба технической поддержки
        </Typography>

        <Box className="flex-1" />

        <Box className="flex items-center gap-3">
          <IconButton
            component={RouterLink}
            to="/helpdesk/notifications"
            color="inherit"
            title="Уведомления"
            className="!text-slate-600"
          >
            🔔
          </IconButton>

          <Chip
            label={getRoleLabel(user.role)}
            size="small"
            color="primary"
            variant="outlined"
            className="!hidden sm:!inline-flex"
          />

          <IconButton
            onClick={(e) => setAnchorElProfile(e.currentTarget)}
            className="!p-0.5"
            aria-label="профиль"
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorElProfile}
          open={Boolean(anchorElProfile)}
          onClose={() => setAnchorElProfile(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          disableScrollLock
        >
          <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {user?.full_name || user?.username || 'Пользователь'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            component={RouterLink}
            to={`/users/${user.id}/`}
            onClick={() => setAnchorElProfile(null)}
          >
            Мой профиль
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 600 }}>
            Выйти
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
