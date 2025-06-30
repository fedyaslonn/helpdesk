import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { createOrganization } from "../services/organization-management-api"
import "../styles/OrganizationCreation.css"


const CreateOrganization = () => {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  const [touched, setTouched] = useState({
    name: false,
    email: false,
  })

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value.trim()) {
          return "Organization name is required"
        }
        if (value.length < 2) {
          return "Name must have at least 2 characters"
        }
        if (value.length > 52) {
          return "Name must not exceed 52 characters"
        }
        return ""

      case "email":
        if (!value.trim()) {
          return "Email is required"
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return "Please enter a valid email address"
        }
        if (value.length > 52) {
          return "Email must not exceed 52 characters"
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

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }


    if (generalError) {
      setGeneralError("")
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))

    const error = validateField(name, value)
    setErrors((prev) => ({
      ...prev,
      [name]: error,
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

    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
    })

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Submitting organization creation form");
    console.log("Form data:", formData);

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setGeneralError("")

    try {
      const response = await createOrganization(formData)
      console.log("Organization created successfully:", response.data);
      setIsSuccess(true)

      if (updateUser) {
        updateUser({
          ...user,
          organization: response.data,
        })
      }

      setTimeout(() => {
        navigate("/dashboard")
      }, 2000)
    } catch (error) {
      setIsLoading(false)

      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error

        if (typeof errorMessage === "object") {
          setErrors(errorMessage)
        } else if (typeof errorMessage === "string") {
          if (errorMessage.includes("already an admin or member")) {
            setGeneralError(
              "You are already a member of another organization. Please contact support if you need to switch organizations.",
            )
          } else if (errorMessage.includes("email is already taken")) {
            setErrors({ email: "This email is already taken by another organization" })
          } else if (errorMessage.includes("Integrity error")) {
            setGeneralError("This organization information conflicts with existing data. Please try different values.")
          } else if (errorMessage.includes("Database error")) {
            setGeneralError("We're experiencing technical difficulties. Please try again later.")
          } else {
            setGeneralError(errorMessage)
          }
        }
      } else if (error.response?.status === 403) {
        setGeneralError("You don't have permission to create an organization.")
      } else if (error.response?.status >= 500) {
        setGeneralError("Server error. Please try again later.")
      } else {
        setGeneralError("Failed to create organization. Please try again.")
      }
    }
  }

  if (isSuccess) {
    return (
      <div className="create-organization-container">
        <div className="success-card">
          <div className="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2>Organization Created Successfully!</h2>
          <p>Your organization "{formData.name}" has been created and you've been assigned as the administrator.</p>
          <div className="success-details">
            <div className="detail-item">
              <span className="label">Organization:</span>
              <span className="value">{formData.name}</span>
            </div>
            <div className="detail-item">
              <span className="label">Email:</span>
              <span className="value">{formData.email}</span>
            </div>
            <div className="detail-item">
              <span className="label">Your Role:</span>
              <span className="value role-admin">Administrator</span>
            </div>
          </div>
          <p className="redirect-message">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="create-organization-container">
      <div className="create-organization-card">
        <div className="card-header">
          <div className="header-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1>Create Organization</h1>
          <p>Set up your organization to start managing tickets and team members</p>
        </div>

        {generalError && (
          <div className="error-alert">
            <div className="error-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="error-content">
              <h4>Error Creating Organization</h4>
              <p>{generalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="organization-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Organization Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-input ${errors.name ? "error" : ""} ${touched.name && !errors.name ? "valid" : ""}`}
              placeholder="Enter your organization name"
              disabled={isLoading}
              maxLength={52}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
            <div className="field-hint">Choose a name that represents your organization (2-52 characters)</div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <svg className="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Organization Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`form-input ${errors.email ? "error" : ""} ${touched.email && !errors.email ? "valid" : ""}`}
              placeholder="organization@example.com"
              disabled={isLoading}
              maxLength={52}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
            <div className="field-hint">This email will be used for organization-wide communications</div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || Object.keys(errors).some((key) => errors[key])}
            >
              {isLoading ? (
                <>
                  <div className="btn-spinner"></div>
                  Creating Organization...
                </>
              ) : (
                <>
                  <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Organization
                </>
              )}
            </button>
          </div>
        </form>

        <div className="info-section">
          <div className="info-header">
            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            What happens next?
          </div>
          <ul className="info-list">
            <li>You'll become the administrator of this organization</li>
            <li>You can invite team members to join your organization</li>
            <li>Start creating and managing support tickets</li>
            <li>Configure organization settings and permissions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CreateOrganization
