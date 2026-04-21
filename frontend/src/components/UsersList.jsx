// src/components/UsersList.jsx
import { useEffect, useState } from "react";
import { getUsers } from "../services/user-management-api";
import "../styles/UsersList.css";

function UsersList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  // ✅ Фильтры по роли (вместо организации)
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filterOptions = [
    { value: "all", label: "Все пользователи", icon: "👥" },
    { value: "admin", label: "Администраторы", icon: "👑" },
    { value: "engineer", label: "Инженеры", icon: "🔧" },
    { value: "client", label: "Клиенты", icon: "👤" },
    { value: "verified", label: "Верифицированные", icon: "✅" },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // ✅ Параметры фильтрации для сервера
        const params = {};
        if (selectedFilter === "verified") {
          params.is_verified = true;
        } else if (selectedFilter !== "all") {
          params.role = selectedFilter;
        }

        const response = await getUsers(params);
        const data = response.data;

        // ✅ Поддержка пагинации DRF
        if (data.results) {
          setUsers(data.results);
          setPagination({
            next: data.next,
            previous: data.previous,
            count: data.count,
          });
        } else {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Не удалось загрузить список пользователей");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [selectedFilter]);

  const handleFilterChange = (value) => {
    setSelectedFilter(value);
  };

  const clearFilter = () => {
    setSelectedFilter("all");
  };

  const loadPage = async (url) => {
    if (!url) return;
    setIsLoading(true);
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setUsers(data.results);
      setPagination({
        next: data.next,
        previous: data.previous,
        count: data.count,
      });
    } catch {
      setError("Ошибка загрузки страницы");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Отображение роли
  const getRoleLabel = (role) => {
    const labels = {
      admin: "Администратор",
      engineer: "Инженер",
      client: "Клиент",
    };
    return labels[role] || role;
  };

  if (error) {
    return (
      <div className="users-container">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="users-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка пользователей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="page-header">
        <h1 className="page-title">Список пользователей</h1>
        <span className="results-count">
          Найдено: <strong>{pagination.count || users.length}</strong>
        </span>
      </div>

      {/* 🔍 Фильтры */}
      <div className="filters-section">
        <div className="filters-header">
          <span className="filters-title">🔎 Фильтр по роли</span>
          {selectedFilter !== "all" && (
            <button className="clear-filters-btn" onClick={clearFilter}>
              ✕ Сбросить
            </button>
          )}
        </div>
        <div className="filter-buttons">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              className={`filter-btn ${selectedFilter === option.value ? "active" : ""}`}
              onClick={() => handleFilterChange(option.value)}
              title={option.description}
            >
              <span className="filter-icon">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📋 Таблица пользователей */}
      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Пользователи не найдены</h3>
          <p>Попробуйте изменить параметры фильтрации</p>
          {selectedFilter !== "all" && (
            <button className="btn-secondary" onClick={clearFilter}>
              Показать всех
            </button>
          )}
        </div>
      ) : (
        <div className="users-table">
          <div className="table-header">
            <div className="col-user">Пользователь</div>
            <div className="col-role">Роль</div>
            <div className="col-status">Статус</div>
            <div className="col-date">Дата регистрации</div>
          </div>

          {users.map((user) => (
            <div key={user.id} className="user-row">
              <div className="col-user">
                <div className="user-info">
                  <div className="avatar">{user.username?.[0]?.toUpperCase() || "?"}</div>
                  <div className="user-details">
                    <div className="username">{user.username || "Без имени"}</div>
                    <div className="email">{user.email || "Нет email"}</div>
                  </div>
                </div>
              </div>

              <div className="col-role">
                <span className={`role-badge role-${user.role}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>

              <div className="col-status">
                {user.is_verified ? (
                  <span className="status-verified">✅ Верифицирован</span>
                ) : (
                  <span className="status-pending">⏳ Ожидает</span>
                )}
              </div>

              <div className="col-date">
                {user.date_joined ? new Date(user.date_joined).toLocaleDateString("ru-RU") : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📄 Пагинация */}
      {(pagination.next || pagination.previous) && (
        <div className="pagination">
          <button
            className="btn-page"
            disabled={!pagination.previous || isLoading}
            onClick={() => loadPage(pagination.previous)}
          >
            ← Назад
          </button>
          <span className="page-info">
            Страница {pagination.previous ? 2 : 1}
          </span>
          <button
            className="btn-page"
            disabled={!pagination.next || isLoading}
            onClick={() => loadPage(pagination.next)}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}

export default UsersList;
