'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatMessage } from './use-chat-gemini'

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  timestamp: Date
  messageCount: number
}

export interface UseChatHistoryReturn {
  sessions: ChatSession[]
  currentSessionId: string | null
  createNewSession: () => string
  saveSession: (sessionId: string, messages: ChatMessage[]) => void
  loadSession: (sessionId: string) => ChatMessage[]
  deleteSession: (sessionId: string) => void
  clearAllSessions: () => void
  updateSessionTitle: (sessionId: string, title: string) => void
}

const STORAGE_KEY = 'chatai-history'
const MAX_SESSIONS = 50 // Limit to prevent storage bloat

export function useChatHistory(): UseChatHistoryReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Ensure we're hydrated before accessing localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Load sessions from localStorage on mount (only after hydration)
  useEffect(() => {
    if (!isHydrated) return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
        setSessions(sessionsWithDates)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }, [isHydrated])

  // Save sessions to localStorage whenever sessions change (only after hydration)
  useEffect(() => {
    if (!isHydrated) return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save chat history:', error)
    }
  }, [sessions, isHydrated])

  const generateSessionTitle = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(msg => msg.type === 'user')
    if (firstUserMessage) {
      const title = firstUserMessage.content.trim()
      return title.length > 50 ? title.substring(0, 50) + '...' : title
    }
    return `Chat ${new Date().toLocaleDateString()}`
  }

  const createNewSession = useCallback((): string => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setCurrentSessionId(newSessionId)
    return newSessionId
  }, [])

  const saveSession = useCallback((sessionId: string, messages: ChatMessage[]) => {
    if (messages.length === 0) return

    setSessions(prevSessions => {
      const existingIndex = prevSessions.findIndex(s => s.id === sessionId)
      const title = generateSessionTitle(messages)
      
      const updatedSession: ChatSession = {
        id: sessionId,
        title,
        messages: [...messages],
        timestamp: new Date(),
        messageCount: messages.length
      }

      let newSessions: ChatSession[]
      
      if (existingIndex >= 0) {
        // Update existing session
        newSessions = [...prevSessions]
        newSessions[existingIndex] = updatedSession
      } else {
        // Add new session
        newSessions = [updatedSession, ...prevSessions]
      }

      // Limit the number of sessions
      if (newSessions.length > MAX_SESSIONS) {
        newSessions = newSessions.slice(0, MAX_SESSIONS)
      }

      // Sort by timestamp (newest first)
      return newSessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    })
  }, [])

  const loadSession = useCallback((sessionId: string): ChatMessage[] => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      return [...session.messages]
    }
    return []
  }, [sessions])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
    }
  }, [currentSessionId])

  const clearAllSessions = useCallback(() => {
    setSessions([])
    setCurrentSessionId(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId 
          ? { ...session, title }
          : session
      )
    )
  }, [])

  return {
    sessions,
    currentSessionId,
    createNewSession,
    saveSession,
    loadSession,
    deleteSession,
    clearAllSessions,
    updateSessionTitle
  }
}