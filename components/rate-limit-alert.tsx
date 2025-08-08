'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Clock, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { QuotaUsage } from '@/lib/rate-limiter'

interface RateLimitAlertProps {
  isRateLimited: boolean
  retryAfter?: number
  quotaUsage?: QuotaUsage
  message?: string
  onRetry?: () => void
  className?: string
}

export function RateLimitAlert({
  isRateLimited,
  retryAfter,
  quotaUsage,
  message,
  onRetry,
  className = '',
}: RateLimitAlertProps) {
  const [countdown, setCountdown] = useState<number>(0)
  const [canRetry, setCanRetry] = useState(false)

  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setCountdown(Math.ceil(retryAfter / 1000))
      setCanRetry(false)

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanRetry(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    } else {
      setCanRetry(true)
      setCountdown(0)
    }
  }, [retryAfter])

  if (!isRateLimited) {
    return null
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    return `${minutes}m ${remainingSeconds}s`
  }

  const getQuotaPercentage = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100)
  }

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Rate Limit Exceeded</AlertTitle>
      <AlertDescription className="text-orange-700">
        <div className="space-y-3">
          <p>{message || 'You have exceeded the rate limit. Please wait before making another request.'}</p>
          
          {countdown > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Please wait {formatTime(countdown)} before trying again</span>
            </div>
          )}

          {quotaUsage && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Current Usage:</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Requests (per minute)</span>
                  <span>{quotaUsage.requests.minute}/60</span>
                </div>
                <Progress 
                  value={getQuotaPercentage(quotaUsage.requests.minute, 60)} 
                  className="h-2"
                />
                
                <div className="flex justify-between text-xs">
                  <span>Tokens (per minute)</span>
                  <span>{quotaUsage.tokens.minute.toLocaleString()}/32,000</span>
                </div>
                <Progress 
                  value={getQuotaPercentage(quotaUsage.tokens.minute, 32000)} 
                  className="h-2"
                />
              </div>
            </div>
          )}

          {onRetry && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={!canRetry}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                {canRetry ? 'Try Again' : `Wait ${countdown}s`}
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface QuotaUsageDisplayProps {
  quotaUsage: QuotaUsage
  className?: string
}

export function QuotaUsageDisplay({ quotaUsage, className = '' }: QuotaUsageDisplayProps) {
  const getUsageColor = (current: number, limit: number): string => {
    const percentage = (current / limit) * 100
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-orange-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (current: number, limit: number): string => {
    const percentage = (current / limit) * 100
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={`p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-800">API Usage</h3>
      </div>
      
      <div className="space-y-3">
        {/* Requests Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Requests</span>
            <div className="space-x-4">
              <span className={getUsageColor(quotaUsage.requests.minute, 60)}>
                {quotaUsage.requests.minute}/60 per min
              </span>
              <span className={getUsageColor(quotaUsage.requests.hour, 1000)}>
                {quotaUsage.requests.hour}/1K per hour
              </span>
              <span className={getUsageColor(quotaUsage.requests.day, 10000)}>
                {quotaUsage.requests.day}/10K per day
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Progress 
              value={getQuotaPercentage(quotaUsage.requests.minute, 60)} 
              className="h-1 flex-1"
            />
            <Progress 
              value={getQuotaPercentage(quotaUsage.requests.hour, 1000)} 
              className="h-1 flex-1"
            />
            <Progress 
              value={getQuotaPercentage(quotaUsage.requests.day, 10000)} 
              className="h-1 flex-1"
            />
          </div>
        </div>

        {/* Tokens Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Tokens</span>
            <div className="space-x-4">
              <span className={getUsageColor(quotaUsage.tokens.minute, 32000)}>
                {quotaUsage.tokens.minute.toLocaleString()}/32K per min
              </span>
              <span className={getUsageColor(quotaUsage.tokens.hour, 500000)}>
                {Math.round(quotaUsage.tokens.hour / 1000)}K/500K per hour
              </span>
              <span className={getUsageColor(quotaUsage.tokens.day, 2000000)}>
                {Math.round(quotaUsage.tokens.day / 1000)}K/2M per day
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Progress 
              value={getQuotaPercentage(quotaUsage.tokens.minute, 32000)} 
              className="h-1 flex-1"
            />
            <Progress 
              value={getQuotaPercentage(quotaUsage.tokens.hour, 500000)} 
              className="h-1 flex-1"
            />
            <Progress 
              value={getQuotaPercentage(quotaUsage.tokens.day, 2000000)} 
              className="h-1 flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const getQuotaPercentage = (current: number, limit: number): number => {
  return Math.min((current / limit) * 100, 100)
}