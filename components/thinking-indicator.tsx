"use client"

import React from "react"
import { Brain } from "lucide-react"

interface ThinkingIndicatorProps {
  message?: string
}

export default function ThinkingIndicator({ message = "AI is thinking..." }: ThinkingIndicatorProps) {
  return (
    <div className="thinking-indicator">
      <Brain size={16} className="text-muted-foreground" />
      <span>{message}</span>
      <div className="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}
