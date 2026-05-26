import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  AlertTitle
} from '@mui/material';

// Вспомогательный компонент для стилизованной обертки iframe
const GrafanaPanel = ({ title, src, height = "350px" }) => {
  return (
    <Card
      sx={{
        boxShadow: 2,
        borderRadius: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ p: 0, flexGrow: 1, '&:last-child': { pb: 0 } }}>
        {/* Параметр theme=light форсирует светлую тему графика под дизайн твоего приложения */}
        <iframe
          src={`${src}&theme=light`}
          width="100%"
          height={height}
          frameBorder="0"
          title={title}
          style={{
            display: 'block',
            border: 'none',
            borderRadius: 'inherit'
          }}
        />
      </CardContent>
    </Card>
  );
};

const GrafanaMetrics = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: '0 auto', pb: 10 }}>
      {/* Заголовок страницы */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#1e293b" gutterBottom>
          Системные метрики
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Мониторинг состояния инфраструктуры и ключевых показателей службы поддержки в реальном времени
        </Typography>
      </Box>

      {/* Информационная плашка */}
      <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 'bold' }}>Интеграция с Grafana активна</AlertTitle>
        Данные графиков транслируются напрямую с сервера аналитики. Для создания новых дашбордов или настройки правил эскалации (Alerts) перейдите в основную панель администратора Grafana.
      </Alert>

      {/* Сетка с графиками */}
      <Grid container spacing={4}>

        {/* --- БИЗНЕС-МЕТРИКИ (Крупные графики) --- */}
        <Grid item xs={12} md={6}>
          <GrafanaPanel
            title="Динамика поступающих заявок"
            // ВСТАВЬ СЮДА СВОЙ URL:
            src="http://localhost:3000/d-solo/adtb264/helpdesk-and-ai-dashboard?orgId=1&panelId=1"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <GrafanaPanel
            title="Соблюдение SLA (Решено вовремя / Просрочено)"
            // ВСТАВЬ СЮДА СВОЙ URL:
            src="http://localhost:3000/d-solo/adtb264/helpdesk-and-ai-dashboard?orgId=1&panelId=2"
          />
        </Grid>

        {/* --- СИСТЕМНЫЕ МЕТРИКИ (Три в ряд на больших экранах) --- */}
        <Grid item xs={12} lg={4}>
          <GrafanaPanel
            title="Загрузка процессора (CPU)"
            // ВСТАВЬ СЮДА СВОЙ URL:
            src="http://localhost:3000/d-solo/adtb264/helpdesk-and-ai-dashboard?orgId=1&panelId=3"
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <GrafanaPanel
            title="Использование оперативной памяти (RAM)"
            // ВСТАВЬ СЮДА СВОЙ URL:
            src="http://localhost:3000/d-solo/adtb264/helpdesk-and-ai-dashboard?orgId=1&panelId=4"
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <GrafanaPanel
            title="Нагрузка на базу данных PostgreSQL"
            // ВСТАВЬ СЮДА СВОЙ URL:
            src="http://localhost:3000/d-solo/adtb264/helpdesk-and-ai-dashboard?orgId=1&panelId=5"
          />
        </Grid>



      </Grid>
    </Box>
  );
};

export default GrafanaMetrics;