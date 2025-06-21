import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom";
import "../styles/OrganizationsList.css"
import { getOrganizations, applyForOrganization, leaveOrganizationAPI } from "../services/organization-management-api"
import { getCurrentUser } from "../services/ticket-management-api"

function OrganizationsList() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [applicationStates, setApplicationStates] = useState({})
  const [applicationErrors, setApplicationErrors] = useState({})
  const [applicationSuccess, setApplicationSuccess] = useState({})
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [leaveSuccess, setLeaveSuccess] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [orgsResponse, userResponse] = await Promise.all([getOrganizations(), getCurrentUser()])

        setOrganizations(orgsResponse.data)
        setCurrentUser(userResponse.data)
        setError(null)
      } catch (err) {
        console.error("Failed to load data:", err)
        setError("Failed to load organizations")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCreateOrganization = () => {
    navigate("/organizations/create")
  }

  const handleViewMembers = (organizationId) => {
    navigate(`/organizations/${organizationId}/members`)
  }

  const handleApplyForOrganization = async (organizationId) => {
    if (!currentUser) return

    setApplicationStates((prev) => ({ ...prev, [organizationId]: true }))
    setApplicationErrors((prev) => ({ ...prev, [organizationId]: null }))
    setApplicationSuccess((prev) => ({ ...prev, [organizationId]: null }))

    try {
      await applyForOrganization(currentUser.id, organizationId)

      setApplicationSuccess((prev) => ({
        ...prev,
        [organizationId]: "Application submitted successfully!",
      }))

      setTimeout(() => {
        setApplicationSuccess((prev) => ({ ...prev, [organizationId]: null }))
      }, 3000)
    } catch (err) {
      console.error("Failed to apply for organization:", err)

      let errorMessage = "Failed to submit application"
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      }

      setApplicationErrors((prev) => ({ ...prev, [organizationId]: errorMessage }))

      setTimeout(() => {
        setApplicationErrors((prev) => ({ ...prev, [organizationId]: null }))
      }, 5000)
    } finally {
      setApplicationStates((prev) => ({ ...prev, [organizationId]: false }))
    }
  }

  const handleLeaveOrganization = async (organizationId) => {
    if (!currentUser) return;

    setIsLeaving(true);
    setLeaveError(null);
    setLeaveSuccess(null);

    try {
      const response = await leaveOrganizationAPI(currentUser.id);
      setCurrentUser(response.data);
      setLeaveSuccess("Successfully left organization");

      setTimeout(() => {
        setLeaveSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to leave organization:", err);
      setLeaveError(err.response?.data?.error || "Failed to leave organization");

      setTimeout(() => {
        setLeaveError(null);
      }, 5000);
    } finally {
      setIsLeaving(false);
    }
  }

  const canApplyToOrganization = (organization) => {
    if (!currentUser) return false

    if (currentUser.organization?.id === organization.id) return false

    return !currentUser.organization
  }

  const getUserOrganizationStatus = () => {
  }

  if (error) return <div className="error-message">{error}</div>
  if (isLoading) return <div className="loading">Loading...</div>
  if (organizations.length === 0) return (
    <div className="no-data">
      <p>No organizations found</p>
      <button
        className="create-org-btn"
        onClick={handleCreateOrganization}
      >
        Create New Organization
      </button>
    </div>
  )

  return (
    <div className="organizations-container">
      <div className="organizations-header">
        <h1>Organizations List</h1>
      </div>

      <div className="create-org-container">
        <button
          className="create-org-btn"
          onClick={handleCreateOrganization}
        >
          Create New Organization
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="empty-state">
          <h3>No Organizations Found</h3>
          <p>There are currently no organizations to display.</p>
          <button
            className="create-org-btn"
            onClick={handleCreateOrganization}
          >
            Create New Organization
          </button>
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
                <strong>Members ({org.members?.length || 0}):</strong>
                {org.members?.length > 0 ? (
                  <div className="members-list">
                    {org.members.slice(0, 3).map((member) => (
                      <div key={member.id} className="member-item">
                        {member.username || member.email}
                      </div>
                    ))}
                    {org.members.length > 3 && <div className="more-members">+{org.members.length - 3} more</div>}
                  </div>
                ) : (
                  <span className="no-members">No members</span>
                )}
              </div>

              <div className="org-actions">
                {currentUser?.organization?.id === org.id && (
                  <button
                    className="view-members-btn"
                    onClick={() => handleViewMembers(org.id)}
                  >
                    View Members
                  </button>
                )}
            {currentUser?.organization?.id === org.id ? (
                  <div className="current-org-actions">
                    <button
                      className="small-leave-btn"
                      onClick={handleLeaveOrganization}
                      disabled={isLeaving}
                    >
                      {isLeaving ? (
                        <>
                          <span className="small-spinner"></span>
                          Leaving...
                        </>
                      ) : "Leave Organization"}
                    </button>

                    {leaveError && <div className="leave-error">{leaveError}</div>}
                    {leaveSuccess && <div className="leave-success">{leaveSuccess}</div>}
                  </div>
                ) : canApplyToOrganization(org) ? (
                  <div className="apply-section">
                    <button
                      className="apply-btn"
                      onClick={() => handleApplyForOrganization(org.id)}
                      disabled={applicationStates[org.id] || !org.is_active}
                    >
                      {applicationStates[org.id] ? (
                        <>
                          <span className="spinner-small"></span>
                          Applying...
                        </>
                      ) : (
                        "Apply to Join"
                      )}
                    </button>

                    {applicationErrors[org.id] && <div className="application-error">{applicationErrors[org.id]}</div>}

                    {applicationSuccess[org.id] && (
                      <div className="application-success">{applicationSuccess[org.id]}</div>
                    )}
                  </div>
                ) : currentUser?.organization ? (
                  <div className="cannot-apply">
                    <span className="disabled-text">Leave current organization to apply</span>
                  </div>
                ) : !org.is_active ? (
                  <div className="cannot-apply">
                    <span className="disabled-text">Organization inactive</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
  }

export default OrganizationsList
