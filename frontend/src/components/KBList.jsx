import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getKBArticles } from '../services/ticket-management-api';
import { PageLayout, PageHeader, ButtonGroup, LoadingState, EmptyState } from './ui';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Chip,
  CardActionArea,
} from '@mui/material';

const KBList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isWorker = user?.role === 'admin' || user?.role === 'engineer';

  const [articles, setArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async (query = '') => {
    setIsLoading(true);
    try {
      const params = query ? { search: query } : {};
      const response = await getKBArticles(params);
      setArticles(response.data.results || response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchArticles(searchQuery);
  };

  return (
    <PageLayout maxWidth="max-w-4xl">
      <PageHeader
        title="База знаний"
        subtitle="Статьи и инструкции для решения типовых проблем"
        actions={
          isWorker ? (
            <Button variant="contained" onClick={() => navigate('/helpdesk/kb-articles/create')}>
              Написать статью
            </Button>
          ) : null
        }
      />

      <Box component="form" onSubmit={handleSearch} className="mb-8">
        <ButtonGroup className="w-full flex-col sm:flex-row sm:items-stretch">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Поиск по статьям (напр. принтер, VPN)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="contained" color="primary" className="!min-w-[120px]">
            Искать
          </Button>
        </ButtonGroup>
      </Box>

      {isLoading ? (
        <LoadingState message="Загрузка статей…" />
      ) : articles.length === 0 ? (
        <EmptyState
          title="Статьи не найдены"
          description="Попробуйте изменить поисковый запрос или создайте новую статью."
          action={
            isWorker ? (
              <Button variant="outlined" onClick={() => navigate('/helpdesk/kb-articles/create')}>
                Создать статью
              </Button>
            ) : null
          }
        />
      ) : (
        <Stack spacing={3}>
          {articles.map((article) => (
            <Paper key={article.id} elevation={0} className="hd-card overflow-hidden">
              <CardActionArea
                onClick={() => navigate(`/helpdesk/kb-articles/${article.id}`)}
                className="!p-6"
              >
                <Box className="mb-3 flex flex-wrap items-center gap-2">
                  {!article.is_published && (
                    <Chip label="Черновик" color="warning" size="small" variant="outlined" />
                  )}
                  <Typography variant="h6" fontWeight={700}>
                    {article.title}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" className="!mb-4 !line-clamp-2">
                  {article.content.substring(0, 150)}...
                </Typography>

                <Box className="flex flex-wrap gap-2">
                  <Chip label={`Категория: ${article.category_name || 'Нет'}`} size="small" />
                  <Chip label={`Просмотры: ${article.view_count}`} size="small" variant="outlined" />
                  <Chip label={`Полезно: ${article.helpful_count}`} size="small" color="success" variant="outlined" />
                </Box>
              </CardActionArea>
            </Paper>
          ))}
        </Stack>
      )}
    </PageLayout>
  );
};

export default KBList;
