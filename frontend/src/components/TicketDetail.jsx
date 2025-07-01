import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { apiClientInstance } from "../api/ApiClient"
import { getMembers, getTicketComments, removeTicketAssignee, updateTicketStatus, addTicketComment, deleteTicketComment, getTicketDetails } from "../services/ticket-management-api.jsx"
import "../styles/TicketDetails.css"
import "../styles/Comments.css"

const TicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [statusUpdateError, setStatusUpdateError] = useState(null)
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigneeCandidates, setAssigneeCandidates] = useState([])
  const [selectedAssignee, setSelectedAssignee] = useState(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [assignSuccess, setAssignSuccess] = useState(null)
  const [comments, setComments] = useState([])
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState(null)
  const [newComment, setNewComment] = useState("")
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState("")

  const handleEditClick = () => {
    navigate(`/helpdesk/tickets/${id}/update`)
  }

  const openAssignModal = async () => {
    setIsAssignModalOpen(true)
    setAssignError(null)
    setAssignSuccess(null)

    if (ticket.organization?.id) {
      await loadAssigneeCandidates()
    }
  }

  const loadAssigneeCandidates = async () => {
    if (!ticket?.organization?.id) {
      setAssignError("Organization ID is missing")
      return
    }

    try {
      const response = await getMembers(ticket.organization.id)

      if (!response.data.length) {
        setAssignError("No active members found")
      } else {
        setAssignError(null)
      }

      setAssigneeCandidates(response.data)
      console.log("Assignee candidates:", response.data)
    } catch (error) {
      console.error("Failed to load members:", error)

      if (error.response?.status === 403) {
        setAssignError("Access denied")
      } else if (error.response?.status === 404) {
        setAssignError("Organization not found")
      } else {
        setAssignError("Loading error. Try again later")
      }
    }
  }

  const handleAssignSave = async () => {
    try {
      setIsAssigning(true)
      setAssignError(null)

      const endpoint = ticket.assignee
        ? `/helpdesk/tickets/${id}/change_assignee/`
        : `/helpdesk/tickets/${id}/set_assignee/`

      const requestData = ticket.assignee
        ? { old_assignee: ticket.assignee.id, new_assignee: selectedAssignee }
        : { assignee: selectedAssignee }

      const response = await apiClientInstance.post(endpoint, requestData)

      setTicket(response.data)
      setAssignSuccess("Assignee updated successfully")
      setTimeout(() => {
        setIsAssignModalOpen(false)
        setAssignSuccess(null)
      }, 1500)
    } catch (error) {
      console.error("Failed to assign ticket", error)

      let errorMessage = "Failed to assign ticket"
      if (error.response) {
        if (error.response.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response.data?.new_assignee) {
          errorMessage = error.response.data.new_assignee.join(", ")
        }
      }

      setAssignError(errorMessage)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveAssignee = async () => {
    try {
      setIsAssigning(true)
      setAssignError(null)

      const response = await removeTicketAssignee(id)

      setTicket(response.data)
      setAssignSuccess("Assignee removed successfully")
      setTimeout(() => {
        setIsAssignModalOpen(false)
        setAssignSuccess(null)
      }, 1500)
    } catch (error) {
      console.error("Failed to remove assignee", error)

      let errorMessage = "Failed to remove assignee"
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      setAssignError(errorMessage)
    } finally {
      setIsAssigning(false)
    }
  }

  const fetchComments = async () => {
    if (!id) return

    try {
      setIsCommentsLoading(true)
      setCommentsError(null)
      const response = await getTicketComments(id)
      setComments(response.data)
    } catch (err) {
      setCommentsError("Failed to load comments")
      console.error("Error loading comments:", err)
    } finally {
      setIsCommentsLoading(false)
    }
  }


  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await getTicketDetails(id)
        const ticketData = response.data
        setTicket(ticketData)

        if (ticketData?.organization?.id) {
          try {
            const adminCheckResponse = await apiClientInstance.get(`/helpdesk/tickets/${id}/check_admin/`)
            setIsOrgAdmin(adminCheckResponse.data.is_admin)
          } catch (err) {
            console.error("Error checking admin status:", err)
            setIsOrgAdmin(false)
          }
        } else {
          setIsOrgAdmin(false)
        }
      } catch (err) {
        console.error("Error loading ticket:", err)

        if (err.response?.status === 404) {
          setError({
            type: "not_found",
            title: "Ticket Not Found",
            message: "The requested ticket could not be found or you don't have permission to view it.",
            icon: "🔍",
          })
        } else if (err.response?.status === 403) {
          setError({
            type: "forbidden",
            title: "Access Denied",
            message: "You don't have permission to view this ticket.",
            icon: "🚫",
          })
        } else if (err.response?.status >= 500) {
          setError({
            type: "server_error",
            title: "Server Error",
            message: "We're experiencing technical difficulties. Please try again later.",
            icon: "⚠️",
          })
        } else {
          setError({
            type: "unknown",
            title: "Error Loading Ticket",
            message: "Failed to load ticket details. Please try again.",
            icon: "❌",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchTicket()
    }
  }, [id, user])


  useEffect(() => {
    if (ticket && id) {
      fetchComments()
    }
  }, [ticket, id])

  const getStatusConfig = (status) => {
    const statusMap = {
      OP: {
        label: "Open",
        className: "status-open",
        icon: "🔴",
        color: "#dc2626",
      },
      IP: {
        label: "In Progress",
        className: "status-in-progress",
        icon: "🟡",
        color: "#d97706",
      },
      RS: {
        label: "Resolved",
        className: "status-resolved",
        icon: "🟢",
        color: "#16a34a",
      },
      WR: {
        label: "Waiting for Requestor",
        className: "status-waiting",
        icon: "🔵",
        color: "#2563eb",
      },
    }
    return (
      statusMap[status] || {
        label: status,
        className: "status-default",
        icon: "⚪",
        color: "#6b7280",
      }
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdating(true)
      setStatusUpdateError(null)

      const response = await updateTicketStatus(id, newStatus)

      setTicket((prev) => ({ ...prev, status: newStatus }))

      setStatusUpdateSuccess(`Status changed to ${getStatusConfig(newStatus).label}`)
      setTimeout(() => setStatusUpdateSuccess(null), 3000)
    } catch (err) {
      console.error("Error updating status:", err)

      let errorMessage = "Failed to update status"

      if (err.response) {
        if (err.response.status === 400) {
          if (err.response.data?.status) {
            errorMessage = `Status error: ${err.response.data.status.join(", ")}`
          } else if (err.response.data?.non_field_errors) {
            errorMessage = err.response.data.non_field_errors.join(", ")
          }
        } else if (err.response.status === 403) {
          errorMessage = "You don't have permission to change the status"
        }
      }

      setStatusUpdateError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const canUpdateTicket = () => {
    if (!ticket || !user) return false
    const isAssignee = ticket.assignee?.id === user.id
    return isAssignee || isOrgAdmin
  }

  const canEditTicket = () => {
    if (!ticket || !user) return false
    return ticket.requestor?.id === user.id
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
        const response = await addTicketComment(id, newComment)

      setComments([response.data, ...comments])
      setNewComment("")
    } catch (err) {
      console.error("Failed to add comment", err)
      setCommentsError("Failed to add comment")
    }
  }

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim()) return

    try {
      const response = await updateTicketComment(id, commentId, editingCommentText)

      setComments(comments.map((comment) => (comment.id === commentId ? response.data : comment)))
      setEditingCommentId(null)
      setEditingCommentText("")
    } catch (err) {
      console.error("Failed to update comment", err)
      setCommentsError("Failed to update comment")
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return

    try {
      await apiClientInstance.delete(`/helpdesk/tickets/${id}/comments/${commentId}/`)
      setComments(comments.filter((comment) => comment.id !== commentId))
    } catch (err) {
      console.error("Failed to delete comment", err)
      setCommentsError("Failed to delete comment")
    }
  }

  const startEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const cancelEdit = () => {
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const getAvailableStatusTransitions = () => {
    if (!ticket) return []

    const currentStatus = ticket.status
    const allStatuses = [
      { value: "OP", label: "Open", icon: "🔴" },
      { value: "IP", label: "In Progress", icon: "🟡" },
      { value: "WR", label: "Waiting for Requestor", icon: "🔵" },
      { value: "RS", label: "Resolved", icon: "🟢" },
    ]

    return allStatuses.filter((status) => status.value !== currentStatus)
  }

  if (isLoading) {
    return (
      <div className="ticket-detail-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading ticket details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ticket-detail-container">
        <div className="error-message">
          <div className="error-icon">{error.icon}</div>
          <h3>{error.title}</h3>
          <p>{error.message}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => navigate("/helpdesk/tickets")}>
              Back to Tickets
            </button>
            {error.type !== "not_found" && error.type !== "forbidden" && (
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-container">
        <div className="error-message">
          <div className="error-icon">📋</div>
          <h3>No Ticket Data</h3>
          <p>Unable to load ticket information.</p>
          <button className="btn btn-primary" onClick={() => navigate("/helpdesk/tickets")}>
            Back to Tickets
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(ticket.status)

  return (
    <div className="ticket-detail-container">

      {isAssignModalOpen && (
        <div className="modal-overlay">
          <div className="assign-modal">
            <div className="modal-header">
              <h3>Assign Ticket</h3>
              <button className="close-btn" onClick={() => setIsAssignModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              {assignError && <div className="alert alert-danger">{assignError}</div>}

              {assignSuccess && <div className="alert alert-success">{assignSuccess}</div>}

              <div className="form-group">
                <label>Select Assignee</label>
                <select
                  className="form-select"
                  value={selectedAssignee || ""}
                  onChange={(e) => setSelectedAssignee(Number(e.target.value))}
                  disabled={isAssigning}
                >
                  <option value="">Select Assignee</option>
                  {assigneeCandidates.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.username} ({member.role_display})
                    </option>
                  ))}
                </select>
              </div>

              <div className="current-assignee">
                {ticket.assignee && (
                  <p>
                    Current assignee: <strong>{ticket.assignee.username}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {ticket.assignee && (
                <button className="btn btn-danger" onClick={handleRemoveAssignee} disabled={isAssigning}>
                  {isAssigning ? "Removing..." : "Remove Assignee"}
                </button>
              )}

              <button
                className="btn btn-primary"
                onClick={handleAssignSave}
                disabled={isAssigning || !selectedAssignee}
              >
                {isAssigning ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="ticket-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/helpdesk/tickets")}>
            <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tickets
          </button>
          <div className="ticket-id">Ticket #{ticket.id}</div>
        </div>
        <div className="header-actions">
          {isOrgAdmin && (
            <button className="btn btn-primary" onClick={openAssignModal}>
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Assign
            </button>
          )}

          {canEditTicket() && (
            <button className="btn btn-secondary" onClick={handleEditClick}>
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>


      <div className="ticket-content">

        <div className="ticket-card main-card">
          <div className="card-header">
            <h1 className="ticket-title">{ticket.title}</h1>
            <div className={`status-badge ${statusConfig.className}`}>
              <span className="status-icon">{statusConfig.icon}</span>
              <span className="status-text">{statusConfig.label}</span>
            </div>
          </div>
        </div>

        <div className="content-grid">

          <div className="ticket-card description-card">
            <div className="card-header">
              <h3 className="card-title">
                <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Description
              </h3>
            </div>
            <div className="card-content">
              <p className="description-text">{ticket.description}</p>
            </div>
          </div>

          <div className="ticket-card details-card">
            <div className="card-header">
              <h3 className="card-title">
                <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Ticket Details
              </h3>
            </div>
            <div className="card-content">
              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Requestor
                </div>
                <div className="detail-value">
                  <div className="user-info">
                    <div className="user-avatar">{ticket.requestor?.username?.charAt(0).toUpperCase() || "?"}</div>
                    <span>{ticket.requestor?.username || "Unknown"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z"
                    />
                  </svg>
                  Assignee
                </div>
                <div className="detail-value">
                  {ticket.assignee ? (
                    <div className="user-info">
                      <div className="user-avatar assigned">{ticket.assignee.username.charAt(0).toUpperCase()}</div>
                      <span>{ticket.assignee.username}</span>
                    </div>
                  ) : (
                    <span className="unassigned">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Organization
                </div>
                <div className="detail-value">
                  <span className="organization-name">{ticket.organization?.name || "N/A"}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Created
                </div>
                <div className="detail-value">
                  <span className="date-text">{formatDate(ticket.created_at)}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-label">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Last Updated
                </div>
                <div className="detail-value">
                  <span className="date-text">{formatDate(ticket.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>


        {canUpdateTicket() && (
          <div className="ticket-card actions-card">
            <div className="card-header">
              <h3 className="card-title">
                <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h3>
            </div>
            <div className="card-content">
              {statusUpdateError && <div className="alert alert-danger">{statusUpdateError}</div>}

              {statusUpdateSuccess && <div className="alert alert-success">{statusUpdateSuccess}</div>}

              <div className="status-actions">
                {getAvailableStatusTransitions().map((statusOption) => (
                  <button
                    key={statusOption.value}
                    className={`status-action-btn ${statusOption.value.toLowerCase()}`}
                    onClick={() => handleStatusChange(statusOption.value)}
                    disabled={isUpdating}
                  >
                    <span className="action-icon">{statusOption.icon}</span>
                    {isUpdating ? "Updating..." : `Mark ${statusOption.label}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}


        <div className="access-info">
          <div className="access-reason">
            <svg className="access-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              You have access to this ticket as{" "}
              {ticket.requestor?.id === user?.id
                ? "the requestor (can edit)"
                : ticket.assignee?.id === user?.id
                  ? "the assignee (can manage status)"
                  : isOrgAdmin
                    ? "an organization administrator (can assign)"
                    : "a viewer (limited access)"}
            </span>

            {statusUpdateError && statusUpdateError.includes("permission") && (
              <div className="access-error">
                <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {statusUpdateError}
              </div>
            )}
          </div>
        </div>

        <div className="ticket-card comments-card">
          <div className="card-header">
            <h3 className="card-title">
              <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Comments ({comments.length})
            </h3>
          </div>

          <div className="card-content">
            {commentsError && <div className="alert alert-danger">{commentsError}</div>}


            {user && (
              <div className="new-comment-form">
                <div className="comment-input-container">
                  <div className="comment-author-avatar">{user?.username?.charAt(0).toUpperCase() || "?"}</div>
                  <div className="comment-input-wrapper">
                    <textarea
                      className="comment-input"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows="3"
                    />
                    <div className="comment-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}


            <div className="comments-list">
              {isCommentsLoading ? (
                <div className="comments-loading">
                  <div className="spinner"></div>
                  <span>Loading comments...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="no-comments">
                  <div className="no-comments-icon">💬</div>
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">{comment.author?.username?.charAt(0).toUpperCase() || "?"}</div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <div className="comment-author">
                          <span className="author-name">{comment.author?.username || "Unknown"}</span>
                          <span className="comment-date">{formatDate(comment.created_at)}</span>
                          {comment.created_at !== comment.updated_at && (
                            <span className="comment-edited">(edited)</span>
                          )}
                        </div>
                        {user && user.id === comment.author?.id && (
                          <div className="comment-actions-menu">
                            {editingCommentId === comment.id ? (
                              <>
                                <button
                                  className="comment-action-btn"
                                  onClick={() => handleUpdateComment(comment.id)}
                                  disabled={!editingCommentText.trim()}
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </button>
                                <button className="comment-action-btn" onClick={cancelEdit}>
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="comment-action-btn" onClick={() => startEdit(comment)}>
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  className="comment-action-btn delete"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="comment-body">
                        {editingCommentId === comment.id ? (
                          <textarea
                            className="comment-edit-input"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            rows="3"
                          />
                        ) : (
                          <p className="comment-text">{comment.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketDetail
