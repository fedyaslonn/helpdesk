import React, { useState, useEffect } from 'react';
import { getSystemMetrics } from '../services/ticket-management-api';
import { Container, Typography, Paper, Box, CircularProgress } from '@mui/material';

const SystemMetrics = () => {
  const [metrics, setMetrics] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Функция для очистки и форматирования метрик
  const cleanAndFormatMetrics = (rawData) => {
    return rawData
      .split('\n')
      .filter(line => line.trim() !== '') // Убираем пустые строки
      .filter(line => !line.startsWith('#')) // Убираем комментарии HELP и TYPE
      .filter(line => 
        // Оставляем только наши важные префиксы
        line.startsWith('helpdesk_') || 
        line.startsWith('celery_') || 
        line.startsWith('ai_')
      )
      .filter(line => 
        // Скрываем "шум" от гистограмм (бакеты) и время их создания
        !line.includes('_bucket') && 
        !line.includes('_created')
      )
      .join('\n');
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getSystemMetrics();
        // Пропускаем сырые данные через наш фильтр перед сохранением
        const cleanedData = cleanAndFormatMetrics(response.data);
        setMetrics(cleanedData);
      } catch (err) {
        setError('Ошибка доступа или загрузки метрик');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        📊 Системные метрики
      </Typography>
      
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: '#1e1e1e', // Темный фон
            color: '#00ff00',   // Зеленый хакерский текст
            borderRadius: 2,
            overflowX: 'auto',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' // Добавим легкую внутреннюю тень для эффекта экрана
          }}
        >
          <pre style={{ 
            margin: 0, 
            fontFamily: '"Fira Code", "Courier New", monospace', // Более красивый моноширинный шрифт
            fontSize: '15px',
            lineHeight: '1.6' 
          }}>
            {metrics || "Нет данных по метрикам..."}
          </pre>
        </Paper>
      )}
    </Container>
  );
};

export default SystemMetrics;
