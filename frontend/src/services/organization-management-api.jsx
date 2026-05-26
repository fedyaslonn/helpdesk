import { serverApi } from '../contants'
import { apiClientInstance } from '../api/ApiClient'
import { useAuth } from '../auth/AuthContext'


export const createOrganization = (orgData) => {
  return apiClientInstance.post('helpdesk/organizations/organizations_list/', orgData)
}

export const getOrganizations = () => {
  return apiClientInstance.get('helpdesk/organizations/organizations_list/')
}

export const applyForOrganization = (userId, organizationId) => {
  return apiClientInstance.post(`${serverApi}/helpdesk/users/${userId}/apply_for_organization/`, {
    organization_id: organizationId,
  })
}

export const leaveOrganizationAPI = (userId) => {
  return apiClientInstance.post(`/helpdesk/users/${userId}/leave_organization/`)
}

export const getOrganizationApplications = () => {
  return apiClientInstance.get("/helpdesk/applications/organization_applications/")
}

export const acceptOrganizationApplication = (applicationId) => {
  return apiClientInstance.post(`/helpdesk/applications/${applicationId}/accept_application/`)
}

export const rejectOrganizationApplication = (applicationId, data = {}) => {
  return apiClientInstance.post(`/helpdesk/applications/${applicationId}/reject_application/`, data)
}

export const createOrganizationApplication = (organizationId) => {
  return apiClientInstance.post("/helpdesk/applications/", {
    organization_id: organizationId,
  })
}

export const getMyApplications = () => {
  return apiClientInstance.get("/helpdesk/applications/my_applications/")
}


export const cancelApplication = (applicationId) => {
  return apiClientInstance.delete(`/helpdesk/applications/${applicationId}/`)
}

export const getOrganization = (organizationId) => {
  return apiClientInstance.get(`${serverApi}/helpdesk/organizations/${organizationId}/`);
}

export const updateOrganization = (organizationId, data) => {
  return apiClientInstance.patch(`${serverApi}/helpdesk/organizations/${organizationId}/`, data);
}
