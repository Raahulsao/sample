'use client'

import { useState, useCallback, useRef } from 'react'
import { trpc } from '@/lib/trpc-client'
import { useGemini } from './use-gemini'

// Chat message types
export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'ai' | 'gemini-text' | 'gemini-image'
  timestamp: Date
  metadata?: {
    model?: string
    tokens?: number
    imageUrl?: string
    isStreaming?: boolean
    error?: string
  }
}

// Chat options
export interface ChatOptions {
  enableGemini?: boolean
  autoGenerateResponse?: boolean
  streamingEnabled?: boolean
}

export function useChat(options: ChatOptions = {}) {
  const { enableGemini = true, autoGenerateResponse = true, streamingEnabled = true } = options
  
  // State for streaming messages
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null)
  const streamingMessageRef = useRef<string>('')

  // Get chat messages
  const { data: messages, isLoading } = trpc.getChatMessages.useQuery({
    limit: 50,
  })

  // Send message mutation
  const sendMessage = trpc.sendMessage.useMutation({
    onSuccess: () => {
      // Invalidate and refetch messages after sending
      trpc.useUtils().getChatMessages.invalidate()
    },
  })

  // Get user profile
  const { data: userProfile } = trpc.getUserProfile.useQuery(
    { userId: 'current-user' },
    { enabled: false } // Only fetch when needed
  )

  // Update user profile
  const updateProfile = trpc.updateUserProfile.useMutation()

  // Gemini integration
  const gemini = useGemini({
    onStreamChunk: (chunk: string) => {
      streamingMessageRef.current += chunk
      setStreamingMessage(prev => prev ? {
        ...prev,
        content: streamingMessageRef.current,
        metadata: {
          ...prev.metadata,
          isStreaming: true,
        }
      } : null)
    },
    onStreamComplete: (fullContent: string) => {
      // Save the completed message
      if (streamingMessage) {
        sendMessage.mutate({
          content: fullContent,
          type: 'gemini-text',
          metadata: {
            model: 'gemini-pro',
            isStreaming: false,
          }
        })
      }
      setStreamingMessage(null)
      streamingMessageRef.current = ''
    },
    onSuccess: (response) => {
      // Handle non-streaming response
      if (!streamingEnabled) {
        sendMessage.mutate({
          content: response.content,
          type: 'gemini-text',
          metadata: {
            model: 'gemini-pro',
            tokens: response.metadata?.tokens,
            isStreaming: false,
          }
        })
      }
    },
    onError: (error) => {
      console.error('Gemini generation failed:', error)
      setStreamingMessage(null)
      streamingMessageRef.current = ''
    }
  })

  // Send user message and optionally generate AI response
  const sendUserMessage = useCallback(async (content: string, generateAIResponse = autoGenerateResponse) => {
    // Send user message
    await sendMessage.mutateAsync({
      content,
      type: 'user',
    })

    // Generate AI response if enabled and Gemini is available
    if (generateAIResponse && enableGemini && !gemini.isGenerating) {
      if (streamingEnabled) {
        // Create streaming message placeholder
        const streamingId = `streaming-${Date.now()}`
        setStreamingMessage({
          id: streamingId,
          content: '',
          type: 'gemini-text',
          timestamp: new Date(),
          metadata: {
            model: 'gemini-pro',
            isStreaming: true,
          }
        })
        streamingMessageRef.current = ''
        
        // Start streaming generation
        await gemini.generateTextStream(content)
      } else {
        // Generate non-streaming response
        await gemini.generateText(content)
      }
    }
  }, [sendMessage, enableGemini, autoGenerateResponse, streamingEnabled, gemini])

  // Generate Gemini response for existing message
  const generateGeminiResponse = useCallback(async (prompt: string, streaming = streamingEnabled) => {
    if (!enableGemini || gemini.isGenerating) {
      return
    }

    if (streaming) {
      // Create streaming message placeholder
      const streamingId = `streaming-${Date.now()}`
      setStreamingMessage({
        id: streamingId,
        content: '',
        type: 'gemini-text',
        timestamp: new Date(),
        metadata: {
          model: 'gemini-pro',
          isStreaming: true,
        }
      })
      streamingMessageRef.current = ''
      
      // Start streaming generation
      await gemini.generateTextStream(prompt)
    } else {
      // Generate non-streaming response
      await gemini.generateText(prompt)
    }
  }, [enableGemini, streamingEnabled, gemini])

  // Cancel streaming generation
  const cancelStreaming = useCallback(() => {
    gemini.cancelStream()
    setStreamingMessage(null)
    streamingMessageRef.current = ''
  }, [gemini])

  // Get all messages including streaming
  const allMessages = [
    ...(messages?.messages || []),
    ...(streamingMessage ? [streamingMessage] : [])
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return {
    // Messages
    messages: allMessages,
    isLoading,
    
    // Streaming state
    streamingMessage,
    isStreaming: gemini.isStreaming,
    streamingContent: gemini.streamingContent,
    
    // Message sending
    sendMessage: sendMessage.mutate,
    sendUserMessage,
    isSending: sendMessage.isPending,
    
    // Gemini integration
    generateGeminiResponse,
    isGeneratingGemini: gemini.isGenerating,
    geminiError: gemini.error,
    cancelStreaming,
    clearGeminiError: gemini.clearError,
    
    // User profile
    userProfile,
    updateProfile: updateProfile.mutate,
    isUpdatingProfile: updateProfile.isPending,
    
    // Configuration
    enableGemini,
    streamingEnabled,
  }
}