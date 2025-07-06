import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import axios from 'axios'

export const AuthContext = createContext()

const initialState = {
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,
  loading: true,
  error: null
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      }
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    default:
      return state
  }
}

const getRedirectPath = (role) => {
  switch (role) {
    case 'super-admin':
      return '/super-admin-dashboard'
    case 'tenant-admin':
      return '/tenant-admin-dashboard'
    case 'staff':
      return '/dashboard'
    case 'customer':
      return '/customer-dashboard'
    default:
      return '/login'
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const navigate = useNavigate()
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')))
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      try {
        dispatch({ type: 'AUTH_START' })
        const response = await api.get('/auth/validate')
        if (response.data.success) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.data.user, token }
          })
        } else {
          throw new Error('Token validation failed')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('auth_token')
        delete api.defaults.headers.common['Authorization']
        dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' })
      }
    } else {
      dispatch({ type: 'AUTH_FAILURE', payload: null })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const apiCall = async (apiFunction, successMessage, errorMessagePrefix) => {
    try {
      const response = await apiFunction()
      if (response.data.success) {
        if (successMessage) toast.success(successMessage)
        return { success: true, data: response.data }
      }
      throw new Error(response.data.message || 'An unknown error occurred.')
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.'
      toast.error(`${errorMessagePrefix}: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    setUser(res.data.data.user)
    setToken(res.data.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.data.user))
    localStorage.setItem('token', res.data.data.token)
    const role = res.data.data.user.role
    if (role === 'super-admin') navigate('/super-admin-dashboard')
    else if (['tenant-admin', 'manager', 'staff'].includes(role)) navigate('/tenant-dashboard')
    else if (role === 'customer') navigate('/customer-portal')
    else navigate('/')
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    navigate('/login')
  }

  const register = (userData) => apiCall(() => api.post('/auth/register', userData), 'Registration successful!', 'Registration failed')

  const updateProfile = async (profileData) => {
    const response = await apiCall(() => api.put('/auth/profile', profileData), 'Profile updated successfully!', 'Profile update failed')
    if (response.success) {
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.user
      })
    }
    return response
  }

  const changePassword = (passwordData) => apiCall(() => api.put('/auth/change-password', passwordData), 'Password changed successfully!', 'Password change failed')

  const forgotPassword = (email) => apiCall(() => api.post('/auth/forgot-password', { email }), 'Password reset email sent.', 'Failed to send reset email')

  const resetPassword = (resetData) => apiCall(() => api.post('/auth/reset-password', resetData), 'Password reset successfully!', 'Password reset failed')

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  const hasPermission = useCallback((permission) => state.user?.permissions?.includes(permission), [state.user])

  const hasRole = useCallback((role) => Array.isArray(role) ? role.includes(state.user?.role) : state.user?.role === role, [state.user])

  const value = {
    ...state,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    clearError,
    hasPermission,
    hasRole,
    user,
    token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 