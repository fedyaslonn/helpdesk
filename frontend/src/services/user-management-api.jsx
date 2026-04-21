// services/user-management-api.js
import { apiClientInstance as apiClient } from '../api/ApiClient.jsx'

// === ПОЛЬЗОВАТЕЛИ ===

// Список пользователей с фильтрацией
// GET /helpdesk/users/?role=engineer&is_verified=true&search=ivan
export const getUsers = (params = {}) =>
  apiClient.get('/users/', { params })

// Детали пользователя
// GET /helpdesk/users/{id}/
export const getUserById = (id) =>
  apiClient.get(`/users/${id}/`)

// Текущий пользователь (ОСНОВНОЙ для профиля)
// ✅ GET /helpdesk/users/me/
export const getCurrentUser = () =>
  apiClient.get('/users/me/')

// Создание пользователя (только админ!)
// ⚠️ Для регистрации клиентов используйте registerUser()
export const registerUser = (userData) =>
  apiClient.post('/users/', userData)

// Обновление профиля (PATCH — частичное)
// ✅ PATCH /helpdesk/users/{id}/
export const updateUser = (id, userData) =>
  apiClient.patch(`/users/${id}/`, userData)

// Полное обновление (если нужно)
// ⚠️ Требует ВСЕ обязательные поля
export const updateUserFull = (id, userData) =>
  apiClient.put(`/users/${id}/`, userData)

// Удаление пользователя (только админ)
// ⚠️ Необратимое действие!
export const deleteUser = (id) =>
  apiClient.delete(`/users/${id}/`)

// Смена роли (только админ)
// ✅ POST /helpdesk/users/{id}/change_role/
export const changeUserRole = (id, newRole) =>
  apiClient.post(`/users/${id}/change_role/`, { role: newRole })

// Верификация (только админ)
// ✅ POST /helpdesk/users/{id}/verify/
export const verifyUser = (id) =>
  apiClient.post(`/users/${id}/verify/`)

// Статистика по пользователям (только админ)
// ✅ GET /helpdesk/users/stats/
export const getUserStats = () =>
  apiClient.get('/users/stats/')

// === ПРОФИЛИ КЛИЕНТОВ ===
export const getClientProfiles = (params = {}) =>
  apiClient.get('/clients/', { params })

export const getClientProfile = (id) =>
  apiClient.get(`/clients/${id}/`)

// === ПРОФИЛИ ИНЖЕНЕРОВ ===
export const getEngineerProfiles = (params = {}) =>
  apiClient.get('/engineers/', { params })

// ✅ Инженеры на дежурстве СЕЙЧАС
export const getEngineersOnDuty = () =>
  apiClient.get('/engineers/on_duty/')

// Переключить дежурство
// ✅ Только админ или сам инженер
export const toggleEngineerDuty = (id) =>
  apiClient.post(`/engineers/${id}/toggle_duty/`)
