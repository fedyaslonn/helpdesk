import React, { createContext, useContext, useEffect, useState } from 'react'
// ✅ Импортируем оба экспорта:
import apiClient, { apiClientInstance } from '../api/ApiClient.jsx'

export const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      try {
        // ✅ apiClient.checkAuth() — это метод из кастомного объекта
        const response = await apiClient.checkAuth()

        if (response?.user) {
          setUser(response.user)
          setIsAuthenticated(true)
          localStorage.setItem('user_id', response.user.id)
          localStorage.setItem('email', response.user.email)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  // ✅ login использует apiClientInstance для .post()
  const login = async (username, password) => {
    const response = await apiClientInstance.post('/authentication/api/token/', {
      username,
      password
    })
    const { access, refresh, user_id, email } = response.data

    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('user_id', user_id)
    localStorage.setItem('email', email)

    setUser({ id: user_id, email })
    setIsAuthenticated(true)

    return { access, refresh, user: { id: user_id, email } }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await apiClientInstance.post('/authentication/logout/', {
          refresh_token: refreshToken
        })
      }
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_id')
      localStorage.removeItem('email')
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
