// services/user-management-api.js
import { apiClientInstance as apiClient } from '../api/ApiClient.jsx'

// === ПОЛЬЗОВАТЕЛИ ===

// Список пользователей с фильтрацией
// GET /helpdesk/users/?role=engineer&is_verified=true&search=ivan
export const getUsers = (params = {}) =>
  apiClient.get('helpdesk/users/', { params })

export const exportUsersExcel = (params = {}) =>
  apiClient.get('helpdesk/users/export-excel/', { params, responseType: 'blob' })

export const exportUsersWord = (params = {}) =>
  apiClient.get('helpdesk/users/export-word/', { params, responseType: 'blob' })

// Детали пользователя
// GET /helpdesk/users/{id}/
export const getUserById = (id) =>
  apiClient.get(`helpdesk/users/${id}/`)

// Текущий пользователь (ОСНОВНОЙ для профиля)
// ✅ GET /helpdesk/users/me/
export const getCurrentUser = () =>
  apiClient.get('helpdesk/users/me/')

export const registerUser = (userData) =>
  apiClient.post('helpdesk/users/register/', userData); // <-- Добавили /register/

// А если в будущем тебе понадобится метод, где именно админ создает инженеров:
export const adminCreateUser = (userData) =>
  apiClient.post('helpdesk/users/', userData);

// Обновление профиля (PATCH — частичное)
// ✅ PATCH /helpdesk/users/{id}/
export const updateUser = (id, userData) =>
  apiClient.patch(`helpdesk/users/${id}/`, userData)

// Полное обновление (если нужно)
// ⚠️ Требует ВСЕ обязательные поля
export const updateUserFull = (id, userData) =>
  apiClient.put(`helpdesk/users/${id}/`, userData)

// Удаление пользователя (только админ)
// ⚠️ Необратимое действие!
export const deleteUser = (id) =>
  apiClient.delete(`helpdesk/users/${id}/`)

// Смена роли (только админ)
// ✅ POST /helpdesk/users/{id}/change_role/
export const changeUserRole = (id, newRole) =>
  apiClient.post(`helpdesk/users/${id}/change_role/`, { role: newRole })

// Верификация (только админ)
// ✅ POST /helpdesk/users/{id}/verify/
export const verifyUser = (id) =>
  apiClient.post(`/users/${id}/verify/`)

// Статистика по пользователям (только админ)
// ✅ GET /helpdesk/users/stats/
export const getUserStats = () =>
  apiClient.get('helpdesk/users/stats/')

// === ПРОФИЛИ КЛИЕНТОВ ===
export const getClientProfiles = (params = {}) =>
  apiClient.get('helpdesk/clients/', { params })

export const getClientProfile = (id) =>
  apiClient.get(`helpdesk/clients/${id}/`)

export const getEngineerProfiles = (params = {}) =>
  apiClient.get('/helpdesk/engineers/', { params })

// Детали конкретного профиля
export const getEngineerProfile = (id) =>
  apiClient.get(`/helpdesk/engineers/${id}/`)

// Только те, кто на дежурстве
export const getEngineersOnDuty = () =>
  apiClient.get('/helpdesk/engineers/on_duty/')

// Переключение дежурства
export const toggleEngineerDuty = (id) =>
  apiClient.post(`/helpdesk/engineers/${id}/toggle_duty/`)
