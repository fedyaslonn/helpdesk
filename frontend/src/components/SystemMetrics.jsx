import React, { useState, useEffect } from 'react';
import { getSystemMetrics } from '../services/ticket-management-api';
import { PageLayout, PageHeader, LoadingState } from './ui';
import { Typography, Paper, Box } from '@mui/material';

const SystemMetrics = () => {
  const [metrics, setMetrics] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const cleanAndFormatMetrics = (rawData) => {
    return rawData
      .split('\n')
      .filter((line) => line.trim() !== '')
      .filter((line) => !line.startsWith('#'))
      .filter(
        (line) =>
          line.startsWith('helpdesk_') ||
          line.startsWith('celery_') ||
          line.startsWith('ai_')
      )
      .filter((line) => !line.includes('_bucket') && !line.includes('_created'))
      .join('\n');
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getSystemMetrics();
        setMetrics(cleanAndFormatMetrics(response.data));
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
      <PageLayout>
        <LoadingState message="Загрузка метрик…" />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="max-w-5xl">
      <PageHeader title="Системные метрики" subtitle="Prometheus-метрики helpdesk, Celery и AI" />

      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper
          elevation={0}
          className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <pre className="m-0 font-mono text-sm leading-relaxed text-green-400">
            {metrics || 'Нет данных по метрикам…'}
          </pre>
        </Paper>
      )}
    </PageLayout>
  );
};

export default SystemMetrics;
