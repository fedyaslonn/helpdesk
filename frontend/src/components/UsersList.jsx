import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getUsers, exportUsersExcel, exportUsersWord } from "../services/user-management-api";

import { PageLayout, PageHeader, ButtonGroup } from './ui';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Avatar, Chip, Button,
  CircularProgress, Alert, Stack
} from "@mui/material";

const UsersList = () => {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";

  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0, current_page: 1 });
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filterOptions = [
    { value: "all", label: "Все" },
    { value: "admin", label: "Администраторы" },
    { value: "engineer", label: "Инженеры" },
    { value: "client", label: "Клиенты" },
    { value: "verified", label: "Верифицированные" },
  ];

  const fetchUsers = async (url = null, pageNumber = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      let responseData;
      
      if (url) {
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        });
        responseData = await response.json();
      } else {
        const params = {};
        if (selectedFilter === "verified") params.is_verified = true;
        else if (selectedFilter !== "all") params.role = selectedFilter;

        const response = await getUsers(params);
        responseData = response.data;
      }

      if (responseData.results) {
        setUsers(responseData.results);
        setPagination({
          next: responseData.next,
          previous: responseData.previous,
          count: responseData.count,
          current_page: pageNumber
        });
      } else {
        setUsers(Array.isArray(responseData) ? responseData : []);
      }
    } catch (err) {
      console.error("Ошибка:", err);
      setError("Не удалось загрузить список пользователей");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(null, 1);
  }, [selectedFilter]);

  const handleExport = async (format) => {
    try {
      const params = {};
      if (selectedFilter === "verified") params.is_verified = true;
      else if (selectedFilter !== "all") params.role = selectedFilter;

      const exportFn = format === "excel" ? exportUsersExcel : exportUsersWord;
      const response = await exportFn(params);

      const extension = format === "excel" ? "xlsx" : "docx";
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `users_export.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Ошибка скачивания:", error);
      alert("Не удалось скачать файл");
    }
  };

  const getRoleLabel = (role) => ({ admin: "Администратор", engineer: "Инженер", client: "Клиент" }[role] || role);
  const getRoleColor = (role) => ({ admin: "error", engineer: "warning", client: "primary" }[role] || "default");

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, px: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>Обновить</Button>
      </Box>
    );
  }

  return (
    <PageLayout maxWidth="max-w-6xl">
      <PageHeader
        title="Список пользователей"
        subtitle={`Найдено: ${pagination.count || users.length}`}
        actions={
          isAdmin ? (
            <ButtonGroup>
              <Button variant="outlined" color="success" onClick={() => handleExport('excel')}>
                Скачать Excel
              </Button>
              <Button variant="outlined" color="info" onClick={() => handleExport('word')}>
                Скачать Word
              </Button>
            </ButtonGroup>
          ) : null
        }
      />

      {/* 3. БЛОК ВКЛАДОК (ФИЛЬТРЫ) */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 6 }}>
        <Tabs value={selectedFilter} onChange={(e, val) => setSelectedFilter(val)} variant="scrollable" scrollButtons="auto">
          {filterOptions.map((opt) => (
            <Tab key={opt.value} value={opt.value} label={opt.label} sx={{ textTransform: "none", fontWeight: "medium" }} />
          ))}
        </Tabs>
      </Box>

      {/* 3. КОНТЕНТНАЯ ЧАСТЬ (ЗАГРУЗКА, ПУСТО ИЛИ ТАБЛИЦА) */}
      {isLoading && users.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" py={10}>
          <CircularProgress size={50} color="primary" />
        </Box>
      ) : users.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: "center", bgcolor: "#f8fafc", borderRadius: 3, border: "1px dashed #cbd5e1" }}>
          <Typography variant="h6" color="#334155" gutterBottom>Пользователи не найдены</Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569", py: 2 }}>Пользователь</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569", py: 2 }}>Роль</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569", py: 2 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#475569", py: 2 }}>Дата регистрации</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: "bold", color: "#475569", textAlign: "right", py: 2 }}>Действия</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ py: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: "primary.light" }}>{user.username ? user.username.charAt(0).toUpperCase() : "?"}</Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" color="#0f172a">{user.username || "Без имени"}</Typography>
                          <Typography variant="body2" color="text.secondary">{user.email || "Нет email"}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={getRoleLabel(user.role)} color={getRoleColor(user.role)} size="small" /></TableCell>
                    <TableCell>{user.is_verified ? <Chip label="Верифицирован" color="success" variant="outlined" size="small" /> : <Chip label="Ожидает" color="default" variant="outlined" size="small" />}</TableCell>
                    <TableCell sx={{ color: "#475569" }}>{user.date_joined ? new Date(user.date_joined).toLocaleDateString("ru-RU") : "—"}</TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <Button component={RouterLink} to={`/users/${user.id}`} variant="outlined" size="small">
                          Профиль
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 🔥 4. ИДЕАЛЬНО ВЫРОВНЕННАЯ ПАГИНАЦИЯ */}
          {(pagination.next || pagination.previous) && (
            <Stack 
              direction="row" 
              justifyContent="center" 
              alignItems="center" 
              spacing={3} 
              sx={{ mt: 6 }} // 🔥 Большой отступ от таблицы
            >
              <Button 
                variant="outlined" 
                disabled={!pagination.previous || isLoading} 
                onClick={() => fetchUsers(pagination.previous, pagination.current_page - 1)}
                sx={{ minWidth: 120 }} // 🔥 Фиксированная ширина кнопки для идеальной симметрии
              >
                Назад
              </Button>
              
              <Typography variant="body1" color="text.secondary" fontWeight="bold" sx={{ minWidth: 100, textAlign: 'center' }}>
                Страница {pagination.current_page}
              </Typography>
              
              <Button 
                variant="outlined" 
                disabled={!pagination.next || isLoading} 
                onClick={() => fetchUsers(pagination.next, pagination.current_page + 1)}
                sx={{ minWidth: 120 }} // 🔥 Такая же фиксированная ширина
              >
                Вперёд
              </Button>
            </Stack>
          )}
        </>
      )}
    </PageLayout>
  );
};

export default UsersList;
