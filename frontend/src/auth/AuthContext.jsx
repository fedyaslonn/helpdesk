import React, { createContext, useContext, useEffect, useState } from 'react'
import apiClient from '../api/ApiClient.jsx'

export const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.checkAuth()
        console.log('Auth check response:', response)

        if (response.user) {
          setUser(response.user)
          setIsAuthenticated(true)

          localStorage.setItem('user_id', response.user.id)
          localStorage.setItem('email', response.user.email)
        } else {
          setUser(null);
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

  const login = async (username, password) => {
    try {
      const response = await apiClient.login(username, password)
      setUser(response.user)
      setIsAuthenticated(true)
      return response;
    } catch (error) {
      setIsAuthenticated(false)
      throw error;
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } finally {
      setUser(null)
      setIsAuthenticated(false)
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
