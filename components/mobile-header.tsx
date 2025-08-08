'use client'


import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  className?: string
}

export function MobileHeader({ className }: MobileHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border",
      "md:hidden", // Only show on mobile
      className
    )}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - placeholder for hamburger menu */}
        <div className="w-10"></div>
        
        {/* Center - Title */}
        <span className="font-semibold text-lg">Chat</span>
        
        {/* Right side - placeholder */}
        <div className="w-10"></div>
      </div>
    </header>
  )
}