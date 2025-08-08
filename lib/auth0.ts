import { AppState, Auth0Provider } from '@auth0/auth0-react'

// Auth0 configuration interface
export interface Auth0Config {
  domain: string
  clientId: string
  redirectUri: string
  audience?: string
}

// Get Auth0 configuration from environment variables
export const getAuth0Config = (): Auth0Config => {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  if (!domain || !clientId) {
    throw new Error(
      'Auth0 configuration is missing. Please check your environment variables:\n' +
      '- NEXT_PUBLIC_AUTH0_DOMAIN\n' +
      '- NEXT_PUBLIC_AUTH0_CLIENT_ID\n' +
      '- NEXT_PUBLIC_AUTH0_REDIRECT_URI (optional)'
    )
  }

  return {
    domain,
    clientId,
    redirectUri,
  }
}

// Auth0 provider options
export const getAuth0ProviderOptions = () => {
  const config = getAuth0Config()
  
  return {
    domain: config.domain,
    clientId: config.clientId,
    authorizationParams: {
      redirect_uri: config.redirectUri,
      audience: config.audience,
      scope: 'openid profile email',
    },
    // Enable caching for better performance
    cacheLocation: 'localstorage' as const,
    // Use refresh tokens for better security
    useRefreshTokens: true,
    // Skip HTTPS check for development
    skipRedirectCallback: false,
    // Handle redirect callback
    onRedirectCallback: (appState?: AppState) => {
      // Redirect to the main app after successful authentication
      const targetUrl = appState?.returnTo || '/'
      console.log('Auth0 callback completed, redirecting to:', targetUrl)
      // Use replace instead of href to avoid page reload
      window.history.replaceState({}, document.title, targetUrl)
      // Force a small delay to ensure state is updated
      setTimeout(() => {
        if (window.location.pathname !== '/') {
          window.location.href = '/'
        }
      }, 100)
    },
  }
}

// Auth0 error types
export enum Auth0ErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  OAUTH_ERROR = 'oauth_error',
  TOKEN_EXPIRED = 'token_expired',
  CONFIGURATION_ERROR = 'configuration_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Auth0 error interface
export interface Auth0Error {
  type: Auth0ErrorType
  message: string
  details?: any
}

// Parse Auth0 errors into user-friendly messages
export const parseAuth0Error = (error: any): Auth0Error => {
  if (!error) {
    return {
      type: Auth0ErrorType.UNKNOWN_ERROR,
      message: 'An unknown error occurred'
    }
  }

  // Network errors
  if (error.code === 'network_error' || error.message?.includes('network')) {
    return {
      type: Auth0ErrorType.NETWORK_ERROR,
      message: 'Network error. Please check your connection and try again.',
      details: error
    }
  }

  // Invalid credentials
  if (error.error === 'invalid_grant' || error.error_description?.includes('Wrong email or password')) {
    return {
      type: Auth0ErrorType.INVALID_CREDENTIALS,
      message: 'Invalid email or password. Please try again.',
      details: error
    }
  }

  // User not found
  if (error.error_description?.includes('user does not exist')) {
    return {
      type: Auth0ErrorType.USER_NOT_FOUND,
      message: 'No account found with this email address.',
      details: error
    }
  }

  // Email not verified
  if (error.error_description?.includes('email not verified')) {
    return {
      type: Auth0ErrorType.EMAIL_NOT_VERIFIED,
      message: 'Please verify your email address before signing in.',
      details: error
    }
  }

  // OAuth errors
  if (error.error === 'access_denied' || error.error_description?.includes('OAuth')) {
    return {
      type: Auth0ErrorType.OAUTH_ERROR,
      message: 'Authentication was cancelled or failed. Please try again.',
      details: error
    }
  }

  // Token expired
  if (error.error === 'token_expired') {
    return {
      type: Auth0ErrorType.TOKEN_EXPIRED,
      message: 'Your session has expired. Please sign in again.',
      details: error
    }
  }

  // Configuration errors
  if (error.message?.includes('configuration') || error.message?.includes('environment')) {
    return {
      type: Auth0ErrorType.CONFIGURATION_ERROR,
      message: 'Authentication service is not properly configured.',
      details: error
    }
  }

  // Default unknown error
  return {
    type: Auth0ErrorType.UNKNOWN_ERROR,
    message: error.error_description || error.message || 'An unexpected error occurred',
    details: error
  }
}