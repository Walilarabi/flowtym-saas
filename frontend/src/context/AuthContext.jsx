import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const API = `${BACKEND_URL}/api`

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('flowtym_token'))
  const [loading, setLoading] = useState(true)

  const api = useMemo(() => {
    return axios.create({
      baseURL: API,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }, [token])

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const response = await api.get('/auth/me')
        setUser(response.data)
      } catch (error) {
        console.error('Failed to fetch user:', error)
        localStorage.removeItem('flowtym_token')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [token, api])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token: newToken, user: userData } = response.data
    localStorage.setItem('flowtym_token', newToken)
    setToken(newToken)
    setUser(userData)
    return { user: userData, token: newToken }
  }

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData)
    const { token: newToken, user: newUser } = response.data
    localStorage.setItem('flowtym_token', newToken)
    setToken(newToken)
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    localStorage.removeItem('flowtym_token')
    setToken(null)
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateUser,
    api,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
