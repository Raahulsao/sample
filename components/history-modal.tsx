"use client"

import type React from "react"

import { useState } from "react"
import { X, MessageSquare, Trash2, Search } from "lucide-react"

interface HistoryItem {
  id: string
  title: string
  preview: string
  timestamp: Date
  messageCount: number
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat?: (chatId: string) => void
}

const mockHistory: HistoryItem[] = [
  {
    id: "1",
    title: "Creative Writing Help",
    preview: "Can you help me write a creative story about a robot discovering emotions?",
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    messageCount: 8,
  },
  {
    id: "2",
    title: "Quantum Computing Explanation",
    preview: "Explain quantum computing simply",
    timestamp: new Date(Date.now() - 172800000), // 2 days ago
    messageCount: 12,
  },
  {
    id: "3",
    title: "Trip Planning",
    preview: "Help me plan a trip to Japan",
    timestamp: new Date(Date.now() - 259200000), // 3 days ago
    messageCount: 15,
  },
  {
    id: "4",
    title: "Workout Plan",
    preview: "Create a workout plan for beginners",
    timestamp: new Date(Date.now() - 345600000), // 4 days ago
    messageCount: 6,
  },
  {
    id: "5",
    title: "Poetry Writing",
    preview: "Write a poem about the future",
    timestamp: new Date(Date.now() - 432000000), // 5 days ago
    messageCount: 4,
  },
]

export default function HistoryModal({ isOpen, onClose, onSelectChat }: HistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredHistory, setFilteredHistory] = useState(mockHistory)

  if (!isOpen) return null

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    const filtered = mockHistory.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.preview.toLowerCase().includes(query.toLowerCase()),
    )
    setFilteredHistory(filtered)
  }

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = filteredHistory.filter((item) => item.id !== chatId)
    setFilteredHistory(updated)
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Chat History</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="form-input pl-10"
            placeholder="Search conversations..."
          />
        </div>

        {/* History List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{searchQuery ? "No conversations found" : "No chat history yet"}</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => {
                  onSelectChat?.(item.id)
                  onClose()
                }}
              >
                <div className="flex-shrink-0">
                  <MessageSquare size={20} className="text-muted-foreground" />
                </div>
                <div className="history-item-content">
                  <div className="history-item-title">{item.title}</div>
                  <div className="text-xs text-muted-foreground mb-1">{item.preview}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(item.timestamp)}</span>
                    <span>•</span>
                    <span>{item.messageCount} messages</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteChat(item.id, e)}
                  className="flex-shrink-0 p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
