import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getEngineerProfiles, toggleEngineerDuty } from "../services/user-management-api";

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
  Alert
} from "@mui/material";

function EngineersList() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";
  const myUserId = authUser?.id;

  const [engineers, setEngineers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOnDuty, setFilterOnDuty] = useState("all");

  useEffect(() => {
    fetchEngineers();
  }, [filterOnDuty]);

  const fetchEngineers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterOnDuty !== "all") {
        params.is_on_duty = filterOnDuty;
      }
      const response = await getEngineerProfiles(params);
      setEngineers(response.data.results || response.data);
    } catch (err) {
      console.error("Ошибка загрузки инженеров:", err);
      setError("Не удалось загрузить список инженеров");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDuty = async (engineerId, userId) => {
    if (!isAdmin && userId !== myUserId) return;

    try {
      const response = await toggleEngineerDuty(engineerId);
      setEngineers(prev => prev.map(eng => 
        eng.id === engineerId ? { ...eng, is_on_duty: response.data.is_on_duty } : eng
      ));
    } catch (err) {
      alert("Не удалось изменить статус дежурства.");
    }
  };

  const handleFilterChange = (event, newValue) => {
    setFilterOnDuty(newValue);
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 8, mb: 8 }}>
      
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
        <Typography variant="h4" fontWeight="bold" color="#1e293b">
          Инженеры поддержки
        </Typography>
        <Chip 
          label={`Всего: ${engineers.length}`} 
          color="default" 
          variant="outlined" 
          sx={{ fontWeight: "bold" }}
        />
      </Box>

      {/* Фильтры */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs 
          value={filterOnDuty} 
          onChange={handleFilterChange} 
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="all" label="Все инженеры" sx={{ textTransform: "none", fontWeight: "medium", fontSize: "0.95rem" }} />
          <Tab value="true" label="На дежурстве" sx={{ textTransform: "none", fontWeight: "medium", fontSize: "0.95rem" }} />
          <Tab value="false" label="Отдыхают" sx={{ textTransform: "none", fontWeight: "medium", fontSize: "0.95rem" }} />
        </Tabs>
      </Box>

      {/* Контент */}
      {isLoading ? (
        <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
          <CircularProgress size={50} color="primary" />
          <Typography mt={2} color="text.secondary">Загрузка расписания...</Typography>
        </Box>
      ) : engineers.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: "center", bgcolor: "#f8fafc", borderRadius: 3, border: "1px dashed #cbd5e1" }}>
          <Typography variant="h6" color="#334155" gutterBottom>
            Список пуст
          </Typography>
          <Typography color="text.secondary">
            Инженеры с выбранным статусом не найдены.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Инженер</TableCell>
                <TableCell sx={{ fontWeight: "bold", color: "#475569", textAlign: "center" }}>Макс. заявок</TableCell>
                <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Статус дежурства</TableCell>
                <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>Последнее решение</TableCell>
                <TableCell sx={{ fontWeight: "bold", color: "#475569", textAlign: "right" }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {engineers.map((eng) => {
                const canToggle = isAdmin || eng.user_id === myUserId;

                return (
                  <TableRow key={eng.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    
                    {/* 1. Инженер */}
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ 
                          bgcolor: eng.is_on_duty ? "success.main" : "text.disabled", 
                          fontWeight: "bold" 
                        }}>
                          {eng.username ? eng.username.charAt(0).toUpperCase() : "И"}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" color="#0f172a">
                            {eng.full_name || eng.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {eng.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* 2. Нагрузка */}
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold" color="text.secondary">
                        {eng.max_concurrent_tickets} шт.
                      </Typography>
                    </TableCell>

                    {/* 3. Статус дежурства */}
                    <TableCell>
                      <Chip
                        label={eng.is_on_duty ? "На смене" : "Отдыхает"}
                        color={eng.is_on_duty ? "success" : "default"}
                        variant={eng.is_on_duty ? "filled" : "outlined"}
                        onClick={canToggle ? () => handleToggleDuty(eng.id, eng.user_id) : undefined}
                        sx={{ 
                          fontWeight: "bold", 
                          cursor: canToggle ? "pointer" : "default",
                          '&:hover': {
                            bgcolor: canToggle && eng.is_on_duty ? 'success.dark' : undefined
                          }
                        }}
                      />
                    </TableCell>

                    {/* 4. Дата последнего решения */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {eng.last_ticket_resolved_at 
                          ? new Date(eng.last_ticket_resolved_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) 
                          : "—"}
                      </Typography>
                    </TableCell>

                    {/* 5. Действия */}
                    <TableCell align="right">
                      <Button 
                        component={RouterLink} 
                        to={`/users/${eng.user_id}`} 
                        variant="outlined" 
                        size="small"
                        color="inherit"
                      >
                        Профиль
                      </Button>
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

export default EngineersList;
