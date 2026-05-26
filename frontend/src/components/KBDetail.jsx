import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getKBArticleDetails, deleteKBArticle, voteKBArticle } from '../services/ticket-management-api';
import { PageLayout, PageHeader, LoadingState } from './ui';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Stack,
  Divider,
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
        alert('Статья не найдена');
        navigate('/helpdesk/kb-articles');
      } finally {
        setIsLoading(false);
      }
    };
    loadArticle();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить эту статью навсегда?')) return;
    try {
      await deleteKBArticle(id);
      navigate('/helpdesk/kb-articles');
    } catch (err) {
      alert('Ошибка при удалении статьи');
    }
  };

  const handleVote = async () => {
    if (voted) return;
    try {
      const response = await voteKBArticle(id, { helpful: true });
      setArticle((prev) => ({ ...prev, helpful_count: response.data.helpful_count }));
      setVoted(true);
    } catch (err) {
      alert('Ошибка при сохранении оценки');
    }
  };

  if (isLoading) {
    return (
      <PageLayout maxWidth="max-w-3xl">
        <LoadingState message="Загрузка статьи…" />
      </PageLayout>
    );
  }

  if (!article) return null;

  const canEdit = user?.role === 'admin' || user?.id === article.author;

  return (
    <PageLayout maxWidth="max-w-3xl">
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={() => navigate('/helpdesk/kb-articles')}
        className="!mb-4"
      >
        ← Назад к списку
      </Button>

      <Paper elevation={0} className="hd-card !p-6 md:!p-8">
        <PageHeader
          title={article.title}
          actions={
            canEdit ? (
              <Button variant="outlined" color="error" size="small" onClick={handleDelete}>
                Удалить
              </Button>
            ) : null
          }
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="!mb-6 !border-b !border-slate-200 !pb-4">
          <Chip label={`Автор: ${article.author_name || 'Неизвестен'}`} size="small" variant="outlined" />
          <Chip label={`Опубликовано: ${new Date(article.created_at).toLocaleDateString('ru-RU')}`} size="small" variant="outlined" />
          <Chip label={`Просмотров: ${article.view_count}`} size="small" variant="outlined" />
          {!article.is_published && <Chip label="Черновик" size="small" color="warning" />}
        </Stack>

        <Typography variant="body1" className="!mb-8 !whitespace-pre-wrap !leading-relaxed text-slate-700">
          {article.content}
        </Typography>

        {article.tags && (
          <Box className="mb-6">
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" className="!mb-2">
              Теги
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {article.tags.split(',').map((t) => (
                <Chip key={t} label={`#${t.trim()}`} size="small" />
              ))}
            </Stack>
          </Box>
        )}

        <Divider className="!mb-6" />

        <Box className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <Typography variant="h6" fontWeight={700} className="!mb-4">
            Статья была полезна?
          </Typography>
          <Button
            variant={voted ? 'contained' : 'outlined'}
            color="success"
            size="large"
            onClick={handleVote}
            disabled={voted}
          >
            {voted ? `Спасибо! (${article.helpful_count})` : `Да, помогло (${article.helpful_count})`}
          </Button>
        </Box>
      </Paper>
    </PageLayout>
  );
};

export default KBDetail;
