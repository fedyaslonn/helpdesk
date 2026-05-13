import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getKBArticles } from '../services/ticket-management-api';

import {
  Container, Box, Typography, TextField, Button, Paper, 
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
    <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#1e293b">
          База знаний
        </Typography>
        {isWorker && (
          <Button variant="contained" color="primary" onClick={() => navigate('/helpdesk/kb-articles/create')}>
            Написать статью
          </Button>
        )}
      </Box>

      <Box component="form" onSubmit={handleSearch} display="flex" gap={2} mb={5}>
        <TextField 
          fullWidth
          variant="outlined"
          placeholder="Поиск по статьям (напр. принтер, VPN)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ bgcolor: 'white' }}
        />
        <Button type="submit" variant="contained" color="secondary" sx={{ px: 4, fontWeight: 'bold' }}>
          Искать
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {articles.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" mt={4}>
              Статьи не найдены. Попробуйте изменить поисковый запрос.
            </Typography>
          ) : (
            articles.map(article => (
              <Paper 
                key={article.id} 
                elevation={0} 
                sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}
              >
                <CardActionArea onClick={() => navigate(`/helpdesk/kb/${article.id}`)} sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    {!article.is_published && (
                      <Chip label="Черновик" color="warning" size="small" variant="outlined" />
                    )}
                    <Typography variant="h6" fontWeight="bold" color="#0f172a">
                      {article.title}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="#475569" mb={2}>
                    {article.content.substring(0, 150)}...
                  </Typography>
                  
                  <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
                    <Chip label={`Категория: ${article.category_name || 'Нет'}`} size="small" sx={{ bgcolor: '#f1f5f9' }} />
                    <Chip label={`Просмотры: ${article.view_count}`} size="small" variant="outlined" />
                    <Chip label={`Полезно: ${article.helpful_count}`} size="small" color="success" variant="outlined" />
                    
                    {article.tags && article.tags.split(',').map((tag, idx) => (
                      <Typography key={idx} variant="caption" color="text.secondary" sx={{ bgcolor: '#f8fafc', px: 1, py: 0.5, borderRadius: 1 }}>
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
    </Container>
  );
};

export default KBList;
