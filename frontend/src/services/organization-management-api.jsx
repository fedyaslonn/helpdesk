import { serverApi } from '../contants'
import axios from 'axios'

const api = axios.create({
  baseURL: serverApi,
  headers: { "Content-Type": "application/json" },
})

export const createOrganization = (orgData) => {
  return api.post('/organizations/organizations_list/', orgData)
}

export const getOrganizations = () => {
  return api.get('helpdesk/organizations/organizations_list/')
}

export default api
