import React from 'react'
import { useAuth } from './AuthContext'
import { Button } from 'antd'

const LogoutButton = () => {
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return (
    <Button type="primary" onClick={handleLogout}>
      Logout
    </Button>
  )
}

export default LogoutButton
