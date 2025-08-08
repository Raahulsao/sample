'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Download, Maximize2, X, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageDisplayProps {
  src: string
  alt?: string
  caption?: string
  className?: string
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  showActions?: boolean
}

export function ImageDisplay({ 
  src, 
  alt = "Generated image", 
  caption, 
  className,
  isLoading = false,
  error,
  onRetry,
  showActions = true
}: ImageDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generated-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const handleFullscreen = () => {
    setIsFullscreen(true)
  }

  const handleCloseFullscreen = () => {
    setIsFullscreen(false)
  }

  if (error || imageError) {
    return (
      <div className={cn(
        "relative rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4",
        className
      )}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">
              {error || "Failed to load image"}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn(
        "relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900",
        className
      )}>
        {/* Loading state */}
        <AnimatePresence>
          {(isLoading || !imageLoaded) && !imageError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isLoading ? "Generating image..." : "Loading image..."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image */}
        {src && !imageError && (
          <motion.img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-auto max-w-md transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: imageLoaded ? 1 : 0.95, 
              opacity: imageLoaded ? 1 : 0 
            }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Actions overlay */}
        {showActions && imageLoaded && !imageError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-2 right-2 flex gap-1"
          >
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="View fullscreen"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Download image"
            >
              <Download className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* Caption */}
        {caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-sm text-white">{caption}</p>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={handleCloseFullscreen}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={handleCloseFullscreen}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              {caption && (
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-white bg-black/50 rounded-lg px-4 py-2 inline-block">
                    {caption}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Loading skeleton component for image placeholders
export function ImageLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800",
      className
    )}>
      <div className="aspect-square w-full max-w-md">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    </div>
  )
}