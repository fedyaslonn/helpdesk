import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getCurrentUser, getUserById, updateUser } from "../services/user-management-api";

import { PageLayout } from './ui';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Grid
} from "@mui/material";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    email: "",
    username: "",
    full_name: "",
    contact_phone: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      setIsEditing(false);
      
      try {
        let response;
        if (id && id !== "me") {
           response = await getUserById(id);
        } else {
           response = await getCurrentUser();
        }
        
        const userData = response.data;
        setUser(userData);
        
        setEditForm({
          email: userData.email || "",
          username: userData.username || "",
          full_name: userData.full_name || "",
          contact_phone: userData.contact_phone || "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (err.response?.status === 404) {
           setError("Пользователь не найден.");
        } else if (err.response?.status === 403) {
           setError("У вас нет прав для просмотра этого профиля.");
        } else {
           setError("Не удалось загрузить профиль.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [id]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!user) return;

    try {
      const changes = {};
      if (editForm.email !== user.email) changes.email = editForm.email;
      if (editForm.username !== user.username) changes.username = editForm.username;
      if (editForm.full_name !== user.full_name) changes.full_name = editForm.full_name;
      if (editForm.contact_phone !== user.contact_phone) changes.contact_phone = editForm.contact_phone;

      if (Object.keys(changes).length === 0) {
        setSuccess("Нет изменений для сохранения");
        setIsEditing(false);
        setIsSubmitting(false);
        return;
      }

      const response = await updateUser(user.id, changes);

      setUser({ ...user, ...response.data });
      setSuccess("Профиль успешно обновлен.");
      setIsEditing(false);
    } catch (err) {
      console.error("Update failed:", err);
      const errors = err.response?.data;
      if (errors?.email) setError(errors.email[0]);
      else if (errors?.username) setError(errors.username[0]);
      else if (errors?.detail) setError(errors.detail);
      else setError("Ошибка обновления профиля");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: "Администратор",
      engineer: "Инженер поддержки",
      client: "Клиент",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "error";
      case "engineer": return "warning";
      case "client": return "primary";
      default: return "default";
    }
  };

  // Вспомогательный компонент для вывода строки с информацией
  const InfoItem = ({ label, value, children }) => (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {label}
      </Typography>
      {children ? children : (
        <Typography variant="body1" fontWeight="medium" color="#0f172a">
          {value || "—"}
        </Typography>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress size={40} color="primary" />
        <Typography mt={2} color="text.secondary">Загрузка профиля...</Typography>
      </Box>
    );
  }

  if (error && !user) {
    return (
      <PageLayout maxWidth="max-w-3xl">
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>Вернуться назад</Button>
      </PageLayout>
    );
  }

  if (!user) return null;

  const isMyProfile = !id || id === "me" || (authUser && String(authUser.id) === String(user.id));
  const canEdit = isMyProfile || authUser?.role === "admin";

  return (
    <PageLayout maxWidth="max-w-3xl">
      
      {/* Уведомления */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Card elevation={2} sx={{ borderRadius: 3, overflow: "visible" }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          
          {/* ШАПКА ПРОФИЛЯ */}
          <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} alignItems={{ xs: "center", sm: "flex-start" }} gap={3} mb={5}>
            <Avatar 
              sx={{ 
                width: 90, 
                height: 90, 
                bgcolor: "primary.main", 
                fontSize: "2.5rem", 
                fontWeight: "bold",
                boxShadow: 2
              }}
            >
              {user.username ? user.username.charAt(0).toUpperCase() : "U"}
            </Avatar>
            
            <Box textAlign={{ xs: "center", sm: "left" }} flexGrow={1}>
              <Typography variant="h4" fontWeight="bold" color="#1e293b" mb={1}>
                {user.full_name || user.username}
              </Typography>
              <Box display="flex" justifyContent={{ xs: "center", sm: "flex-start" }} gap={1.5} flexWrap="wrap">
                <Chip 
                  label={getRoleLabel(user.role)} 
                  color={getRoleColor(user.role)} 
                  size="small" 
                  sx={{ fontWeight: "bold", borderRadius: 1.5 }} 
                />
                {user.is_verified ? (
                  <Chip label="Верифицирован" color="success" variant="outlined" size="small" />
                ) : (
                  <Chip label="Ожидает проверки" color="default" variant="outlined" size="small" />
                )}
              </Box>
            </Box>

            {/* Кнопки действий в шапке */}
            {!isEditing && (
              <Stack direction={{ xs: "row", sm: "column" }} spacing={1} alignItems={{ xs: "center", sm: "flex-end" }}>
                {canEdit && (
                  <Button variant="outlined" size="small" onClick={() => setIsEditing(true)}>
                    Редактировать
                  </Button>
                )}
                {isMyProfile && (
                  <Button variant="text" color="error" size="small" onClick={logout}>
                    Выйти
                  </Button>
                )}
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* РЕЖИМ ПРОСМОТРА */}
          {!isEditing ? (
            <Stack spacing={4}>
              
              {/* Основная информация */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="bold" display="block" mb={2}>
                  Контактная информация
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoItem label="Логин" value={user.username} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoItem label="Email" value={user.email} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoItem label="ФИО" value={user.full_name} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoItem label="Телефон" value={user.contact_phone} />
                  </Grid>
                </Grid>
              </Box>

              {/* Системная информация */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="bold" display="block" mb={2}>
                  Системная информация
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoItem label="Дата регистрации" value={formatDate(user.date_joined)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoItem label="Последний вход" value={formatDate(user.last_login)} />
                  </Grid>
                </Grid>
              </Box>

              {/* Специфичная информация (Инженер) */}
              {user.role === "engineer" && user.engineer_profile && (
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold" display="block" mb={2}>
                    Профиль инженера и статистика
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoItem label="На дежурстве">
                        <Typography variant="body1" fontWeight="bold" color={user.engineer_profile.is_on_duty ? "success.main" : "text.secondary"}>
                          {user.engineer_profile.is_on_duty ? "Да" : "Нет"}
                        </Typography>
                      </InfoItem>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoItem label="Лимит заявок" value={String(user.engineer_profile.max_concurrent_tickets || 0)} />
                    </Grid>

                    {/* НОВЫЕ ПОЛЯ СО СТАТИСТИКОЙ */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoItem label="Решенных тикетов">
                        <Typography variant="body1" fontWeight="bold" color="primary.main">
                          {user.engineer_profile.resolved_tickets_count || 0}
                        </Typography>
                      </InfoItem>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoItem label="Просроченных тикетов (SLA)">
                        <Typography 
                          variant="body1" 
                          fontWeight="bold" 
                          color={(user.engineer_profile.breached_tickets_count || 0) > 0 ? "error.main" : "success.main"}
                        >
                          {user.engineer_profile.breached_tickets_count || 0}
                        </Typography>
                      </InfoItem>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <InfoItem label="Последнее решение" value={formatDate(user.engineer_profile.last_ticket_resolved_at)} />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Специфичная информация (Клиент) */}
              {user.role === "client" && user.client_profile && (
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold" display="block" mb={2}>
                    Профиль организации
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoItem label="Должность" value={user.client_profile.position} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoItem label="ID аккаунта" value={user.client_profile.account_id} />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Stack>

          ) : (

            /* РЕЖИМ РЕДАКТИРОВАНИЯ */
            <Box component="form" onSubmit={handleEditSubmit}>
              <Typography variant="h6" fontWeight="bold" color="#1e293b" mb={3}>
                Редактирование профиля
              </Typography>
              
              <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Логин"
                    name="username"
                    value={editForm.username}
                    onChange={handleEditChange}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="ФИО"
                    name="full_name"
                    value={editForm.full_name}
                    onChange={handleEditChange}
                    placeholder="Например: Иванов Иван Иванович"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="tel"
                    label="Телефон"
                    name="contact_phone"
                    value={editForm.contact_phone}
                    onChange={handleEditChange}
                    placeholder="+7 (999) 123-45-67"
                  />
                </Grid>
              </Grid>

              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button 
                  variant="outlined" 
                  color="inherit" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </Box>
            </Box>
          )}

        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default UserProfile;
