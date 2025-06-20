import { useState, useEffect } from "react"

function ShiftManagement({ membership, onClose, onSave }) {
  const [shiftData, setShiftData] = useState({
    shift_start: membership?.shift_start || "",
    shift_end: membership?.shift_end || "",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (membership) {
      setShiftData({
        shift_start: membership.shift_start || "",
        shift_end: membership.shift_end || "",
      })
    }
  }, [membership])

  const handleChange = (e) => {
    const { name, value } = e.target
    setShiftData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const result = await onSave(membership.user.id, shiftData)

      if (result) {
        setSuccess("Shift updated successfully!")
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError("Failed to update shift. Please try again.")
      }
    } catch (err) {
      setError("An error occurred while updating the shift.")
      console.error("Error updating shift:", err)
    }

    setIsSaving(false)
  }

  if (!membership) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Shift for {membership.user?.username || "Unknown User"}</h3>
          <button onClick={onClose} className="btn-close" type="button">
            &times;
          </button>
        </div>

        <div className="user-info">
          <p>
            <strong>User:</strong> {membership.user?.username || "Unknown"}
          </p>
          <p>
            <strong>Email:</strong> {membership.user?.email || "No email"}
          </p>
          <p>
            <strong>Role:</strong> {membership.role}
          </p>
          <p>
            <strong>Current Shift:</strong> {membership.shift_start || "Not set"} - {membership.shift_end || "Not set"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="shift-form">
          <div className="form-group">
            <label htmlFor="shift_start">Shift Start:</label>
            <input
              id="shift_start"
              type="time"
              name="shift_start"
              value={shiftData.shift_start}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shift_end">Shift End:</label>
            <input
              id="shift_end"
              type="time"
              name="shift_end"
              value={shiftData.shift_end}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShiftManagement
