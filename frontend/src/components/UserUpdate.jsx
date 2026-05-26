import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { 
  getUserById, 
  updateUser, 
  deleteUser, 
  changeUserRole, 
  verifyUser 
} from "../services/user-management-api";
import { PageLayout, PageHeader, ButtonGroup } from './ui';

import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  MenuItem,
  Stack
} from "@mui/material";

function UserUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";

  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    contact_phone: "",
    date_birth: "",
  });

  useEffect(() => {
    getUserById(id)
      .then((response) => {
        setUser(response.data);
        setFormData({
          email: response.data.email || "",
          username: response.data.username || "",
          full_name: response.data.full_name || "",
          contact_phone: response.data.contact_phone || "",
          date_birth: response.data.date_birth || "",
        });
      })
      .catch(() => setError("Пользователь не найден или нет прав доступа."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const changes = {};
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== (user[key] || "")) {
        if (key === "date_birth" && formData[key] === "") {
          changes[key] = null;
        } else {
          changes[key] = formData[key];
        }
      }
    });

    if (Object.keys(changes).length === 0) {
      setSuccess("Вы ничего не изменили.");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUser(id, changes);
      setUser((prev) => ({ ...prev, ...changes }));
      setSuccess("Данные пользователя успешно обновлены.");
    } catch (err) {
      console.error("Validation error payload:", err.response?.data);
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        const errorMessages = Object.entries(errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join(" | ");
        setError(`Ошибка: ${errorMessages}`);
      } else {
        setError("Произошла ошибка при обновлении.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    if (!window.confirm(`Вы уверены, что хотите изменить роль на ${newRole}?`)) return;
    try {
      await changeUserRole(id, newRole);
      setUser((prev) => ({ ...prev, role: newRole }));
      setSuccess(`Роль успешно изменена на: ${newRole}`);
    } catch (err) {
      setError("Ошибка смены роли.");
    }
  };

  const handleVerify = async () => {
    try {
      await verifyUser(id);
      setUser((prev) => ({ ...prev, is_verified: true }));
      setSuccess("Пользователь успешно верифицирован.");
    } catch (err) {
      setError("Ошибка верификации.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("ВНИМАНИЕ! Вы уверены, что хотите удалить этого пользователя навсегда?")) return;
    try {
      await deleteUser(id);
      navigate("/users");
    } catch (err) {
      setError("Ошибка удаления пользователя.");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress size={40} color="primary" />
        <Typography mt={2} color="text.secondary">Загрузка данных...</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <PageLayout maxWidth="max-w-3xl">
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate(-1)}>Вернуться назад</Button>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="max-w-3xl">
      
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/users")}>
          Назад
        </Button>
        <Typography variant="h4" fontWeight="bold" color="#1e293b">
          Управление: {user.username}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Paper elevation={0} sx={{ p: 4, mb: 4, border: "1px solid #e2e8f0", borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="#334155" mb={3}>
          Основные данные
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Логин"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="ФИО"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="tel"
                label="Телефон"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
              />
            </Grid>
            
            {/* 🔥 Обновленное поле "Дата рождения" */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Дата рождения"
                name="date_birth"
                value={formData.date_birth}
                onChange={handleChange}
                type={formData.date_birth ? "date" : "text"}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!formData.date_birth) {
                    e.target.type = "text";
                  }
                }}
              />
            </Grid>

          </Grid>

          <Box display="flex" justifyContent="flex-end">
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={isSubmitting}
              sx={{ px: 4, py: 1.5, fontWeight: "bold" }}
            >
              {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ПАНЕЛЬ АДМИНИСТРАТОРА */}
      {isAdmin && (
        <Paper elevation={0} sx={{ p: 4, border: "1px solid #fca5a5", borderRadius: 3, bgcolor: "#fef2f2" }}>
          <Typography variant="h6" fontWeight="bold" color="#b91c1c" mb={3}>
            Панель Администратора
          </Typography>
          
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
            
            <Box display="flex" alignItems="center" gap={2}>
              {!user.is_verified ? (
                <Button variant="contained" color="success" onClick={handleVerify} disableElevation>
                  Верифицировать пользователя
                </Button>
              ) : (
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  Пользователь верифицирован
                </Typography>
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={2} flexGrow={1} justifyContent={{ sm: "flex-end" }}>
              <TextField
                select
                size="small"
                label="Роль в системе"
                value={user.role}
                onChange={handleRoleChange}
                sx={{ minWidth: 150, bgcolor: "white" }}
              >
                <MenuItem value="client">Клиент</MenuItem>
                <MenuItem value="engineer">Инженер</MenuItem>
                <MenuItem value="admin">Администратор</MenuItem>
              </TextField>

              <Button variant="contained" color="error" onClick={handleDelete} disableElevation>
                Удалить
              </Button>
            </Box>

          </Stack>
        </Paper>
      )}
    </PageLayout>
  );
}

export default UserUpdate;
