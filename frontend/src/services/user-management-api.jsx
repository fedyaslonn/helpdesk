import { serverApi } from '../contants'
import axios from "axios"

export const getUserById = (userId) => {
  return axios.get(`${serverApi}/helpdesk/users/${userId}/`)
}

export const updateUser = (userId, userData) => {
  return axios.patch(`${serverApi}/helpdesk/users/${userId}/`, userData)
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
