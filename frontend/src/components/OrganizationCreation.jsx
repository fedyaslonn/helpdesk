import { useState } from "react"
import axios from "axios"

function CreateOrganization() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")

    axios.post("http://localhost:8000/organizations/organizations_list/", {email, name})
      .then(() => {
        alert("Organization created successfully!")
        setName("")
        setEmail("")
      })
      .catch(err => {
        const errorMessage = err.response?.data?.error || "Something went wrong";
        setError(errorMessage)
      })
  }

  return (
    <div className="create-user-container">
      <h2>Create Organization</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Organization Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="button">
          Create Organization
        </button>
      </form>
    </div>
  )
}

export default CreateOrganization
