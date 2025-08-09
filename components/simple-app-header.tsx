"use client"

import { useState, useCallback } from "react"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"
import ThemeChanger from "@/components/theme-changer"
import AuthModal from "@/components/auth-modal"
import HistoryModal from "@/components/history-modal"
import ProfileModal from "@/components/profile-modal"
import { Menu, Plus, LogOut, Settings } from "lucide-react"

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
}

export default function SimpleAppHeader({ userData, onLogout }: AppHeaderProps = {}) {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "signin" | "signup" }>({
    isOpen: false,
    mode: "signin",
  })
  const [historyModal, setHistoryModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const isSignedIn = !!userData

  const handleNavAction = useCallback((action?: string) => {
    if (action === "history") {
      setHistoryModal(true)
    }
    setMobileMenuOpen(false)
  }, [])

  const handleNewChat = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <>
      <header className="app-header">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            <div className="relative md:hidden">
              <Button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost" 
                size="icon"
              >
                <Menu size={20} />
              </Button>
              
              {/* Mobile menu dropdown */}
              {mobileMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-2">
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
                </div>
              )}
            </div>

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
            {/* New Chat Button - Desktop */}
            <Button onClick={handleNewChat} variant="ghost" size="sm" title="New Chat">
              <Plus size={16} />
              <span className="ml-2">New Chat</span>
            </Button>

            {/* Theme Changer */}
            <ThemeChanger />

            {/* Auth Buttons or Profile */}
            {isSignedIn ? (
              <div className="relative">
                <Button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {userData!.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm">{userData!.name}</span>
                </Button>

                {/* Profile dropdown */}
                {profileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm border-b border-border mb-2">
                        <div className="font-medium">{userData!.name}</div>
                        <div className="text-muted-foreground text-xs">{userData!.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          setProfileModal(true)
                          setProfileMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Settings size={16} />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          onLogout?.()
                          setProfileMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2 text-red-600"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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


          </div>
        </div>

        {/* Click outside to close dropdowns */}
        {(mobileMenuOpen || profileMenuOpen) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setMobileMenuOpen(false)
              setProfileMenuOpen(false)
            }}
          />
        )}
      </header>

      {/* Modals */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={useCallback(() => setAuthModal({ isOpen: false, mode: "signin" }), [])}
        initialMode={authModal.mode}
      />

      <HistoryModal
        isOpen={historyModal}
        onClose={() => setHistoryModal(false)}
        onSelectChat={(chatId) => {
          // Handle chat selection
        }}
      />

      <ProfileModal
        isOpen={profileModal}
        onClose={() => setProfileModal(false)}
        onSignOut={() => {
          onLogout?.()
        }}
        userData={userData}
      />
    </>
  )
}