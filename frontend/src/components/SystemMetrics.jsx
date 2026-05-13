import React, { useState, useEffect } from 'react';
import { getSystemMetrics } from '../services/ticket-management-api';
import { Container, Typography, Paper, Box, CircularProgress } from '@mui/material';

const SystemMetrics = () => {
  const [metrics, setMetrics] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getSystemMetrics();
        setMetrics(response.data);
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
        📊 Системные метрики (Prometheus)
      </Typography>
      
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: '#1e1e1e', // Темный фон, как в терминале
            color: '#00ff00',   // Зеленый хакерский текст
            borderRadius: 2,
            overflowX: 'auto'
          }}
        >
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '14px' }}>
            {metrics}
          </pre>
        </Paper>
      )}
    </Container>
  );
};

export default SystemMetrics;
