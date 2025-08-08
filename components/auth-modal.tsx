"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import GoogleSignInButton from "@/components/google-signin-button"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: "signin" | "signup"
  onLogin?: (userData: { name: string; email: string }) => void
}

export default function AuthModal({ isOpen, onClose, initialMode = "signin", onLogin }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { loginWithRedirect, loginWithPopup, isAuthenticated, user, error: authError } = useAuth()

  // Close modal when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      onLogin?.({
        name: user.name,
        email: user.email,
      })
      onClose()
    }
  }, [isAuthenticated, user])

  // Handle Auth0 errors
  useEffect(() => {
    if (authError) {
      setError(authError.message)
      setIsLoading(false)
    }
  }, [authError])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Use Auth0 popup instead of redirect to avoid external page
      await loginWithPopup({
        authorizationParams: {
          screen_hint: mode === "signup" ? "signup" : "login",
        },
      })
    } catch (err) {
      console.error('Authentication failed:', err)
      setError('Authentication failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = () => {
    // Google sign-in success is handled by the useEffect hook
    console.log('Google sign-in successful')
  }

  const handleGoogleError = (error: Error) => {
    console.error('Google sign-in failed:', error)
    setError('Google sign-in failed. Please try again.')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">{mode === "signin" ? "Sign In" : "Create Account"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        <GoogleSignInButton
          mode={mode}
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={isLoading}
        />

        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <div className="auth-input-container">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input with-icon"
                  placeholder="Enter your full name"
                  required={mode === "signup"}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="auth-input-container">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input with-icon"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="auth-input-container">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input with-icon with-icon-right"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-input-icon-right"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="form-button">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {mode === "signin" ? "Signing In..." : "Creating Account..."}
              </div>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="ml-1 text-foreground hover:underline font-medium"
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
