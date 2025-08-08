'use client'

import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import { useAuth0, User as Auth0User } from '@auth0/auth0-react'
import { Auth0Error, parseAuth0Error } from '@/lib/auth0'

// Extended user interface with additional properties
export interface User {
  sub: string
  name: string
  email: string
  picture?: string
  email_verified: boolean
  created_at?: string
  updated_at?: string
  last_login?: string
  auth_provider?: string
}

// Authentication context interface
export interface AuthContextType {
  // User state
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Authentication methods
  loginWithRedirect: (options?: { 
    connection?: string
    authorizationParams?: {
      screen_hint?: string
      connection?: string
      [key: string]: any
    }
  }) => Promise<void>
  loginWithPopup: (options?: { 
    connection?: string
    authorizationParams?: {
      screen_hint?: string
      connection?: string
      [key: string]: any
    }
  }) => Promise<void>
  logout: (options?: { returnTo?: string }) => void
  
  // Token management
  getAccessTokenSilently: () => Promise<string>
  
  // Error handling
  error: Auth0Error | null
  clearError: () => void
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth context provider props
interface AuthContextProviderProps {
  children: ReactNode
}

// Auth context provider component
export function AuthContextProvider({ children }: AuthContextProviderProps) {
  const {
    user: auth0User,
    isLoading,
    isAuthenticated,
    loginWithRedirect: auth0LoginWithRedirect,
    loginWithPopup: auth0LoginWithPopup,
    logout: auth0Logout,
    getAccessTokenSilently: auth0GetAccessTokenSilently,
    error: auth0Error,
  } = useAuth0()

  // Transform Auth0 user to our User interface (memoized to prevent re-renders)
  const user: User | null = useMemo(() => {
    if (!auth0User) return null
    
    return {
      sub: auth0User.sub || '',
      name: auth0User.name || auth0User.email || 'User',
      email: auth0User.email || '',
      picture: auth0User.picture,
      email_verified: auth0User.email_verified || false,
      created_at: auth0User.created_at,
      updated_at: auth0User.updated_at,
      // Extract auth provider from sub (e.g., "google-oauth2|123" -> "google-oauth2")
      auth_provider: auth0User.sub?.split('|')[0] || 'auth0',
    }
  }, [auth0User])

  // Parse Auth0 error into our error format (memoized)
  const error: Auth0Error | null = useMemo(() => {
    return auth0Error ? parseAuth0Error(auth0Error) : null
  }, [auth0Error])

  // Enhanced login with redirect (memoized to prevent re-renders)
  const loginWithRedirect = useCallback(async (options?: { 
    connection?: string
    authorizationParams?: {
      screen_hint?: string
      connection?: string
      [key: string]: any
    }
  }) => {
    try {
      await auth0LoginWithRedirect({
        authorizationParams: {
          connection: options?.connection || options?.authorizationParams?.connection,
          screen_hint: options?.authorizationParams?.screen_hint,
          ...options?.authorizationParams,
        },
      })
    } catch (err) {
      console.error('Login with redirect failed:', err)
      throw parseAuth0Error(err)
    }
  }, [auth0LoginWithRedirect])

  // Enhanced login with popup (memoized)
  const loginWithPopup = useCallback(async (options?: { 
    connection?: string
    authorizationParams?: {
      screen_hint?: string
      connection?: string
      [key: string]: any
    }
  }) => {
    try {
      await auth0LoginWithPopup({
        authorizationParams: {
          connection: options?.connection || options?.authorizationParams?.connection,
          screen_hint: options?.authorizationParams?.screen_hint,
          ...options?.authorizationParams,
        },
      })
    } catch (err) {
      console.error('Login with popup failed:', err)
      throw parseAuth0Error(err)
    }
  }, [auth0LoginWithPopup])

  // Enhanced logout (memoized)
  const logout = useCallback((options?: { returnTo?: string }) => {
    auth0Logout({
      logoutParams: {
        returnTo: options?.returnTo || window.location.origin,
      },
    })
  }, [auth0Logout])

  // Enhanced token retrieval (memoized)
  const getAccessTokenSilently = useCallback(async (): Promise<string> => {
    try {
      return await auth0GetAccessTokenSilently()
    } catch (err) {
      console.error('Failed to get access token:', err)
      throw parseAuth0Error(err)
    }
  }, [auth0GetAccessTokenSilently])

  // Clear error (for manual error dismissal) (memoized)
  const clearError = useCallback(() => {
    // Auth0 doesn't provide a direct way to clear errors,
    // but errors typically clear on successful operations
    console.log('Error cleared (will be cleared on next successful operation)')
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    loginWithPopup,
    logout,
    getAccessTokenSilently,
    error,
    clearError,
  }), [
    user,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    loginWithPopup,
    logout,
    getAccessTokenSilently,
    error,
    clearError,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider')
  }
  return context
}

// Custom hook for authentication status
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth()
  return { isAuthenticated, isLoading, user }
}

// Custom hook for authentication actions
export function useAuthActions() {
  const { loginWithRedirect, loginWithPopup, logout } = useAuth()
  return { loginWithRedirect, loginWithPopup, logout }
}

// Custom hook for error handling
export function useAuthError() {
  const { error, clearError } = useAuth()
  return { error, clearError }
}

// Custom hook for token management
export function useAuthToken() {
  const { getAccessTokenSilently } = useAuth()
  return { getAccessTokenSilently }
}