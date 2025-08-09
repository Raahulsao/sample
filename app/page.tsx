"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Copy, RotateCcw, ImageIcon, Bot, User, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useChatGemini } from "@/hooks/use-chat-gemini"
import { useChatHistory } from "@/hooks/use-chat-history"
import { useIsMobile } from "@/hooks/use-mobile"

import AIInputSearch from "@/components/ai-input-search"
import SimpleAppHeader from "@/components/simple-app-header"
import { MobileHeader } from "@/components/mobile-header"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { SuggestionPrompts } from "@/components/suggestion-prompts"
import ThinkingIndicator from "@/components/thinking-indicator"
import LandingPage from "@/components/landing-page"
import { RateLimitAlert } from "@/components/rate-limit-alert"

import { HuggingFaceSetupError } from "@/components/huggingface-setup-error"



export default function ChatInterface() {
  const [isTextMode, setIsTextMode] = useState(true)
  const [showError, setShowError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use Auth0 authentication state
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  
  // Use mobile detection
  const isMobile = useIsMobile()
  
  // Use chat history
  const chatHistory = useChatHistory()

  // Use Gemini chat integration
  const chat = useChatGemini({
    onError: (error) => {
      setShowError(true)
    }
  })



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat.messages, chat.isThinking, chat.isStreaming])

  // Auto-save chat messages to history
  useEffect(() => {
    if (chatHistory.currentSessionId && chat.messages.length > 0) {
      chatHistory.saveSession(chatHistory.currentSessionId, chat.messages)
    }
  }, [chat.messages, chatHistory.currentSessionId, chatHistory.saveSession])

  const handleSendMessage = async (value: string, type?: 'text' | 'image') => {
    setShowError(false)
    const messageType = type || 'text'
    setIsTextMode(messageType === 'text')
    
    // Create new session if none exists
    if (!chatHistory.currentSessionId) {
      chatHistory.createNewSession()
    }
    
    await chat.sendMessage(value, messageType === 'text')
  }

  const handleLogin = (userData: { name: string; email: string }) => {
    // This is now handled by Auth0 context
  }

  const handleLogout = () => {
    logout()
    chat.clearMessages()
    chatHistory.clearAllSessions()
  }

  const handleNewChat = () => {
    // Save current session if it has messages
    if (chatHistory.currentSessionId && chat.messages.length > 0) {
      chatHistory.saveSession(chatHistory.currentSessionId, chat.messages)
    }
    
    // Create new session and clear messages
    chatHistory.createNewSession()
    chat.clearMessages()
    setSidebarOpen(false)
  }

  const handleLoadChat = (sessionId: string) => {
    // Save current session if it has messages
    if (chatHistory.currentSessionId && chat.messages.length > 0) {
      chatHistory.saveSession(chatHistory.currentSessionId, chat.messages)
    }
    
    // Load the selected session
    const messages = chatHistory.loadSession(sessionId)
    chat.setMessages(messages)
  }

  const handleDeleteChat = (sessionId: string) => {
    chatHistory.deleteSession(sessionId)
    
    // If we deleted the current session, start a new one
    if (chatHistory.currentSessionId === sessionId) {
      chat.clearMessages()
      chatHistory.createNewSession()
    }
  }

  // Memoize the loading component to prevent flashing
  const loadingComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    </div>
  ), [])

  // Memoize the landing page to prevent flashing
  const landingComponent = useMemo(() => (
    <LandingPage onLogin={handleLogin} />
  ), [handleLogin])

  // Show loading state while checking authentication
  if (isLoading) {
    return loadingComponent
  }

  // Show landing page if user is not authenticated
  if (!isAuthenticated) {
    return landingComponent
  }

  return (
    <div className="chat-container">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onClose={() => setSidebarOpen(false)}
          userData={user ? { name: user.name, email: user.email } : null}
          onLogout={handleLogout}
          onNewChat={handleNewChat}
          chatHistory={chatHistory.sessions.map(session => ({
            id: session.id,
            title: session.title,
            timestamp: session.timestamp,
            messageCount: session.messageCount
          }))}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          currentChatId={chatHistory.currentSessionId || undefined}
        />

        {/* Mobile Header */}
        <MobileHeader />
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <SimpleAppHeader 
          userData={user ? { name: user.name, email: user.email } : null} 
          onLogout={handleLogout}
        />
      </div>

      {/* Chat Messages */}
      <main className="chat-messages">
        {/* Error Alert */}
        {showError && chat.error && (
          <div className="px-4 py-2">
            {chat.error.message.includes('Hugging Face') || chat.error.message.includes('permissions') ? (
              <HuggingFaceSetupError error={chat.error.message} />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <AlertCircle size={16} />
                <span className="text-sm">{chat.error.message}</span>
                <button
                  onClick={() => setShowError(false)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rate Limit Alert */}
        {chat.rateLimit.isRateLimited && (
          <div className="px-4 py-2">
            <RateLimitAlert
              isRateLimited={chat.rateLimit.isRateLimited}
              retryAfter={chat.rateLimit.retryAfter}
              quotaUsage={chat.rateLimit.quotaUsage}
              message={chat.rateLimit.message}
              onRetry={() => chat.clearError()}
            />
          </div>
        )}

        {chat.messages.length === 0 ? (
          <div className="empty-state">
            <SuggestionPrompts 
              onSelectPrompt={handleSendMessage}
              className="px-4 py-8"
            />
          </div>
        ) : (
          <>
            {chat.messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">{message.type === "user" ? <User size={20} /> : <Bot size={20} />}</div>
                <div className="message-content">
                  <div className="message-bubble">
                    {message.type === 'gemini-image' ? (
                      <div className="flex flex-col items-center gap-3 p-6 bg-muted/50 border-2 border-dashed border-border rounded-lg">
                        <ImageIcon size={32} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Generated Image</span>
                      </div>
                    ) : (
                      <p className="mb-0 whitespace-pre-wrap">
                        {message.content}
                        {chat.isStreaming && message.id === chat.messages[chat.messages.length - 1]?.id && (
                          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                        )}
                      </p>
                    )}
                  </div>
                  <div className="message-actions">
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {message.type === "ai" && !(chat.isStreaming && message.id === chat.messages[chat.messages.length - 1]?.id) && (
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          onClick={() => chat.copyMessage(message.content)}
                          title="Copy message"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="action-btn"
                          onClick={chat.regenerateLastResponse}
                          title="Regenerate response"
                          disabled={chat.isGenerating}
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking Indicator */}
            {chat.isThinking && (
              <div className="message ai">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content">
                  <ThinkingIndicator message="AI is analyzing your request..." />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="chat-input">
        <AIInputSearch
          onSubmit={handleSendMessage}
          placeholder={isTextMode ? "Message ChatAI..." : "Describe the image you want to generate..."}
          className="p-0"
          disabled={chat.isGenerating || chat.rateLimit.isRateLimited}
        />
      </footer>


    </div>
  )
}
