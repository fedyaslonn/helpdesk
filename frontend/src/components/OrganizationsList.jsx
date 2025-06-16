import { useEffect, useState } from "react"
import axios from "axios"
import '../styles/OrganizationsList.css'
import { serverApi } from '../contants'
import { getOrganizations } from '../services/organization-management-api'

const api = axios.create({
  baseURL: `${serverApi}`,
  headers: { "Content-Type": "application/json" },
})

function OrganizationsList() {
  const [organizations, setOrganizations] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrganizations = () => {
      setIsLoading(true)
      getOrganizations()
        .then(({ data }) => {
          setOrganizations(data)
          setError(null);
        })
        .catch(() => {
          setError("Failed to load organizations");
        })
        .finally(() => {
          setIsLoading(false);
        })
    }

    fetchOrganizations()
  }, [])

  if (error) return <div className="error-message">{error}</div>
  if (isLoading) return <div className="loading">Loading...</div>
  if (organizations.length === 0) return <div className="no-data">No organizations found</div>

  return (
    <div className="organizations-container">
      <h1>Organizations List</h1>

  {organizations.length === 0 ? (
    <div className="empty-state">
      <h3>No Organizations Found</h3>
      <p>There are currently no organizations to display.</p>
    </div>
  ) : (
    <div className="organizations-table">
      {organizations.map((org) => (
        <div key={org.id} className="organization-row">
          <div className="org-info">
            <div className="org-name">{org.name}</div>
            <div className="org-email">{org.email}</div>
          </div>

          <div className="org-status">
            {org.is_active ? (
              <span className="status-active">Active</span>
            ) : (
              <span className="status-inactive">Inactive</span>
            )}
          </div>

          <div className="org-members">
            <strong>Members:</strong>
            {org.members?.length > 0 ? (
              org.members.map((member) => <div key={member.id}>{member.username || member.email}</div>)
            ) : (
              <span className="no-members">No members</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
  )
  }

export default OrganizationsList
