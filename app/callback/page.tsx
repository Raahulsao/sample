'use client'

import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export default function CallbackPage() {
  const { isLoading, error, isAuthenticated, user } = useAuth0()

  useEffect(() => {
    console.log('Callback page - Auth state:', { isLoading, isAuthenticated, error, user })
    
    // Wait a moment for Auth0 to process the callback
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated && user) {
          console.log('Authentication successful, redirecting to home')
          window.location.href = '/'
        } else if (error) {
          console.error('Auth0 callback error:', error)
          window.location.href = '/?error=auth_failed'
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [isLoading, isAuthenticated, error, user])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg">
          <h2 className="text-xl font-semibold text-foreground mb-4">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">
            There was an error during authentication. Please try again.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-muted-foreground">Completing authentication...</span>
      </div>
    </div>
  )
}