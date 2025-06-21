import { serverApi } from '../contants'
import { apiClientInstance } from '../api/ApiClient'
import axios from "axios"

export const getUserById = (userId) => {
  return axios.get(`${serverApi}/helpdesk/users/${userId}/`)
}


export const createUser = (userData) => {
  return axios.post(`${serverApi}/helpdesk/users/users_list/`, userData);
}

const api = axios.create({
  baseURL: serverApi,
  headers: { "Content-Type": "application/json" },
})

export const getUsers = () => {
  return axios.get(`${serverApi}/helpdesk/users/users_list/`)
}

export const getCurrentUser = () => {
  return apiClientInstance.get(`${serverApi}/helpdesk/users/me/`)
}

export const updateUser = (userId, data) => {
  return apiClientInstance.patch(`${serverApi}/helpdesk/users/${userId}/`, data);
}

export const updatePassword = (userId, data) => {
  return apiClientInstance.post(
    `${serverApi}/helpdesk/users/${userId}/update_password/`,
    data
  );
}

export const assignAdmin = (userId, organizationId) => {
    return apiClientInstance.post(`${serverApi}/helpdesk/users/${userId}/assign_to_admin/`,
        {
        user_id: userId,
        organization_id: organizationId
      }
  )
}
