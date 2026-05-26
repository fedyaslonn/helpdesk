import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  getSLARules, createSLARule, updateSLARule, deleteSLARule, 
  getPriorities, getCategories 
} from '../services/ticket-management-api';

const SLARulesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [slaRules, setSlaRules] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Стейты формы
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialForm = { priority: '', category: '', response_time_min: '', resolution_time_min: '', comment: '' };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [slaRes, prioRes, catRes] = await Promise.all([
        getSLARules(),
        getPriorities(),
        getCategories() 
      ]);
      setSlaRules(slaRes.data.results || slaRes.data);
      setPriorities(prioRes.data.results || prioRes.data);
      setCategories(catRes.data.results || catRes.data);
    } catch (err) {
      console.error("Ошибка загрузки данных SLA", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startEditing = (rule) => {
    setIsEditing(true);
    setEditingId(rule.id);
    setFormData({
      priority: rule.priority,
      category: rule.category, // Теперь категория есть всегда
      response_time_min: rule.response_time_min,
      resolution_time_min: rule.resolution_time_min,
      comment: rule.comment || ''
    });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        priority: parseInt(formData.priority),
        category: parseInt(formData.category), // Обязательно парсим в int
        response_time_min: parseInt(formData.response_time_min),
        resolution_time_min: parseInt(formData.resolution_time_min),
        comment: formData.comment
      };

      if (isEditing) {
        await updateSLARule(editingId, payload);
      } else {
        await createSLARule(payload);
      }
      resetForm();
      loadData();
    } catch (err) {
      alert("Ошибка при сохранении. Возможно, правило для этой связки Приоритет + Категория уже существует.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить этот параметр SLA?")) return;
    try {
      await deleteSLARule(id);
      setSlaRules(prev => prev.filter(rule => rule.id !== id));
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  // Перевод минут в читаемый формат (часы/минуты)
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  };

  if (isLoading) return <div className="spinner" style={{ margin: '50px auto' }}></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Параметры SLA</h2>

      {/* Форма доступна ТОЛЬКО админу */}
      {isAdmin && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px' }}>{isEditing ? 'Редактировать правило' : 'Новое правило SLA'}</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Приоритет *</label>
              <select name="priority" className="form-control" value={formData.priority} onChange={handleFormChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="">Выберите приоритет...</option>
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Категория *</label>
              {/* Категория теперь REQUIRED */}
              <select name="category" className="form-control" value={formData.category} onChange={handleFormChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="">Выберите категорию...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Время реакции (мин) *</label>
              <input type="number" name="response_time_min" className="form-control" min="1" value={formData.response_time_min} onChange={handleFormChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Время решения (мин) *</label>
              <input type="number" name="resolution_time_min" className="form-control" min="1" value={formData.resolution_time_min} onChange={handleFormChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Комментарий</label>
            <textarea name="comment" className="form-control" rows="2" placeholder="Например: Для критически важной инфраструктуры" value={formData.comment} onChange={handleFormChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {isEditing && <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={isSubmitting}>Отмена</button>}
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : (isEditing ? 'Сохранить изменения' : 'Добавить параметр')}
            </button>
          </div>
        </form>
      )}

      {/* Таблица параметров SLA */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 15px', color: '#475569', fontSize: '14px' }}>Приоритет</th>
              <th style={{ padding: '12px 15px', color: '#475569', fontSize: '14px' }}>Категория</th>
              <th style={{ padding: '12px 15px', color: '#475569', fontSize: '14px' }}>Реакция</th>
              <th style={{ padding: '12px 15px', color: '#475569', fontSize: '14px' }}>Решение</th>
              <th style={{ padding: '12px 15px', color: '#475569', fontSize: '14px' }}>Комментарий</th>
              {isAdmin && <th style={{ padding: '12px 15px', color: '#475569', fontSize: '14px', width: '100px' }}>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {slaRules.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Параметры SLA не настроены.</td></tr>
            ) : (
              slaRules.map(rule => (
                <tr key={rule.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#0f172a' }}>{rule.priority_name}</td>
                  <td style={{ padding: '12px 15px', color: '#334155', fontWeight: '500' }}>{rule.category_name}</td>
                  <td style={{ padding: '12px 15px', color: '#10b981', fontWeight: 'bold' }}>{formatTime(rule.response_time_min)}</td>
                  <td style={{ padding: '12px 15px', color: '#3b82f6', fontWeight: 'bold' }}>{formatTime(rule.resolution_time_min)}</td>
                  <td style={{ padding: '12px 15px', color: '#64748b', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rule.comment}>
                    {rule.comment}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => startEditing(rule)}>✏️</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDelete(rule.id)}>🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SLARulesPage;
