import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getKBArticles } from '../services/ticket-management-api';

import {
  Box, Typography, TextField, Button, Paper,
  CircularProgress, Stack, Chip, CardActionArea
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
    <Box
      component="main"
      sx={{
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        boxSizing: 'border-box',
        px: { xs: '16px', sm: '24px', md: '32px' },
        py: 4,
      }}
    >
      {/* 1. БЛОК ЗАГОЛОВКА И КНОПКИ СОЗДАНИЯ */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={3} /* 👈 Жёсткий отступ между Заголовком и кнопкой (особенно видно на мобилках) */
        sx={{ mb: 4 }} /* 👈 Жёсткий отступ ВНИЗ до строки поиска */
      >
        <Typography variant="h4" fontWeight="bold" color="#1e293b" textAlign={{ xs: 'center', sm: 'left' }}>
          База знаний
        </Typography>
        
        {isWorker && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/helpdesk/kb-articles/create')}
            sx={{ flexShrink: 0 }}
          >
            Написать статью
          </Button>
        )}
      </Stack>

      {/* 2. БЛОК ПОИСКА И КНОПКИ "ИСКАТЬ" */}
      <Stack
        component="form"
        onSubmit={handleSearch}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2} /* 👈 Жёсткий отступ между Формой ввода и кнопкой "Искать" */
        sx={{ mb: 6 }} /* 👈 Жёсткий отступ ВНИЗ до списка статей */
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Поиск по статьям (напр. принтер, VPN)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ bgcolor: 'background.paper' }}
        />
        
        <Button 
          type="submit" 
          variant="contained" 
          color="secondary" 
          sx={{ px: 4, py: 1.5, fontWeight: 'bold', flexShrink: 0 }}
        >
          Искать
        </Button>
      </Stack>

      {/* Дальше идет твой isLoading и список статей... */}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={{ xs: 3, sm: 4 }} sx={{ width: '100%' }}> {/* 🔥 Увеличил отступ между карточками (spacing) */}
          {articles.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" mt={4}>
              Статьи не найдены. Попробуйте изменить поисковый запрос.
            </Typography>
          ) : (
            articles.map((article) => (
              <Paper
                key={article.id}
                elevation={0}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                }}
              >
                <CardActionArea onClick={() => navigate(`/helpdesk/kb-articles/${article.id}`)} sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}> {/* 🔥 Отдалил заголовок от текста (mb={2}) */}
                    {!article.is_published && (
                      <Chip label="Черновик" color="warning" size="small" variant="outlined" />
                    )}
                    <Typography variant="h6" fontWeight="bold" color="#0f172a">
                      {article.title}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="#475569" mb={3} sx={{ lineHeight: 1.6 }}> {/* 🔥 Отдалил текст от тегов (mb={3}) и увеличил межстрочный интервал */}
                    {article.content.substring(0, 150)}...
                  </Typography>

                  <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
                    <Chip label={`Категория: ${article.category_name || 'Нет'}`} size="small" sx={{ bgcolor: '#f1f5f9' }} />
                    <Chip label={`Просмотры: ${article.view_count}`} size="small" variant="outlined" />
                    <Chip label={`Полезно: ${article.helpful_count}`} size="small" color="success" variant="outlined" />

                    {article.tags &&
                      article.tags.split(',').map((tag, idx) => (
                        <Typography
                          key={idx}
                          variant="caption"
                          color="text.secondary"
                          sx={{ bgcolor: '#f8fafc', px: 1.5, py: 0.5, borderRadius: 1 }}
                        >
                          #{tag.trim()}
                        </Typography>
                      ))}
                  </Box>
                </CardActionArea>
              </Paper>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
};

export default KBList;
