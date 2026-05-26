import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getComments, createComment, updateComment, deleteComment } from '../services/ticket-management-api';

import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Avatar,
  CircularProgress,
  Paper,
  Chip
} from '@mui/material';

const TicketComments = ({ ticketId }) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const response = await getComments({ ticket: ticketId });
        setComments(response.data.results || response.data);
      } catch (err) {
        console.error("Ошибка загрузки комментариев", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (ticketId) fetchComments();
  }, [ticketId]);

  const getAuthorInfo = (comment) => {
    const name = comment.author_info?.username || 'Пользователь';
    const initial = typeof name === 'string' && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
    return { name, initial };
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    
    try {
      const response = await createComment({ ticket: ticketId, content: newComment });
      setComments([{ ...response.data, replies: [] }, ...comments]);
      setNewComment('');
    } catch (err) {
      alert(err.response?.data?.content?.[0] || 'Ошибка при отправке комментария');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    
    try {
      const response = await createComment({ ticket: ticketId, parent: parentId, content: replyText });
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), response.data] };
        }
        return c;
      }));
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      alert('Ошибка при отправке ответа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, parentId = null) => {
    if (!window.confirm('Точно удалить комментарий?')) return;
    try {
      await deleteComment(id);
      if (parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) return { ...c, replies: c.replies.filter(r => r.id !== id) };
          return c;
        }));
      } else {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const startEditing = (comment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
    setReplyingTo(null); 
  };

  const handleSaveEdit = async (parentId = null) => {
    if (!editingText.trim()) return;
    try {
      const response = await updateComment(editingId, { content: editingText });
      if (parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) return { ...c, replies: c.replies.map(r => r.id === editingId ? response.data : r) };
          return c;
        }));
      } else {
        setComments(prev => prev.map(c => c.id === editingId ? response.data : c));
      }
      setEditingId(null);
    } catch (err) {
      alert('Ошибка при обновлении');
    }
  };

  const renderCommentCard = (comment, isReply = false, parentId = null) => {
    const isAuthor = comment.author_info?.id === currentUser?.id;
    const canEditOrDelete = isAuthor || isAdmin;
    const { name, initial } = getAuthorInfo(comment);

    return (
      <Box 
        key={comment.id} 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          mt: isReply ? 2 : 0,
          ml: isReply ? { xs: 4, sm: 6 } : 0,
          position: 'relative',
          '&::before': isReply ? {
            content: '""',
            position: 'absolute',
            left: { xs: -24, sm: -32 },
            top: 0,
            bottom: -16,
            width: '2px',
            bgcolor: '#e2e8f0',
            zIndex: 0
          } : {}
        }}
      >
        <Avatar 
          sx={{ 
            width: isReply ? 32 : 40, 
            height: isReply ? 32 : 40, 
            bgcolor: isReply ? 'secondary.light' : 'primary.main', 
            fontSize: isReply ? '0.9rem' : '1.1rem', 
            fontWeight: 'bold',
            zIndex: 1
          }}
        >
          {initial}
        </Avatar>
        
        <Box sx={{ flexGrow: 1 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2.5, 
              bgcolor: isReply ? 'transparent' : '#f8fafc',
              border: isReply ? 'none' : '1px solid #e2e8f0',
              borderRadius: 3
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle2" fontWeight="bold" color="#0f172a">
                  {name}
                </Typography>
                {comment.author_info?.role === 'engineer' && (
                  <Chip label="Сотрудник" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '10px' }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(comment.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                {comment.created_at !== comment.updated_at && ' (изменено)'}
              </Typography>
            </Box>

            {editingId === comment.id ? (
              <Box mt={2}>
                <TextField 
                  fullWidth
                  multiline
                  rows={3}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  sx={{ bgcolor: 'white', mb: 2 }}
                />
                <Box display="flex" gap={1} justifyContent="flex-end">
                  <Button variant="text" color="inherit" size="small" onClick={() => setEditingId(null)}>Отмена</Button>
                  <Button variant="contained" color="primary" size="small" onClick={() => handleSaveEdit(parentId)}>Сохранить</Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>
                {comment.content}
              </Typography>
            )}

            {/* 🔥 ПАНЕЛЬ КНОПОК с железобетонным расстоянием spacing={4} */}
            <Stack direction="row" spacing={4} mt={1.5} alignItems="center">
              {!isReply && !editingId && (
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{ color: 'text.secondary', p: 0, minWidth: 'auto', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
                  onClick={() => { setReplyingTo(comment.id); setReplyText(''); setEditingId(null); }}
                >
                  Ответить
                </Button>
              )}

              {canEditOrDelete && editingId !== comment.id && (
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{ color: 'text.secondary', p: 0, minWidth: 'auto', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
                  onClick={() => startEditing(comment)}
                >
                  Изменить
                </Button>
              )}

              {canEditOrDelete && editingId !== comment.id && (
                <Button 
                  variant="text" 
                  size="small" 
                  color="error"
                  sx={{ p: 0, minWidth: 'auto', '&:hover': { bgcolor: 'transparent' } }}
                  onClick={() => handleDelete(comment.id, parentId)}
                >
                  Удалить
                </Button>
              )}
            </Stack>

          </Paper>
        </Box>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={2} mt={4}>
        <CircularProgress size={24} color="primary" />
        <Typography color="text.secondary">Загрузка обсуждения...</Typography>
      </Box>
    );
  }

  return (
    <Box mt={10}> {/* 🔥 Увеличен отступ перед блоком */}
      
      <Box display="flex" alignItems="center" gap={1.5} mb={5}> {/* 🔥 Увеличен отступ после заголовка */}
        <Typography variant="h5" fontWeight="bold" color="#1e293b">
          Обсуждение
        </Typography>
        <Chip 
          label={comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)} 
          size="small" 
          color="primary" 
          sx={{ fontWeight: 'bold', borderRadius: 1.5 }} 
        />
      </Box>

      <Paper elevation={0} sx={{ p: 3, mb: 5, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: 'white' }}>
        <Box component="form" onSubmit={handleAddComment}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Напишите комментарий к заявке..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          />
          <Box display="flex" justifyContent="flex-end">
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={isSubmitting || !newComment.trim()}
              sx={{ px: 4, py: 1, fontWeight: 'bold' }}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Stack spacing={4}>
        {comments.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" fontStyle="italic" sx={{ my: 4 }}>
            Пока нет комментариев. Будьте первым!
          </Typography>
        ) : (
          comments.map(comment => (
            <Box key={comment.id}>
              {renderCommentCard(comment, false)}

              {replyingTo === comment.id && (
                <Box display="flex" gap={2} mt={2} ml={{ xs: 4, sm: 6 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <TextField
                      fullWidth
                      multiline
                      size="small"
                      rows={2}
                      placeholder={`Ответ для ${getAuthorInfo(comment).name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      sx={{ bgcolor: 'white', mb: 1 }}
                    />
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Button variant="text" color="inherit" size="small" onClick={() => setReplyingTo(null)}>Отмена</Button>
                      <Button variant="contained" color="primary" size="small" onClick={() => handleAddReply(comment.id)} disabled={isSubmitting || !replyText.trim()}>
                        Ответить
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <Stack spacing={0} mt={1}>
                  {comment.replies.map(reply => renderCommentCard(reply, true, comment.id))}
                </Stack>
              )}
            </Box>
          ))
        )}
      </Stack>
    </Box>
  );
};

export default TicketComments;
