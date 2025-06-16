import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { getTicket, updateTicket } from "../services/ticket-management-api"
import "../styles/TicketUpdate.css"

const EditTicket = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })

  const [touched, setTouched] = useState({
    title: false,
    description: false,
  })

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await getTicket(id)
        const ticketData = response.data

        setTicket(ticketData)
        setFormData({
          title: ticketData.title || "",
          description: ticketData.description || "",
        })
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
            message: "You don't have permission to edit this ticket.",
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
  }, [id])


  const validateField = (name, value) => {
    switch (name) {
      case "title":
        if (!value.trim()) {
          return "Title is required"
        }
        if (value.length < 2) {
          return "Title must have at least 2 characters"
        }
        if (value.length > 52) {
          return "Title must not exceed 52 characters"
        }
        return ""

      case "description":
        if (!value.trim()) {
          return "Description is required"
        }
        if (value.length < 8) {
          return "Description must have at least 8 characters"
        }
        return ""

      default:
        return ""
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }

    if (error?.type === "validation") {
      setError(null)
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))

    const fieldError = validateField(name, value)
    setFormErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key])
      if (error) {
        newErrors[key] = error
      }
    })

    setFormErrors(newErrors)
    setTouched({
      title: true,
      description: true,
    })

    return Object.keys(newErrors).length === 0
  }

  const canEditTicket = () => {
    if (!ticket || !user) return false
    // Only the requestor can edit the ticket
    return ticket.requestor?.id === user.id
  }

  const hasChanges = () => {
    if (!ticket) return false
    return formData.title !== ticket.title || formData.description !== ticket.description
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!hasChanges()) {
      setError({
        type: "no_changes",
        title: "No Changes Made",
        message: "Please make some changes before saving.",
        icon: "ℹ️",
      })
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
        const response = await updateTicket(id, formData)


      navigate(`/helpdesk/tickets/${id}`, {
        state: { message: "Ticket updated successfully!" },
      })
    } catch (err) {
      setIsSubmitting(false)
      console.error("Error updating ticket:", err)

      if (err.response?.data?.error) {
        const errorData = err.response.data.error


        if (typeof errorData === "object" && !Array.isArray(errorData)) {
          setFormErrors(errorData)
          setError({
            type: "validation",
            title: "Validation Error",
            message: "Please fix the errors below and try again.",
            icon: "⚠️",
          })
        } else if (typeof errorData === "string") {
          if (errorData.includes("Only the ticket creator can update")) {
            setError({
              type: "forbidden",
              title: "Access Denied",
              message: "Only the ticket creator can edit this ticket.",
              icon: "🚫",
            })
          } else if (errorData.includes("User is not authenticated")) {
            setError({
              type: "auth_error",
              title: "Authentication Required",
              message: "Please log in to edit this ticket.",
              icon: "🔐",
            })
          } else if (errorData.includes("Integrity error")) {
            setError({
              type: "integrity_error",
              title: "Data Conflict",
              message: "There was a conflict with the data. Please refresh and try again.",
              icon: "⚠️",
            })
          } else if (errorData.includes("Database error")) {
            setError({
              type: "database_error",
              title: "Database Error",
              message: "We're experiencing technical difficulties. Please try again later.",
              icon: "🔧",
            })
          } else {
            setError({
              type: "server_error",
              title: "Update Failed",
              message: errorData,
              icon: "❌",
            })
          }
        }
      } else if (err.response?.status === 404) {
        setError({
          type: "not_found",
          title: "Ticket Not Found",
          message: "The ticket you're trying to edit no longer exists.",
          icon: "🔍",
        })
      } else if (err.response?.status === 403) {
        setError({
          type: "forbidden",
          title: "Access Denied",
          message: "You don't have permission to edit this ticket.",
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
          title: "Update Failed",
          message: "Failed to update ticket. Please try again.",
          icon: "❌",
        })
      }
    }
  }

  const handleCancel = () => {
    if (hasChanges()) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        navigate(`/helpdesk/tickets/${id}`)
      }
    } else {
      navigate(`/helpdesk/tickets/${id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="edit-ticket-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading ticket...</p>
        </div>
      </div>
    )
  }

  if (error && error.type !== "validation" && error.type !== "no_changes") {
    return (
      <div className="edit-ticket-container">
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
      <div className="edit-ticket-container">
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

  if (!canEditTicket()) {
    return (
      <div className="edit-ticket-container">
        <div className="error-message">
          <div className="error-icon">🚫</div>
          <h3>Access Denied</h3>
          <p>Only the ticket creator can edit this ticket.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/helpdesk/tickets/${id}`)}>
            View Ticket
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="edit-ticket-container">

      <div className="edit-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleCancel}>
            <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Ticket
          </button>
          <div className="edit-title">
            <h1>Edit Ticket #{ticket.id}</h1>
            <p>Update the title and description of your ticket</p>
          </div>
        </div>
      </div>


      {error && (error.type === "validation" || error.type === "no_changes") && (
        <div className="error-alert">
          <div className="error-icon-small">{error.icon}</div>
          <div className="error-content">
            <h4>{error.title}</h4>
            <p>{error.message}</p>
          </div>
        </div>
      )}


      <div className="edit-form-card">
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-input ${formErrors.title ? "error" : ""} ${
                touched.title && !formErrors.title ? "valid" : ""
              }`}
              placeholder="Enter ticket title"
              disabled={isSubmitting}
              maxLength={52}
            />
            {formErrors.title && <span className="field-error">{formErrors.title}</span>}
            <div className="field-hint">{formData.title.length}/52 characters</div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-textarea ${formErrors.description ? "error" : ""} ${
                touched.description && !formErrors.description ? "valid" : ""
              }`}
              placeholder="Describe the issue in detail..."
              disabled={isSubmitting}
              rows={6}
            />
            {formErrors.description && <span className="field-error">{formErrors.description}</span>}
            <div className="field-hint">Minimum 8 characters ({formData.description.length} characters)</div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || Object.keys(formErrors).some((key) => formErrors[key]) || !hasChanges()}
            >
              {isSubmitting ? (
                <>
                  <div className="btn-spinner"></div>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>


      <div className="ticket-info-card">
        <div className="info-header">
          <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3>Ticket Information</h3>
        </div>
        <div className="info-content">
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`status-badge status-${ticket.status.toLowerCase()}`}>
              {ticket.status === "OP" && "Open"}
              {ticket.status === "IP" && "In Progress"}
              {ticket.status === "RS" && "Resolved"}
              {ticket.status === "WR" && "Waiting for Requestor"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Organization:</span>
            <span className="info-value">{ticket.organization?.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Assignee:</span>
            <span className="info-value">{ticket.assignee ? ticket.assignee.username : "Unassigned"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Created:</span>
            <span className="info-value">{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditTicket
