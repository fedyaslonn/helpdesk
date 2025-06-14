import { serverApi } from '../contants'
import { apiClientInstance } from '../api/ApiClient'
import { useAuth } from '../auth/AuthContext'


export const createOrganization = (orgData) => {
  return apiClientInstance.post('helpdesk/organizations/organizations_list/', orgData)
}

export const getOrganizations = () => {
  return apiClientInstance.get('helpdesk/organizations/organizations_list/')
}
