import { useState } from "react"
import axios from "axios"
import { useAuth } from "../auth/AuthContext.jsx"
import { useNavigate } from "react-router-dom"
import '../styles/SignUpPage.css'

function CreateUser() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [error, setError] = useState("")

const handleSubmit = async (e) => {
  e.preventDefault()

  try {
    const response = await axios.post("http://localhost:8000/helpdesk/users/users_list/", {
      email,
      username,
      password,
      password2
    })

    const { id, email: userEmail, tokens } = response.data

    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
    localStorage.setItem('user_id', id)
    localStorage.setItem('email', userEmail)

    await login(username, password)

    navigate("/helpdesk/tickets")

    setEmail("")
    setUsername("")
    setPassword("")
    setPassword2("")
    setError("")
  } catch (err) {
    if (err.response && err.response.data) {
      setError("Error: " + JSON.stringify(err.response.data))
    } else {
      setError("Error: " + err.message)
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('email')
  }
};

  return (
    <div className="create-user-page">
      <div className="create-user-container">
        <h2>SignUp</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              id="confirmPassword"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="button">
            Create User
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateUser
