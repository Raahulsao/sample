"use client"

import { useRef, useCallback } from "react"

interface UseAutoResizeTextareaOptions {
  minHeight?: number
  maxHeight?: number
}

export function useAutoResizeTextarea({ minHeight = 52, maxHeight = 200 }: UseAutoResizeTextareaOptions = {}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset = false) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = "auto"
      const scrollHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${scrollHeight}px`
    },
    [minHeight, maxHeight],
  )

  return { textareaRef, adjustHeight }
}
