// src/components/SignUpPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'  // 👈 Импортируем useAuth
import { registerUser } from '../services/user-management-api'
import { message } from 'antd'  // Опционально: для красивых уведомлений

export default function SignUpPage() {
  const navigate = useNavigate()
  const { login } = useAuth()  // 👈 Достаём login из контекста
  
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1️⃣ Регистрация (возвращает только данные пользователя, БЕЗ токенов)
      await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
        password_confirm: form.password2,  // 👈 Важно: имя поля должно совпадать с сериализатором
      })

      // 2️⃣ Автоматический логин после успешной регистрации
      await login(form.username, form.password)

      message.success('Регистрация успешна!')
      navigate('/helpdesk/tickets')

    } catch (err) {
      // 🔥 Показываем конкретные ошибки валидации
      const errors = err.response?.data
      if (errors?.email) setError(errors.email[0])
      else if (errors?.username) setError(errors.username[0])
      else if (errors?.password) setError(errors.password[0])
      else if (errors?.password_confirm) setError(errors.password_confirm[0])
      else if (errors?.detail) setError(errors.detail)
      else setError('Ошибка регистрации. Попробуйте позже.')

      message.error('Регистрация не удалась')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-container">
      <h2>Регистрация</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Имя пользователя</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Пароль</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Подтвердите пароль</label>
          <input
            name="password2"
            type="password"
            value={form.password2}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
