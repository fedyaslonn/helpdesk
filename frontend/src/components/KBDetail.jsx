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
    <Container maxWidth="md" sx={{ mt: { xs: 4, md: 8 }, mb: 10 }}> {/* 🔥 Увеличил отступы всей страницы от краев экрана */}
      <Button 
        variant="outlined" 
        color="inherit" 
        size="small" 
        onClick={() => navigate('/helpdesk/kb-articles')}
        sx={{ mb: 5 }} /* 🔥 Увеличил отступ от кнопки "Назад" до самой статьи */
      >
        ← Назад к списку
      </Button>

      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, border: '1px solid #e2e8f0', borderRadius: 3 }}> {/* 🔥 Увеличил внутренний padding (p) карточки */}
        
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={3}> {/* 🔥 Отступ от заголовка до тегов */}
          <Typography variant="h4" fontWeight="bold" color="#0f172a" sx={{ flex: 1, minWidth: '300px', lineHeight: 1.3 }}>
            {article.title}
          </Typography>
          {canEdit && (
            <Button variant="outlined" color="error" size="small" onClick={handleDelete}>
              Удалить статью
            </Button>
          )}
        </Box>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 6, pb: 4, borderBottom: '1px solid #e2e8f0' }}> {/* 🔥 Увеличил spacing между чипами и отступы mb/pb */}
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
            fontSize: '1.15rem', // 🔥 Чуть увеличил шрифт для удобства чтения
            lineHeight: 1.9,     // 🔥 Добавил межстрочный интервал (воздух внутри текста)
            color: '#334155', 
            whiteSpace: 'pre-wrap', 
            mb: 7                // 🔥 Огромный отступ от основного текста до тегов
          }}
        >
          {article.content}
        </Typography>

        {article.tags && (
          <Box mb={6}> {/* 🔥 Увеличил отступ от тегов до разделительной линии */}
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={2} textTransform="uppercase">
              Теги
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {article.tags.split(',').map(t => (
                <Chip 
                  key={t} 
                  label={`#${t.trim()}`} 
                  size="medium" // 🔥 Сделал теги чуть крупнее
                  sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 'medium' }} 
                />
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ mb: 5 }} /> {/* 🔥 Увеличил отступ вокруг Divider */}

        {/* Блок голосования */}
        <Box sx={{ bgcolor: '#f8fafc', p: 5, borderRadius: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}> {/* 🔥 Увеличил padding в блоке голосования */}
          <Typography variant="h5" fontWeight="bold" color="#0f172a" mb={3}> {/* 🔥 Сделал текст вопроса крупнее и отодвинул кнопку */}
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
              px: 5, 
              py: 1.5,
              fontSize: '1.1rem', // 🔥 Увеличил кнопку
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
