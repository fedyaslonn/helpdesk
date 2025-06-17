import { serverApi } from '../contants'
import { apiClientInstance } from '../api/ApiClient'
import { useAuth } from '../auth/AuthContext'


export const getOrganizations = () => {
  return apiClientInstance.get(`${serverApi}/helpdesk/organizations/organizations_list/`)
}

export const getUsers = () => {
  return apiClientInstance.get(`${serverApi}/helpdesk/users/users_list/`)
}

export const createTicket = (ticketData) => {
  return apiClientInstance.post(`${serverApi}/helpdesk/tickets/tickets_list/`, ticketData)
}

export const getTickets = (params = {}) => {
  return apiClientInstance.get('/helpdesk/tickets/tickets_list/', { params });
};

export const getCurrentUser = () => {
  return apiClientInstance.get('/helpdesk/users/me/');
};

export const getTicket = (id) => {
  return apiClientInstance.get(`${serverApi}/helpdesk/tickets/${id}/`)
}

export const updateTicket = (id, data) => {
    return apiClientInstance.put(`${serverApi}/helpdesk/tickets/${id}/`, data)
}

export const getMembers = (orgId) => {
    return apiClientInstance.get(`${serverApi}/helpdesk/organizations/${orgId}/members/`)
}

export const getTicketComments = (id) => {
  return apiClientInstance.get(`/helpdesk/tickets/${id}/comments/`)
}

export const removeTicketAssignee = (id) => {
  return apiClientInstance.post(`/helpdesk/tickets/${id}/remove_assignee/`, {})
}

export const updateTicketStatus = (id, status) => {
  return apiClientInstance.patch(`/helpdesk/tickets/${id}/`, { status })
}

export const addTicketComment = (id, text) => {
  return apiClientInstance.post(`/helpdesk/tickets/${id}/comments/`, { text })
}

export const deleteTicketComment = (ticketId, commentId) => {
  return apiClientInstance.delete(`/helpdesk/tickets/${ticketId}/comments/${commentId}/`)
}

export const getTicketDetails = (id) => {
  return apiClientInstance.get(`/helpdesk/tickets/${id}/`)
}
