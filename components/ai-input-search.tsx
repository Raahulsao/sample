"use client"

/**
 * @author: @kokonutui
 * @description: AI Input Search
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Globe, Paperclip, Send, Image } from "lucide-react"
import { useState, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea"

interface AIInputSearchProps {
  onSubmit?: (value: string, type?: 'text' | 'image') => void
  placeholder?: string
  className?: string
  disabled?: boolean
  isGenerating?: boolean
}

export default function AIInputSearch({ onSubmit, placeholder = "Search the web...", className, disabled = false, isGenerating = false }: AIInputSearchProps) {
  const [value, setValue] = useState("")
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 52,
    maxHeight: 200,
  })
  const [showSearch, setShowSearch] = useState(true)
  const [showImageGeneration, setShowImageGeneration] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback(() => {
    if (value.trim() && onSubmit && !disabled && !isGenerating) {
      const type = showImageGeneration ? 'image' : 'text'
      onSubmit(value.trim(), type)
      setValue("")
      adjustHeight(true)
    }
  }, [value, onSubmit, disabled, isGenerating, showImageGeneration, adjustHeight])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const handleContainerClick = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!disabled && !isGenerating) {
      setValue(e.target.value)
      // Use requestAnimationFrame to avoid blocking the UI
      requestAnimationFrame(() => {
        adjustHeight()
      })
    }
  }, [disabled, isGenerating, adjustHeight])

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto">
        <div
          role="textbox"
          tabIndex={0}
          aria-label="Search input container"
          className={cn(
            "relative flex flex-col rounded-xl transition-all duration-200 w-full text-left cursor-text",
            "ring-1 ring-black/10 dark:ring-white/10",
            isFocused && "ring-black/20 dark:ring-white/20",
          )}
          onClick={handleContainerClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleContainerClick()
            }
          }}
        >
          <div className="overflow-y-auto max-h-[200px]">
            <Textarea
              id="ai-input-04"
              value={value}
              placeholder={isGenerating ? "AI is generating..." : showImageGeneration ? "Describe the image you want to generate..." : placeholder}
              disabled={disabled || isGenerating}
              className={cn(
                "w-full rounded-xl rounded-b-none px-4 py-3 bg-black/5 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 leading-[1.2]",
                (disabled || isGenerating) && "opacity-50 cursor-not-allowed"
              )}
              ref={textareaRef}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !disabled && !isGenerating) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              onChange={handleChange}
            />
          </div>
          <div className="h-12 bg-black/5 dark:bg-white/5 rounded-b-xl">
            <div className="absolute left-3 bottom-3 flex items-center gap-2">
              <label className="cursor-pointer rounded-lg p-2 bg-black/5 dark:bg-white/5">
                <input type="file" className="hidden" />
                <Paperclip className="w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" />
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowSearch(!showSearch)
                  if (showImageGeneration) setShowImageGeneration(false)
                }}
                className={cn(
                  "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8 cursor-pointer",
                  showSearch
                    ? "bg-sky-500/15 border-sky-400 text-sky-500"
                    : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white ",
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <motion.div
                    animate={{
                      rotate: showSearch ? 180 : 0,
                      scale: showSearch ? 1.1 : 1,
                    }}
                    whileHover={{
                      rotate: showSearch ? 180 : 15,
                      scale: 1.1,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 10,
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                    }}
                  >
                    <Globe className={cn("w-4 h-4", showSearch ? "text-sky-500" : "text-inherit")} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showSearch && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{
                        width: "auto",
                        opacity: 1,
                      }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm overflow-hidden whitespace-nowrap text-sky-500 shrink-0"
                    >
                      Search
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImageGeneration(!showImageGeneration)
                  if (showSearch) setShowSearch(false)
                }}
                className={cn(
                  "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8 cursor-pointer",
                  showImageGeneration
                    ? "bg-purple-500/15 border-purple-400 text-purple-500"
                    : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white ",
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <motion.div
                    animate={{
                      scale: showImageGeneration ? 1.1 : 1,
                    }}
                    whileHover={{
                      scale: 1.1,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 10,
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                    }}
                  >
                    <Image className={cn("w-4 h-4", showImageGeneration ? "text-purple-500" : "text-inherit")} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showImageGeneration && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{
                        width: "auto",
                        opacity: 1,
                      }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm overflow-hidden whitespace-nowrap text-purple-500 shrink-0"
                    >
                      Image
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <div className="absolute right-3 bottom-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || isGenerating || !value.trim()}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  value && !disabled && !isGenerating
                    ? "bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                    : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40",
                  (disabled || isGenerating || !value.trim()) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Send className={cn("w-4 h-4", isGenerating && "animate-pulse")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
