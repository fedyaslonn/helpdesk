// src/components/UserProfile.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { getCurrentUser, updateUser } from "../services/user-management-api";
import "../styles/UserProfile.css";

function UserProfile() {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Поля соответствуют сериализатору: full_name, contact_phone
  const [editForm, setEditForm] = useState({
    email: "",
    username: "",
    full_name: "",
    contact_phone: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // ✅ Правильный эндпоинт: /users/me/
        const response = await getCurrentUser();
        const userData = response.data;

        setUser(userData);
        setEditForm({
          email: userData.email || "",
          username: userData.username || "",
          full_name: userData.full_name || "",
          contact_phone: userData.contact_phone || "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) return;

    try {
      // ✅ Собираем только изменённые поля
      const changes = {};
      if (editForm.email !== user.email) changes.email = editForm.email;
      if (editForm.username !== user.username) changes.username = editForm.username;
      if (editForm.full_name !== user.full_name) changes.full_name = editForm.full_name;
      if (editForm.contact_phone !== user.contact_phone) changes.contact_phone = editForm.contact_phone;

      if (Object.keys(changes).length === 0) {
        setSuccess("Нет изменений для сохранения");
        setIsEditing(false);
        return;
      }

      // ✅ PATCH /users/{id}/
      const response = await updateUser(user.id, changes);

      setUser({ ...user, ...response.data });
      setSuccess("Профиль успешно обновлён!");
      setIsEditing(false);
    } catch (err) {
      console.error("Update failed:", err);
      const errors = err.response?.data;
      if (errors?.email) setError(errors.email[0]);
      else if (errors?.username) setError(errors.username[0]);
      else if (errors?.detail) setError(errors.detail);
      else setError("Ошибка обновления профиля");
    }
  };

  // ✅ Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Отображение роли
  const getRoleLabel = (role) => {
    const labels = {
      admin: "Администратор",
      engineer: "Инженер поддержки",
      client: "Клиент",
    };
    return labels[role] || role;
  };

  if (loading) return <div className="loading">Загрузка профиля...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;
  if (!user) return <div className="error">Пользователь не найден</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>Мой профиль</h2>
        <span className={`role-badge role-${user.role}`}>
          {getRoleLabel(user.role)}
        </span>
      </div>

      {!isEditing ? (
        // 🔍 Режим просмотра
        <div className="profile-details">
          <div className="detail-row">
            <span className="label">Логин:</span>
            <span className="value">{user.username}</span>
          </div>
          <div className="detail-row">
            <span className="label">Email:</span>
            <span className="value">{user.email}</span>
          </div>
          <div className="detail-row">
            <span className="label">ФИО:</span>
            <span className="value">{user.full_name || "Не указано"}</span>
          </div>
          <div className="detail-row">
            <span className="label">Телефон:</span>
            <span className="value">{user.contact_phone || "Не указан"}</span>
          </div>
          <div className="detail-row">
            <span className="label">Верификация:</span>
            <span className={`value ${user.is_verified ? "verified" : "pending"}`}>
              {user.is_verified ? "✅ Подтверждён" : "⏳ Ожидает проверки"}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Дата регистрации:</span>
            <span className="value">{formatDate(user.date_joined)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Последний вход:</span>
            <span className="value">{formatDate(user.last_login)}</span>
          </div>

          {/* ✅ Доп. информация для инженеров */}
          {user.role === "engineer" && user.engineer_profile && (
            <>
              <div className="detail-row">
                <span className="label">Макс. заявок:</span>
                <span className="value">{user.engineer_profile.max_concurrent_tickets}</span>
              </div>
              <div className="detail-row">
                <span className="label">На дежурстве:</span>
                <span className={`value ${user.engineer_profile.is_on_duty ? "on-duty" : "off-duty"}`}>
                  {user.engineer_profile.is_on_duty ? "✅ Да" : "❌ Нет"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Решено заявок:</span>
                <span className="value">{user.engineer_profile.resolved_tickets_count || 0}</span>
              </div>
            </>
          )}

          {/* ✅ Доп. информация для клиентов */}
          {user.role === "client" && user.client_profile && (
            <>
              <div className="detail-row">
                <span className="label">Должность:</span>
                <span className="value">{user.client_profile.position || "Не указана"}</span>
              </div>
              <div className="detail-row">
                <span className="label">ID аккаунта:</span>
                <span className="value">{user.client_profile.account_id || "Не присвоен"}</span>
              </div>
            </>
          )}

          <div className="profile-actions">
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              ✏️ Редактировать профиль
            </button>
            <button className="btn-logout" onClick={logout}>
              🚪 Выйти
            </button>
          </div>
        </div>
      ) : (
        // ✏️ Режим редактирования
        <div className="edit-form">
          <h3>Редактирование профиля</h3>
          {success && <div className="success-message">{success}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Логин *</label>
              <input
                type="text"
                name="username"
                value={editForm.username}
                onChange={handleEditChange}
                required
              />
            </div>

            <div className="form-group">
              <label>ФИО</label>
              <input
                type="text"
                name="full_name"
                value={editForm.full_name}
                onChange={handleEditChange}
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="form-group">
              <label>Телефон</label>
              <input
                type="tel"
                name="contact_phone"
                value={editForm.contact_phone}
                onChange={handleEditChange}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                💾 Сохранить изменения
              </button>
              <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>
                ✕ Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
