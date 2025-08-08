"use client"

import { useState } from "react"
import { Settings, LogOut, Edit3 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import ProfileAvatar from "./profile-avatar"

interface UserProfileCardProps {
  userData: { name: string; email: string }
  onLogout: () => void
  onEditProfile: () => void
}

export default function UserProfileCard({ userData, onLogout, onEditProfile }: UserProfileCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <ProfileAvatar size="sm" />
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-foreground">{userData.name}</div>
            <div className="text-xs text-muted-foreground">{userData.email}</div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <ProfileAvatar size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{userData.name}</div>
              <div className="text-sm text-muted-foreground truncate">{userData.email}</div>
            </div>
          </div>
        </div>

        <div className="p-2">
          <button
            onClick={() => {
              onEditProfile()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <Edit3 size={16} />
            Edit Profile
          </button>

          <button
            onClick={() => {
              /* Handle settings */
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>

          <div className="border-t border-border my-2" />

          <button
            onClick={() => {
              onLogout()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
