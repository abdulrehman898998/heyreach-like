import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

// Configure API base URL
const API_BASE = 'http://localhost:8080'

// Axios base setup
axios.defaults.timeout = 10000

interface User {
  id: number
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const response = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(response.data.data)
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, { email, password })
      const { token, user } = response.data.data
      localStorage.setItem('token', token)
      setUser(user)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const register = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, { email, password })
      const { token, user } = response.data.data
      localStorage.setItem('token', token)
      setUser(user)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
