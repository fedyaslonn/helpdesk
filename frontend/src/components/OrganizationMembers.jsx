import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import UpdateShiftModal from "./ShiftManagement"
import { apiClientInstance } from '../api/ApiClient'
import { serverApi } from '../contants'
import "../styles/OrganizationMembersPage.css"
import { getMembers } from '../services/ticket-management-api'
import AdminAssignmentButton from '../components/AdminAssignmentButton'

function OrganizationMembersPage() {
  const { organizationId } = useParams()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedMembership, setSelectedMembership] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [organizationInfo, setOrganizationInfo] = useState(null)

  const handleEditShift = (membership) => {
    setSelectedMembership(membership);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMembership(null);
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await getMembers(organizationId)

        console.log("Members data:", response.data)
        const membersData = Array.isArray(response.data) ? response.data : []
        setMembers(membersData)

        if (membersData.length > 0) {
          setOrganizationInfo(membersData[0].organization)
        }

        setError("")
      } catch (err) {
        console.error("Error fetching members:", err)
        if (err.response?.status === 403) {
          setError("You don't have access to this organization")
        } else if (err.response?.status === 404) {
          setError("Organization not found")
        } else {
          setError("Failed to load organization members")
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (organizationId) {
      fetchMembers()
    }
  }, [organizationId])

  const handleAdminAssigned = (userId) => {
    setMembers(prevMembers =>
      prevMembers.map(member =>
        member.user.id === userId
          ? {
              ...member,
              role: 'admin',
              role_display: 'Admin'
            }
          : member
      )
    );
  };

  const handleShiftUpdate = async (userId, shiftData) => {
    try {
      const response = await apiClientInstance.post(`${serverApi}/helpdesk/users/${userId}/update_shifts/`, shiftData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Shift update response:", response.data)

      setMembers((prev) =>
        prev.map((member) =>
          member.user.id === userId
            ? {
                ...member,
                shift_start: shiftData.shift_start,
                shift_end: shiftData.shift_end,
              }
            : member,
        ),
      )

      return true
    } catch (err) {
      console.error("Failed to update shift:", err)
      return false
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return "Not set"

    return timeString.substring(0, 5)
  }

  const getFullName = (user) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
    return fullName || user.username
  }

  const getLastLogin = (user) => {
    if (!user.last_login) return "Never"

    const date = new Date(user.last_login)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading members...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="members-container">
      <div className="header-section">
        <div className="header-left">
          <h1 className="page-title">Organization Members</h1>
          {organizationInfo && (
            <div className="organization-info-card">
              <span className="org-name">{organizationInfo.name}</span>
            </div>
          )}
        </div>

        <div className="header-actions">
          <button onClick={() => navigate(-1)} className="btn back-btn">
            ← Back
          </button>
          <button
            onClick={() => navigate("/organizations/applications")}
            className="btn-applications"
          >
          Applications
         </button>
           <button
        onClick={() => navigate(`/organizations/${organizationId}/update`)}
        className="btn-update-org"
      >
        Update Organization
  </button>
        </div>
      </div>

      {members.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{members.length}</div>
            <div className="stat-label">Total Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{members.filter((m) => m.shift_start && m.shift_end).length}</div>
            <div className="stat-label">With Shifts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{members.filter((m) => !m.shift_start || !m.shift_end).length}</div>
            <div className="stat-label">Without Shifts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{members.filter((m) => m.role === "admin").length}</div>
            <div className="stat-label">Admins</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{members.filter((m) => m.role === "worker").length}</div>
            <div className="stat-label">Workers</div>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>No members found</h3>
          <p>This organization doesn't have any members yet.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Shift Start</th>
                <th>Shift End</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((membership) => (
                <tr key={membership.user.id} className={!membership.is_active ? "inactive-row" : ""}>
                  <td>
                    <div className="user-info">
                      <div className="avatar">
                        {membership.user.username ? membership.user.username[0].toUpperCase() : "?"}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{getFullName(membership.user)}</div>
                        <div className="user-handle">@{membership.user.username}</div>
                        <div className="user-id">ID: {membership.user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <a href={`mailto:${membership.user.email}`} className="email-link">
                      {membership.user.email}
                    </a>
                  </td>
                  <td>
                    <span className={`role-tag ${membership.role}`}>
                      {membership.role_display}
                    </span>
                  </td>
                  <td>
                    <span className={`shift-indicator ${!membership.shift_start ? "not-set" : ""}`}>
                      {formatTime(membership.shift_start)}
                    </span>
                  </td>
                  <td>
                    <span className={`shift-indicator ${!membership.shift_end ? "not-set" : ""}`}>
                      {formatTime(membership.shift_end)}
                    </span>
                  </td>
                  <td>
                    <span className="last-login">
                      {getLastLogin(membership.user)}
                    </span>
                  </td>
                  <td>
                    <div className={`status-indicator ${membership.is_active ? "active" : "inactive"}`}>
                      <div className="status-dot"></div>
                      {membership.is_active ? "Active" : "Inactive"}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEditShift(membership)}
                      className={`action-btn ${!membership.is_active ? "disabled" : ""}`}
                      disabled={!membership.is_active}
                      title={!membership.is_active ? "Cannot edit inactive member" : "Edit shift"}
                    >
                      <span className="edit-icon">✏️</span> Edit
                    </button>
                      {membership.role === 'worker' && membership.is_active && (
                        <AdminAssignmentButton
                          userId={membership.user.id}
                          organizationId={organizationId}
                          onSuccess={handleAdminAssigned}
                        />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedMembership && (
        <UpdateShiftModal
          membership={selectedMembership}
          onClose={handleCloseModal}
          onSave={handleShiftUpdate}
        />
      )}
    </div>
  )
}

export default OrganizationMembersPage
