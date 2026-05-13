import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getKBArticleDetails, deleteKBArticle, voteKBArticle } from '../services/ticket-management-api';

import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Chip,
  Stack,
  Divider
} from '@mui/material';

const KBDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [article, setArticle] = useState(null);
  const [voted, setVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      setIsLoading(true);
      try {
        const response = await getKBArticleDetails(id);
        setArticle(response.data);
      } catch (err) {
        alert("Статья не найдена");
        // 🔥 Исправлен путь на kb-articles
        navigate('/helpdesk/kb-articles');
      } finally {
        setIsLoading(false);
      }
    };
    loadArticle();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Вы уверены, что хотите удалить эту статью навсегда?")) return;
    try {
      await deleteKBArticle(id);
      // 🔥 Исправлен путь на kb-articles
      navigate('/helpdesk/kb-articles');
    } catch (err) {
      alert("Ошибка при удалении статьи");
    }
  };

  const handleVote = async () => {
    if (voted) return;
    try {
      const response = await voteKBArticle(id, { helpful: true });
      setArticle(prev => ({ ...prev, helpful_count: response.data.helpful_count }));
      setVoted(true);
    } catch (err) {
      alert("Ошибка при сохранении оценки");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={10}>
        <CircularProgress color="primary" />
        <Typography mt={2} color="text.secondary">Загрузка статьи...</Typography>
      </Box>
    );
  }

  if (!article) return null;

  const canEdit = user?.role === 'admin' || user?.id === article.author;

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
      <Button 
        variant="outlined" 
        color="inherit" 
        size="small" 
        onClick={() => navigate('/helpdesk/kb-articles')}
        sx={{ mb: 4 }}
      >
        Назад к списку
      </Button>

      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, border: '1px solid #e2e8f0', borderRadius: 3 }}>
        
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <Typography variant="h4" fontWeight="bold" color="#0f172a" sx={{ flex: 1, minWidth: '300px' }}>
            {article.title}
          </Typography>
          {canEdit && (
            <Button variant="outlined" color="error" size="small" onClick={handleDelete}>
              Удалить статью
            </Button>
          )}
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 4, pb: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Chip label={`Автор: ${article.author_name || 'Неизвестен'}`} size="small" variant="outlined" />
          <Chip label={`Опубликовано: ${new Date(article.created_at).toLocaleDateString('ru-RU')}`} size="small" variant="outlined" />
          <Chip label={`Просмотров: ${article.view_count}`} size="small" variant="outlined" />
          {!article.is_published && (
            <Chip label="Скрытый черновик" size="small" color="warning" sx={{ fontWeight: 'bold' }} />
          )}
        </Stack>

        <Typography 
          variant="body1" 
          sx={{ 
            fontSize: '1.1rem', 
            lineHeight: 1.8, 
            color: '#334155', 
            whiteSpace: 'pre-wrap', 
            mb: 5 
          }}
        >
          {article.content}
        </Typography>

        {article.tags && (
          <Box mb={5}>
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1.5} textTransform="uppercase">
              Теги
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {article.tags.split(',').map(t => (
                <Chip 
                  key={t} 
                  label={`#${t.trim()}`} 
                  size="small" 
                  sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 'medium' }} 
                />
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ mb: 4 }} />

        {/* Блок голосования */}
        <Box sx={{ bgcolor: '#f8fafc', p: 4, borderRadius: 2, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight="bold" color="#0f172a" mb={2}>
            Статья была полезна?
          </Typography>
          <Button 
            variant={voted ? "contained" : "outlined"}
            color="success" 
            size="large"
            onClick={handleVote} 
            disabled={voted}
            disableElevation
            sx={{ 
              fontWeight: 'bold', 
              px: 4, 
              py: 1.5,
              borderWidth: voted ? 0 : 2,
              '&:hover': { borderWidth: voted ? 0 : 2 }
            }}
          >
            {voted ? `Спасибо за оценку! (${article.helpful_count})` : `Да, помогло (${article.helpful_count})`}
          </Button>
        </Box>

      </Paper>
    </Container>
  );
};

export default KBDetail;
