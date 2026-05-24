import { serverApi } from '../contants'
import { apiClientInstance } from '../api/ApiClient'
import { useAuth } from '../auth/AuthContext'


export const getOrganizations = () => {
  return apiClientInstance.get(`${serverApi}/helpdesk/organizations/organizations_list/`)
}

export const getUsers = () => {
  return apiClientInstance.get(`${serverApi}/helpdesk/users/users_list/`)
}

export const getTickets = (params = {}) => apiClientInstance.get('/helpdesk/tickets/', { params })
export const getTicketDetails = (id) => apiClientInstance.get(`/helpdesk/tickets/${id}/`)
export const createTicket = (ticketData) => apiClientInstance.post('/helpdesk/tickets/', ticketData)
export const updateTicket = (id, data) => apiClientInstance.patch(`/helpdesk/tickets/${id}/`, data)
export const deleteTicket = (id) => apiClientInstance.delete(`/helpdesk/tickets/${id}/`)

export const assignTicket = (ticketId, engineerId) => 
  apiClientInstance.post(`/helpdesk/tickets/${ticketId}/assign/`, { engineer_id: engineerId })

export const autoAssignTicket = (ticketId) => {
  // Теперь отправляем POST прямо на URL конкретного тикета (без тела запроса)
  return api.post(`/tickets/${ticketId}/auto_assign/`);
};

export const closeTicket = (ticketId) => 
  apiClientInstance.post(`/helpdesk/tickets/${ticketId}/close/`)

export const approveResolution = (ticketId) =>
  apiClientInstance.post(`/helpdesk/tickets/${ticketId}/approve_resolution/`)

export const unassignTicket = (ticketId) =>
  apiClientInstance.post(`/helpdesk/tickets/${ticketId}/unassign/`)

// === КАТЕГОРИИ (вместо организаций) ===
export const getCategories = () => apiClientInstance.get('/helpdesk/categories/')

// === КОММЕНТАРИИ ===
export const getTicketComments = (ticketId) => apiClientInstance.get(`/helpdesk/tickets/${ticketId}/comments/`)
export const addTicketComment = (ticketId, text) => apiClientInstance.post(`/helpdesk/tickets/${ticketId}/comments/`, { content: text })

// === ИНЖЕНЕРЫ (для назначения) ===
// Вызываем эндпоинт инженеров, чтобы получить список кандидатов
export const getEngineers = () => apiClientInstance.get('/helpdesk/engineers/')


export const getCurrentUser = () => {
  return apiClientInstance.get('/helpdesk/users/me/');
};

export const getMembers = (orgId) => {
    return apiClientInstance.get(`${serverApi}/helpdesk/organizations/${orgId}/members/`)
}

export const removeTicketAssignee = (id) => {
  return apiClientInstance.post(`/helpdesk/tickets/${id}/remove_assignee/`, {})
}

export const updateTicketStatus = (id, status) => {
  return apiClientInstance.patch(`/helpdesk/tickets/${id}/`, { status })
}


export const deleteTicketComment = (ticketId, commentId) => {
  return apiClientInstance.delete(`/helpdesk/tickets/${ticketId}/comments/${commentId}/`)
}

export const updateTicketComment = (ticketId, commentId, text) => {
    return apiClientInstance.patch(`/helpdesk/tickets/${ticketId}/comments/${commentId}/`, {
        text: text
    })
}

export const getCategoryDetails = (id) => apiClientInstance.get(`/helpdesk/categories/${id}/`)
export const createCategory = (data) => apiClientInstance.post('/helpdesk/categories/', data)
export const updateCategory = (id, data) => apiClientInstance.patch(`/helpdesk/categories/${id}/`, data)
export const deleteCategory = (id) => apiClientInstance.delete(`/helpdesk/categories/${id}/`)

export const getComments = (params = {}) => apiClientInstance.get('/helpdesk/comments/', { params })
export const createComment = (data) => apiClientInstance.post('/helpdesk/comments/', data)
export const updateComment = (id, data) => apiClientInstance.patch(`/helpdesk/comments/${id}/`, data)
export const deleteComment = (id) => apiClientInstance.delete(`/helpdesk/comments/${id}/`)

export const getSessions = (params = {}) => apiClientInstance.get('/helpdesk/sessions/', { params })
export const createSession = (data) => apiClientInstance.post('/helpdesk/sessions/', data)
export const updateSession = (id, data) => apiClientInstance.patch(`/helpdesk/sessions/${id}/`, data)
export const deleteSession = (id) => apiClientInstance.delete(`/helpdesk/sessions/${id}/`)
export const endSession = (id) => apiClientInstance.post(`/helpdesk/sessions/${id}/end_session/`)

export const getResolutions = (params = {}) => apiClientInstance.get('/helpdesk/resolutions/', { params })
export const createResolution = (data) => apiClientInstance.post('/helpdesk/resolutions/', data)
export const updateResolution = (id, data) => apiClientInstance.patch(`/helpdesk/resolutions/${id}/`, data)
export const deleteResolution = (id) => apiClientInstance.delete(`/helpdesk/resolutions/${id}/`)

export const getKBArticles = (params = {}) => apiClientInstance.get('/helpdesk/kb-articles/', { params })
export const getKBArticleDetails = (id) => apiClientInstance.get(`/helpdesk/kb-articles/${id}/`)
export const createKBArticle = (data) => apiClientInstance.post('/helpdesk/kb-articles/', data)
export const updateKBArticle = (id, data) => apiClientInstance.patch(`/helpdesk/kb-articles/${id}/`, data)
export const deleteKBArticle = (id) => apiClientInstance.delete(`/helpdesk/kb-articles/${id}/`)
export const voteKBArticle = (id, data) => apiClientInstance.post(`/helpdesk/kb-articles/${id}/vote/`, data)

// KB proactive suggestions for a ticket (engineer assignee / admin)
export const getKBSuggest = (ticketId) =>
  apiClientInstance.get('/helpdesk/kb/suggest/', { params: { ticket_id: ticketId } })

export const getNotifications = (params = {}) => apiClientInstance.get('/helpdesk/notifications/', { params })
export const markAllNotificationsRead = () => apiClientInstance.post('/helpdesk/notifications/mark_all_read/')
export const markNotificationRead = (id) => apiClientInstance.post(`/helpdesk/notifications/${id}/mark_read/`)
export const deleteNotification = (id) => apiClientInstance.delete(`/helpdesk/notifications/${id}/`)

export const getPriorities = () => apiClientInstance.get('/helpdesk/priorities/');
export const createPriority = (data) => apiClientInstance.post('/helpdesk/priorities/', data);
export const updatePriority = (id, data) => apiClientInstance.patch(`/helpdesk/priorities/${id}/`, data);
export const deletePriority = (id) => apiClientInstance.delete(`/helpdesk/priorities/${id}/`);

/** Правила авто-классификации тикетов (MongoDB), только admin */
export const getClassificationRules = () =>
  apiClientInstance.get('/helpdesk/classification-rules/');
export const createClassificationRule = (data) =>
  apiClientInstance.post('/helpdesk/classification-rules/', data);
export const updateClassificationRule = (id, data) =>
  apiClientInstance.patch(`/helpdesk/classification-rules/${id}/`, data);
export const deleteClassificationRule = (id) =>
  apiClientInstance.delete(`/helpdesk/classification-rules/${id}/`);

export const getShifts = (params = {}) => apiClientInstance.get('/helpdesk/shifts/', { params });
export const createShift = (data) => apiClientInstance.post('/helpdesk/shifts/', data);
export const updateShift = (id, data) => apiClientInstance.patch(`/helpdesk/shifts/${id}/`, data);
export const deleteShift = (id) => apiClientInstance.delete(`/helpdesk/shifts/${id}/`);
export const getTodayShifts = () => apiClientInstance.get('/helpdesk/shifts/today/');

// NOTE: older exports below referenced axiosInstance which isn't defined in this file.
// Keep them disabled to avoid runtime errors if imported.


export const getSystemMetrics = () => {
  // Обрати внимание на путь, в логах у тебя /helpdesk/api/metrics/
  return apiClientInstance.get('/helpdesk/api/metrics/'); 
};
