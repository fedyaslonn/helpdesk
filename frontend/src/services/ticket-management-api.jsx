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
