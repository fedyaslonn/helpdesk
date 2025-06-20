import { useState, useEffect } from "react"
import "../styles/OrganizationApplications.css"
import {
  getOrganizationApplications,
  acceptOrganizationApplication,
  rejectOrganizationApplication,
} from "../services/organization-management-api"

function OrganizationApplications() {
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingIds, setProcessingIds] = useState(new Set())

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const response = await getOrganizationApplications()
      setApplications(response.data.application || [])
      setError(null)
    } catch (error) {
      console.error("Failed to load applications", error)
      if (error.response?.status === 403) {
        setError("You must be an admin to view applications")
      } else if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to load applications")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptApplication = async (applicationId) => {
    setProcessingIds((prev) => new Set(prev).add(applicationId))

    try {
      const response = await acceptOrganizationApplication(applicationId)
      setApplications((prev) => prev.filter((app) => app.id !== applicationId))
      alert(response.data.message || "Application accepted successfully!")
    } catch (error) {
      console.error("Failed to accept application", error)
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`)
      } else {
        alert("Failed to accept application")
      }
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(applicationId)
        return newSet
      })
    }
  }

  const handleRejectApplication = async (applicationId) => {
    const reason = prompt("Enter rejection reason (optional):")

    setProcessingIds((prev) => new Set(prev).add(applicationId))

    try {
      const response = await rejectOrganizationApplication(applicationId, {
        reason: reason || "No reason provided",
      })

      setApplications((prev) => prev.filter((app) => app.id !== applicationId))
      alert(response.data.message || "Application rejected successfully!")
    } catch (error) {
      console.error("Failed to reject application", error)
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`)
      } else {
        alert("Failed to reject application")
      }
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(applicationId)
        return newSet
      })
    }
  }

  const getFullName = (application) => {
    return application.username || `User ${application.user}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    )
  }

  const getTimeSinceApplication = (dateString) => {
    const now = new Date()
    const applicationDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - applicationDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Less than 1 hour ago"
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending"
      case "approved":
        return "status-approved"
      case "rejected":
        return "status-rejected"
      default:
        return "status-pending"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "⏳"
      case "approved":
        return "✅"
      case "rejected":
        return "❌"
      default:
        return "⏳"
    }
  }

  if (isLoading) {
    return (
      <div className="applications-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading applications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="applications-container">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Applications</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchApplications}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="applications-container">
      <div className="page-header">
        <h1 className="page-title">Organization Applications</h1>
        <div className="header-info">
          <span className="applications-count">
            {applications.length} pending application{applications.length !== 1 ? "s" : ""}
          </span>
          <button className="btn btn-secondary" onClick={fetchApplications}>
            <svg className="refresh-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Pending Applications</h3>
          <p>There are currently no pending applications for your organization.</p>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((application) => (
            <div key={application.id} className="application-card">
              <div className="application-header">
                <div className="user-info">
                  <div className="user-avatar">
                    {application.username ? application.username[0].toUpperCase() : "U"}
                  </div>
                  <div className="user-details">
                    <h3 className="user-name">{getFullName(application)}</h3>
                    <p className="user-username">@{application.username}</p>
                    <p className="organization-name">→ {application.organization_name}</p>
                  </div>
                </div>
                <div className="application-meta">
                  <div className="application-status">
                    <span className={`status-badge ${getStatusBadgeClass(application.status)}`}>
                      {getStatusIcon(application.status)} {application.status_display}
                    </span>
                  </div>
                  <div className="application-time">
                    <p className="applied-date">Applied: {formatDate(application.applied_at)}</p>
                    <p className="time-since">{getTimeSinceApplication(application.applied_at)}</p>
                  </div>
                </div>
              </div>

              {application.status === "pending" && (
                <div className="application-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handleAcceptApplication(application.id)}
                    disabled={processingIds.has(application.id)}
                  >
                    {processingIds.has(application.id) ? (
                      <>
                        <div className="btn-spinner"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleRejectApplication(application.id)}
                    disabled={processingIds.has(application.id)}
                  >
                    {processingIds.has(application.id) ? (
                      <>
                        <div className="btn-spinner"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </>
                    )}
                  </button>
                </div>
              )}

              {application.status !== "pending" && (
                <div className="application-processed">
                  <div className="processed-info">
                    <span className="processed-label">
                      {application.status === "approved" ? "✅ Approved" : "❌ Rejected"}
                    </span>
                    <span className="processed-date">on {formatDate(application.updated_at)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OrganizationApplications
