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
  // ✅ 1. Инициализируем стейт сразу из localStorage
  // Это уберет мигание интерфейса и сразу даст права админа до завершения checkAuth
  const [user, setUser] = useState(() => {
    const id = localStorage.getItem('user_id');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    return id ? { id, email, role } : null;
  })
  
  // Инициализируем статус авторизации на основе наличия токена
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.checkAuth()

        if (response?.user) {
          // ✅ 2. Подтягиваем сохраненную роль на случай, если бэкенд её не передал в checkAuth
          const savedRole = localStorage.getItem('role');
          const fullUser = {
            ...response.user,
            role: response.user.role || savedRole
          };

          setUser(fullUser)
          setIsAuthenticated(true)
          
          localStorage.setItem('user_id', fullUser.id)
          localStorage.setItem('email', fullUser.email)
          if (fullUser.role) {
            localStorage.setItem('role', fullUser.role)
          }
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

    try {
      // Используем токен, который только что получили, так как он еще не успел попасть в глобальный перехватчик (interceptor)
      const profileResponse = await apiClientInstance.get('/helpdesk/users/me/', {
        headers: {
          Authorization: `Bearer ${access}`
        }
      });
      const fullUser = profileResponse.data;
      
      setUser(fullUser); 
      localStorage.setItem('role', fullUser.role); 
    } catch (err) {
      console.error('Failed to fetch user profile during login', err);
      // Если профиль не загрузился, ставим хотя бы базовые данные
      setUser({ id: user_id, email }); 
    }

    setIsAuthenticated(true)

    return { access, refresh }
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
      localStorage.removeItem('role') // ✅ 3. Очищаем роль при выходе!
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
