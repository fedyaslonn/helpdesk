import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getOrganization, updateOrganization } from "../services/organization-management-api"
import '../styles/OrganizationUpdate.css'


function OrganizationUpdate() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    is_active: true
  })

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await getOrganization(id)
        const data = response.data
        setOrganization(data)
        setEditForm({
          name: data.name || "",
          email: data.email || "",
          is_active: data.is_active
        })
      } catch (err) {
        setError(err.message || "Failed to load organization")
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      // Фильтруем изменения
      const changes = {}
      if (editForm.name !== organization.name) changes.name = editForm.name
      if (editForm.email !== organization.email) changes.email = editForm.email
      if (editForm.is_active !== organization.is_active) changes.is_active = editForm.is_active

      // Проверяем наличие изменений
      if (Object.keys(changes).length === 0) {
        setSuccess("No changes detected")
        return
      }

      const response = await updateOrganization(id, changes)
      setOrganization(response.data)
      setSuccess("Organization updated successfully!")
      setIsEditing(false)
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Update failed")
    }
  }

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false)
      setEditForm({
        name: organization.name || "",
        email: organization.email || "",
        is_active: organization.is_active
      })
    } else {
      navigate(-1)
    }
  }

  if (loading) return <div className="loading">Loading organization data...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!organization) return <div className="error">Organization not found</div>

  return (
    <div className="organization-edit">
      <div className="header">
        <h2>Organization Details</h2>
        <button
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          &larr; Back
        </button>
      </div>

      {!isEditing ? (
        <div className="details-view">
          <div className="detail-item">
            <strong>ID:</strong> {organization.id}
          </div>
          <div className="detail-item">
            <strong>Name:</strong> {organization.name}
          </div>
          <div className="detail-item">
            <strong>Email:</strong> {organization.email || "Not specified"}
          </div>
          <div className="detail-item">
            <strong>Created:</strong> {new Date(organization.created_at).toLocaleString()}
          </div>
          <div className="detail-item">
            <strong>Last Updated:</strong> {new Date(organization.updated_at).toLocaleString()}
          </div>

          <div className="members-section">
            <h3>Members</h3>
            {organization.members && organization.members.length > 0 ? (
              <ul className="members-list">
                {organization.members.map(member => (
                  <li key={member.id} className="member-item">
                    <div className="member-name">{member.username}</div>
                    <div className="member-email">{member.email}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No members found</p>
            )}
          </div>

          <div className="actions">
            <button
              className="btn-edit"
              onClick={() => setIsEditing(true)}
            >
              Edit Organization
            </button>
          </div>
        </div>
      ) : (
        <div className="edit-form">
          <h3>Edit Organization</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Organization Name:</label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleChange}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-save">
                Save Changes
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default OrganizationUpdate
