'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Activity, Zap, Clock, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc-client'
import type { RateLimitState } from '@/hooks/use-gemini'

interface DebugPanelProps {
  isGenerating: boolean
  isStreaming: boolean
  error: Error | null
  rateLimit: RateLimitState
  messagesCount: number
}

export function DebugPanel({ 
  isGenerating, 
  isStreaming, 
  error, 
  rateLimit, 
  messagesCount 
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Test Hugging Face configuration
  const { data: hfConfig, refetch: testHfConfig } = trpc.gemini.testHuggingFaceConfig.useQuery(
    undefined,
    { enabled: false }
  )

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="bg-background/80 backdrop-blur-sm border-border/50"
        >
          <Activity className="w-4 h-4 mr-2" />
          Debug
          <ChevronUp className="w-4 h-4 ml-2" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 min-w-[300px] shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Debug Panel
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={isGenerating ? "default" : "secondary"}>
            <Zap className="w-3 h-3 mr-1" />
            {isGenerating ? "Generating" : "Idle"}
          </Badge>
          
          <Badge variant={isStreaming ? "default" : "secondary"}>
            <Activity className="w-3 h-3 mr-1" />
            {isStreaming ? "Streaming" : "Not Streaming"}
          </Badge>
          
          <Badge variant={rateLimit.isRateLimited ? "destructive" : "secondary"}>
            <Clock className="w-3 h-3 mr-1" />
            {rateLimit.isRateLimited ? "Rate Limited" : "OK"}
          </Badge>
        </div>

        {/* Messages Count */}
        <div className="text-muted-foreground">
          Messages: {messagesCount}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800">
            <div className="font-medium">Error:</div>
            <div className="text-xs mt-1">{error.message}</div>
          </div>
        )}

        {/* Rate Limit Info */}
        {rateLimit.isRateLimited && (
          <div className="p-2 bg-orange-50 border border-orange-200 rounded text-orange-800">
            <div className="font-medium">Rate Limited</div>
            {rateLimit.retryAfter && (
              <div className="text-xs mt-1">
                Retry in: {Math.ceil(rateLimit.retryAfter / 1000)}s
              </div>
            )}
            {rateLimit.message && (
              <div className="text-xs mt-1">{rateLimit.message}</div>
            )}
          </div>
        )}

        {/* Quota Usage */}
        {rateLimit.quotaUsage && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
            <div className="font-medium">Quota Usage</div>
            <div className="text-xs mt-1 space-y-1">
              <div>Requests/min: {rateLimit.quotaUsage.requests.minute}</div>
              <div>Tokens/min: {rateLimit.quotaUsage.tokens.minute}</div>
            </div>
          </div>
        )}

        {/* Hugging Face Configuration Test */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium flex items-center gap-1">
              <Image className="w-3 h-3" />
              Hugging Face
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testHfConfig()}
              className="h-6 px-2 text-xs"
            >
              Test
            </Button>
          </div>
          
          {hfConfig && (
            <div className={`p-2 border rounded text-xs ${
              hfConfig.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {hfConfig.success ? (
                <div className="space-y-1">
                  <div className="font-medium">✓ Configuration OK</div>
                  <div>Model: {'data' in hfConfig ? hfConfig.data.model : 'N/A'}</div>
                  <div>Token: {'data' in hfConfig ? hfConfig.data.tokenPrefix : 'N/A'}</div>
                  <div>Valid: {'data' in hfConfig ? (hfConfig.data.hasToken ? 'Yes' : 'No') : 'N/A'}</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium">✗ Configuration Error</div>
                  <div className="mt-1">{'error' in hfConfig ? hfConfig.error : 'Unknown error'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}