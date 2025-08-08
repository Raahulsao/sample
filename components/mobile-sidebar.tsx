'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Menu, 
  X, 
  MessageSquare, 
  History, 
  Settings, 
  Sun, 
  Moon, 
  LogOut,
  Plus,
  Trash2,
  User
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatHistory {
  id: string
  title: string
  timestamp: Date
  messageCount: number
}

interface MobileSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  userData: { name: string; email: string } | null
  onLogout: () => void
  onNewChat: () => void
  chatHistory: ChatHistory[]
  onLoadChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  currentChatId?: string
}

export function MobileSidebar({
  isOpen,
  onToggle,
  onClose,
  userData,
  onLogout,
  onNewChat,
  chatHistory,
  onLoadChat,
  onDeleteChat,
  currentChatId
}: MobileSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNewChat = () => {
    onNewChat()
    onClose()
  }

  const handleLoadChat = (chatId: string) => {
    onLoadChat(chatId)
    onClose()
  }

  const formatChatTitle = (title: string) => {
    return title.length > 30 ? title.substring(0, 30) + '...' : title
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return timestamp.toLocaleDateString()
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border border-border/50"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border z-50 md:hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">ChatAI</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* New Chat Button */}
              <Button 
                onClick={handleNewChat}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Chats
                </h3>
                
                {chatHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No chat history yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chatHistory.map((chat) => (
                      <div
                        key={chat.id}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                          currentChatId === chat.id && "bg-muted"
                        )}
                        onClick={() => handleLoadChat(chat.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {formatChatTitle(chat.title)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(chat.timestamp)} • {chat.messageCount} messages
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteChat(chat.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-2">
              {/* Theme Toggle */}
              {mounted && (
                <Button
                  variant="ghost"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-full justify-start gap-2"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </>
                  )}
                </Button>
              )}

              {/* User Profile */}
              {userData && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{userData.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{userData.email}</div>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}