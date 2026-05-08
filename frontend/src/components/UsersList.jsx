import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getUsers } from "../services/user-management-api";

// Импортируем компоненты MUI
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack
} from "@mui/material";

const UsersList = () => {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";

  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const [selectedFilter, setSelectedFilter] = useState("all");

  const filterOptions = [
    { value: "all", label: "Все пользователи" },
    { value: "admin", label: "Администраторы" },
    { value: "engineer", label: "Инженеры" },
    { value: "client", label: "Клиенты" },
    { value: "verified", label: "Верифицированные" },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {};
        if (selectedFilter === "verified") {
          params.is_verified = true;
        } else if (selectedFilter !== "all") {
          params.role = selectedFilter;
        }

        const response = await getUsers(params);
        const data = response.data;

        if (data.results) {
          setUsers(data.results);
          setPagination({
            next: data.next,
            previous: data.previous,
            count: data.count,
          });
        } else {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Не удалось загрузить список пользователей");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [selectedFilter]);

  const handleFilterChange = (event, newValue) => {
    setSelectedFilter(newValue);
  };

  const loadPage = async (url) => {
    if (!url) return;
    setIsLoading(true);
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setUsers(data.results);
      setPagination({
        next: data.next,
        previous: data.previous,
        count: data.count,
      });
    } catch {
      setError("Ошибка загрузки страницы");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: "Администратор",
      engineer: "Инженер",
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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Попробовать снова
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      
      {/* Заголовок страницы */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#1e293b">
          Список пользователей
        </Typography>
        <Chip 
          label={`Найдено: ${pagination.count || users.length}`} 
          color="default" 
          variant="outlined" 
          sx={{ fontWeight: "bold" }}
        />
      </Box>

      {/* Панель фильтров */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs 
          value={selectedFilter} 
          onChange={handleFilterChange} 
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {filterOptions.map((option) => (
            <Tab 
              key={option.value} 
              value={option.value} 
              label={option.label} 
              sx={{ textTransform: "none", fontWeight: "medium", fontSize: "0.95rem" }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Состояние загрузки, пустого списка или таблица */}
      {isLoading && users.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
          <CircularProgress size={50} color="primary" />
          <Typography mt={2} color="text.secondary">Загрузка пользователей...</Typography>
        </Box>
      ) : users.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: "center", bgcolor: "#f8fafc", borderRadius: 3, border: "1px dashed #cbd5e1" }}>
          <Typography variant="h6" color="#334155" gutterBottom>
            Пользователи не найдены
          </Typography>
          <Typography color="text.secondary" mb={3}>
            Попробуйте изменить параметры фильтрации
          </Typography>
          {selectedFilter !== "all" && (
            <Button variant="outlined" onClick={() => setSelectedFilter("all")}>
              Показать всех
            </Button>
          )}
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Пользователь</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Роль</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Дата регистрации</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: "bold", color: "#475569", textAlign: "right" }}>Действия</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    
                    {/* Колонка: Пользователь */}
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: "primary.light", fontWeight: "bold", width: 40, height: 40 }}>
                          {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" color="#0f172a">
                            {user.username || "Без имени"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email || "Нет email"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Колонка: Роль */}
                    <TableCell>
                      <Chip 
                        label={getRoleLabel(user.role)} 
                        color={getRoleColor(user.role)} 
                        size="small" 
                        sx={{ fontWeight: "medium", borderRadius: 1.5 }} 
                      />
                    </TableCell>

                    {/* Колонка: Статус */}
                    <TableCell>
                      {user.is_verified ? (
                        <Chip label="Верифицирован" color="success" variant="outlined" size="small" />
                      ) : (
                        <Chip label="Ожидает" color="default" variant="outlined" size="small" />
                      )}
                    </TableCell>

                    {/* Колонка: Дата регистрации */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString("ru-RU") : "—"}
                      </Typography>
                    </TableCell>

                    {/* Колонка: Действия (Админ) */}
                    {isAdmin && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button 
                            component={RouterLink} 
                            to={`/users/${user.id}`} 
                            variant="outlined" 
                            size="small"
                            color="inherit"
                          >
                            Профиль
                          </Button>
                          <Button 
                            component={RouterLink} 
                            to={`/users/update/${user.id}`} 
                            variant="contained" 
                            size="small"
                            color="primary"
                            disableElevation
                          >
                            Управление
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Пагинация */}
          {(pagination.next || pagination.previous) && (
            <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={4}>
              <Button
                variant="outlined"
                disabled={!pagination.previous || isLoading}
                onClick={() => loadPage(pagination.previous)}
              >
                Назад
              </Button>
              <Typography variant="body2" color="text.secondary">
                Страница {pagination.previous ? 2 : 1}
              </Typography>
              <Button
                variant="outlined"
                disabled={!pagination.next || isLoading}
                onClick={() => loadPage(pagination.next)}
              >
                Вперёд
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default UsersList;
