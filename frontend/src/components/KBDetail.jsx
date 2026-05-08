import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getKBArticleDetails, deleteKBArticle, voteKBArticle } from '../services/ticket-management-api';

const KBDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [article, setArticle] = useState(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const response = await getKBArticleDetails(id);
        setArticle(response.data);
      } catch (err) {
        alert("Статья не найдена");
        navigate('/helpdesk/kb');
      }
    };
    loadArticle();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Удалить статью?")) return;
    try {
      await deleteKBArticle(id);
      navigate('/helpdesk/kb');
    } catch (err) {
      alert("Ошибка удаления");
    }
  };

  const handleVote = async () => {
    if (voted) return;
    try {
      const response = await voteKBArticle(id, { helpful: true });
      setArticle(prev => ({ ...prev, helpful_count: response.data.helpful_count }));
      setVoted(true);
    } catch (err) {
      alert("Ошибка голосования");
    }
  };

  if (!article) return <div className="spinner" style={{margin: '50px auto'}}></div>;

  const canEdit = user?.role === 'admin' || user?.id === article.author;

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: '20px' }} onClick={() => navigate('/helpdesk/kb')}>← К списку статей</button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ marginTop: 0, color: '#0f172a' }}>{article.title}</h1>
        {canEdit && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Удалить</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#64748b', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <span>Автор: {article.author_name}</span>
        <span>Опубликовано: {new Date(article.created_at).toLocaleDateString()}</span>
        <span>Просмотров: {article.view_count}</span>
        {!article.is_published && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Скрытый черновик</span>}
      </div>

      <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155', whiteSpace: 'pre-wrap', marginBottom: '40px' }}>
        {article.content}
      </div>

      {article.tags && (
        <div style={{ marginBottom: '30px' }}>
          <strong>Теги: </strong> 
          {article.tags.split(',').map(t => (
            <span key={t} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '5px', fontSize: '13px' }}>#{t.trim()}</span>
          ))}
        </div>
      )}

      {/* Голосование */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>Статья была полезна?</h3>
        <button 
          onClick={handleVote} 
          disabled={voted}
          style={{ background: voted ? '#10b981' : '#fff', color: voted ? '#fff' : '#10b981', border: '2px solid #10b981', padding: '10px 20px', borderRadius: '6px', fontSize: '16px', cursor: voted ? 'default' : 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
        >
          {voted ? `✓ Спасибо за оценку! (${article.helpful_count})` : `👍 Да, помогло (${article.helpful_count})`}
        </button>
      </div>
    </div>
  );
};

export default KBDetail;
