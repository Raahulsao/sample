'use client'

import { useState, useCallback } from 'react'
import { useGemini } from './use-gemini'

export interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'gemini-text' | 'gemini-image'
  content: string
  timestamp: Date
  metadata?: {
    imageUrl?: string
    isStreaming?: boolean
    model?: string
    [key: string]: any
  }
}

export interface UseChatGeminiOptions {
  onError?: (error: Error) => void
}

export function useChatGemini(options: UseChatGeminiOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)
  
  const gemini = useGemini({
    onSuccess: (response) => {
      // Add AI response to messages
      const messageType = response.type === 'image' ? 'gemini-image' : 'gemini-text'
      const aiMessage: ChatMessage = {
        id: response.id,
        type: messageType,
        content: response.content,
        timestamp: response.timestamp,
        metadata: {
          imageUrl: response.metadata?.imageUrl,
          model: response.metadata?.model,
          isStreaming: false,
        },
      }
      
      setMessages(prev => [...prev, aiMessage])
      setIsThinking(false)
    },
    onError: (error) => {
      setIsThinking(false)
      options.onError?.(error)
    },
    onStreamChunk: (chunk) => {
      // Update the last AI message with streaming content
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.type === 'gemini-text' && lastMessage.metadata?.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + chunk,
            }
          ]
        }
        return prev
      })
    },
    onStreamComplete: (fullContent) => {
      // Mark streaming as complete
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.type === 'gemini-text' && lastMessage.metadata?.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: fullContent,
              metadata: { ...lastMessage.metadata, isStreaming: false },
            }
          ]
        }
        return prev
      })
      setIsThinking(false)
    }
  })

  const sendMessage = useCallback(async (content: string, isTextMode: boolean = true) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsThinking(true)

    try {
      if (isTextMode) {
        // For streaming, add a placeholder AI message
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'gemini-text',
          content: '',
          timestamp: new Date(),
          metadata: { isStreaming: true },
        }
        setMessages(prev => [...prev, aiMessage])
        
        // Use streaming for better UX
        await gemini.generateTextStream(content, {
          maxTokens: 1000,
          temperature: 0.7,
        })
      } else {
        // For image generation, add a placeholder image message
        const imageMessage: ChatMessage = {
          id: `image-${Date.now()}`,
          type: 'gemini-image',
          content: content,
          timestamp: new Date(),
          metadata: { isStreaming: true },
        }
        setMessages(prev => [...prev, imageMessage])
        
        // Use image generation
        await gemini.generateImage(content, {
          width: 512,
          height: 512,
          numInferenceSteps: 20,
          guidanceScale: 7.5,
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsThinking(false)
    }
  }, [gemini])

  const regenerateLastResponse = useCallback(async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.type === 'user')
    if (lastUserMessage) {
      // Remove the last AI response
      setMessages(prev => {
        const lastAiIndex = prev.map(m => m.type).lastIndexOf('ai')
        if (lastAiIndex !== -1) {
          return prev.slice(0, lastAiIndex)
        }
        return prev
      })
      
      // Regenerate response
      await sendMessage(lastUserMessage.content)
    }
  }, [messages, sendMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
    gemini.reset()
  }, [gemini])

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  return {
    messages,
    isThinking,
    isGenerating: gemini.isGenerating,
    isStreaming: gemini.isStreaming,
    error: gemini.error,
    rateLimit: gemini.rateLimit,
    sendMessage,
    regenerateLastResponse,
    clearMessages,
    setMessages,
    copyMessage,
    clearError: gemini.clearError,
  }
}