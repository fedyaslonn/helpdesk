"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import UpdateShiftModal from "./ShiftManagement"
import { apiClientInstance } from '../api/ApiClient'
import { serverApi } from '../contants'

function OrganizationMembersPage() {
  const { organizationId } = useParams()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedMembership, setSelectedMembership] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [organizationInfo, setOrganizationInfo] = useState(null)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await apiClientInstance.get(`${serverApi}/helpdesk/organizations/${organizationId}/members/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        })

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

  const handleEditShift = (membership) => {
    console.log("Editing shift for membership:", membership)
    setSelectedMembership(membership)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedMembership(null)
  }

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
    <div className="organization-members-container">
      <div className="header">
        <div className="header-content">
          <h2>Organization Members</h2>
          {organizationInfo && (
            <div className="organization-info">
              <span className="org-name">{organizationInfo.name}</span>
              <span className="org-id">ID: {organizationInfo.id}</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← Back
          </button>
          <button onClick={() => navigate("/organizations/shift-management")} className="btn-shift-management">
            Shift Management
          </button>
        </div>
      </div>

      {members.length > 0 && (
        <div className="members-stats">
          <div className="stat-card">
            <h4>Total Members</h4>
            <span className="stat-number">{members.length}</span>
          </div>
          <div className="stat-card">
            <h4>With Shifts</h4>
            <span className="stat-number">{members.filter((m) => m.shift_start && m.shift_end).length}</span>
          </div>
          <div className="stat-card">
            <h4>Without Shifts</h4>
            <span className="stat-number">{members.filter((m) => !m.shift_start || !m.shift_end).length}</span>
          </div>
          <div className="stat-card">
            <h4>Admins</h4>
            <span className="stat-number">{members.filter((m) => m.role === "admin").length}</span>
          </div>
          <div className="stat-card">
            <h4>Workers</h4>
            <span className="stat-number">{members.filter((m) => m.role === "worker").length}</span>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="empty-state">
          <h3>No members found</h3>
          <p>This organization doesn't have any members yet.</p>
        </div>
      ) : (
        <div className="table-container">
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
                <tr key={membership.user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {membership.user.username ? membership.user.username[0].toUpperCase() : "?"}
                      </div>
                      <div className="user-details">
                        <div className="username">{getFullName(membership.user)}</div>
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
                    <span className={`role-badge role-${membership.role}`}>{membership.role_display}</span>
                  </td>
                  <td>
                    <span className={`shift-time ${!membership.shift_start ? "not-set" : ""}`}>
                      {formatTime(membership.shift_start)}
                    </span>
                  </td>
                  <td>
                    <span className={`shift-time ${!membership.shift_end ? "not-set" : ""}`}>
                      {formatTime(membership.shift_end)}
                    </span>
                  </td>
                  <td>
                    <span className="last-login">{getLastLogin(membership.user)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${membership.is_active ? "active" : "inactive"}`}>
                      {membership.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEditShift(membership)}
                      className="btn-edit"
                      disabled={!membership.is_active}
                      title={!membership.is_active ? "Cannot edit inactive member" : "Edit shift"}
                    >
                      {!membership.is_active ? "🚫" : "✏️"} Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedMembership && (
        <UpdateShiftModal membership={selectedMembership} onClose={handleCloseModal} onSave={handleShiftUpdate} />
      )}
    </div>
  )
}

export default OrganizationMembersPage
