import React, { useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { serverApi } from '../contants'
import { useAuth } from '../auth/AuthContext';
import '../styles/SignUpPage.css'
import { createUser } from '../services/user-management-api';

const formReducer = (state, action) => {
  return {
    ...state,
    [action.field]: action.value,
  }
}

function CreateUser() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formState, dispatch] = useReducer(formReducer, {
    email: '',
    username: '',
    password: '',
    password2: '',
  });
  const [error, setError] = React.useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
     const response = await createUser(formState)

      const { id, email: userEmail, tokens } = response.data

      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      localStorage.setItem('user_id', id)
      localStorage.setItem('email', userEmail)

      await login(formState.username, formState.password)

      dispatch({ field: 'email', value: '' })
      dispatch({ field: 'username', value: '' })
      dispatch({ field: 'password', value: '' })
      dispatch({ field: 'password2', value: '' })
      setError('')
      navigate('/helpdesk/tickets')
    } catch (err) {
      const errorMessage = err.response?.data
        ? `Error: ${JSON.stringify(err.response.data)}`
        : `Error: ${err.message}`

      setError(errorMessage)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_id')
      localStorage.removeItem('email')
    }
  }

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
              name="email"
              value={formState.email}
              onChange={(e) => dispatch({ field: 'email', value: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formState.username}
              onChange={(e) => dispatch({ field: 'username', value: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formState.password}
              onChange={(e) => dispatch({ field: 'password', value: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              id="confirmPassword"
              type="password"
              name="password2"
              value={formState.password2}
              onChange={(e) => dispatch({ field: 'password2', value: e.target.value })}
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
