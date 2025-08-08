"use client"

import { useState } from "react"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import ThemeChanger from "@/components/theme-changer"
import AuthModal from "@/components/auth-modal"
import HistoryModal from "@/components/history-modal"
import ProfileModal from "@/components/profile-modal"
import UserProfileCard from "@/components/user-profile-card"
import { Menu, History, Plus } from "lucide-react"

// Navigation links array to be used in both desktop and mobile menus
const navigationLinks = [
  { href: "#", label: "Chat", active: true },
  { href: "#", label: "History", action: "history" },
  { href: "#", label: "Settings" },
  { href: "#", label: "About" },
]

interface AppHeaderProps {
  userData?: { name: string; email: string } | null
  onLogout?: () => void
  className?: string
}

export default function AppHeader({ userData, onLogout, className }: AppHeaderProps = {}) {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "signin" | "signup" }>({
    isOpen: false,
    mode: "signin",
  })
  const [historyModal, setHistoryModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isSignedIn = !!userData

  const handleNavAction = (action?: string) => {
    if (action === "history") {
      setHistoryModal(true)
    }
    setMobileMenuOpen(false)
  }

  const handleNewChat = () => {
    // Handle new chat logic
    window.location.reload() // Simple refresh for demo
  }

  return (
    <>
      <header className={`app-header ${className || ''}`}>
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <PopoverTrigger asChild>
                <Button className="md:hidden" variant="ghost" size="icon">
                  <Menu size={20} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-2 md:hidden">
                <div className="space-y-1">
                  {navigationLinks.map((link, index) => (
                    <button
                      key={index}
                      onClick={() => handleNavAction(link.action)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Logo */}
            <a href="#" className="text-foreground hover:text-foreground/90">
              <Logo />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    if (link.action) {
                      e.preventDefault()
                      handleNavAction(link.action)
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                  data-active={link.active}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* New Chat Button - Mobile */}
            <Button onClick={handleNewChat} variant="ghost" size="icon" className="md:hidden" title="New Chat">
              <Plus size={20} />
            </Button>

            {/* History Button - Mobile */}
            <Button
              onClick={() => setHistoryModal(true)}
              variant="ghost"
              size="icon"
              className="md:hidden"
              title="Chat History"
            >
              <History size={20} />
            </Button>

            {/* Theme Changer */}
            <div className="hidden sm:block">
              <ThemeChanger />
            </div>

            {/* Auth Buttons or Profile */}
            {isSignedIn ? (
              <UserProfileCard
                userData={userData!}
                onLogout={() => onLogout?.()}
                onEditProfile={() => setProfileModal(true)}
              />
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  onClick={() => setAuthModal({ isOpen: true, mode: "signin" })}
                  variant="ghost"
                  size="sm"
                  className="text-sm"
                >
                  Sign In
                </Button>
                <Button onClick={() => setAuthModal({ isOpen: true, mode: "signup" })} size="sm" className="text-sm">
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Profile/Auth */}
            <div className="sm:hidden">
              {isSignedIn ? (
                <UserProfileCard
                  userData={userData!}
                  onLogout={() => onLogout?.()}
                  onEditProfile={() => setProfileModal(true)}
                />
              ) : (
                <Button
                  onClick={() => setAuthModal({ isOpen: true, mode: "signin" })}
                  size="sm"
                  className="text-xs px-3"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, mode: "signin" })}
        initialMode={authModal.mode}
      />

      <HistoryModal
        isOpen={historyModal}
        onClose={() => setHistoryModal(false)}
        onSelectChat={(chatId) => {
          console.log("Selected chat:", chatId)
          // Handle chat selection
        }}
      />

      <ProfileModal
        isOpen={profileModal}
        onClose={() => setProfileModal(false)}
        onSignOut={() => {
          onLogout?.()
          // Handle sign out
        }}
        userData={userData}
      />
    </>
  )
}
