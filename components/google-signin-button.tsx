'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface GoogleSignInButtonProps {
  mode: 'signin' | 'signup'
  onSuccess?: () => void
  onError?: (error: Error) => void
  disabled?: boolean
  className?: string
}

// Google logo SVG component
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

export default function GoogleSignInButton({
  mode,
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { loginWithPopup } = useAuth()

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)

    try {
      // Use Auth0's Google OAuth connection
      console.log('Attempting Google sign-in...')
      await loginWithPopup({ connection: 'google-oauth2' })
      console.log('Google sign-in successful')
      onSuccess?.()
    } catch (error) {
      console.error('Google sign-in failed:', error)
      onError?.(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || isLoading}
      className={`google-signin-button ${className}`}
      aria-label={`${mode === 'signin' ? 'Sign in' : 'Sign up'} with Google`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      <span>
        {isLoading
          ? `${mode === 'signin' ? 'Signing in' : 'Signing up'}...`
          : `Continue with Google`}
      </span>
    </button>
  )
}