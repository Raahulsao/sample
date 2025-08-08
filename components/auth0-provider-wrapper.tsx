'use client'

import { Auth0Provider } from '@auth0/auth0-react'
import { getAuth0ProviderOptions } from '@/lib/auth0'
import { AuthContextProvider } from '@/contexts/auth-context'
import { ReactNode, useMemo } from 'react'

interface Auth0ProviderWrapperProps {
  children: ReactNode
}

export default function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  // Memoize the Auth0 options to prevent recalculation on every render
  const auth0Options = useMemo(() => {
    try {
      return getAuth0ProviderOptions()
    } catch (error) {
      console.error('Auth0 configuration error:', error)
      return null
    }
  }, [])

  // If configuration failed, show error message
  if (!auth0Options) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg">
          <h2 className="text-xl font-semibold text-foreground mb-4">Configuration Error</h2>
          <p className="text-muted-foreground mb-4">
            Auth0 authentication is not properly configured. Please check your environment variables.
          </p>
          <div className="bg-muted p-3 rounded text-sm font-mono">
            <p>Required environment variables:</p>
            <ul className="mt-2 space-y-1">
              <li>• NEXT_PUBLIC_AUTH0_DOMAIN</li>
              <li>• NEXT_PUBLIC_AUTH0_CLIENT_ID</li>
              <li>• NEXT_PUBLIC_AUTH0_REDIRECT_URI</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Auth0Provider {...auth0Options}>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </Auth0Provider>
  )
}