"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, User, Mail, Settings, LogOut, Edit3, Camera } from "lucide-react"
import ProfileAvatar from "./profile-avatar"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSignOut?: () => void
  userData?: { name: string; email: string } | null
}

export default function ProfileModal({ isOpen, onClose, onSignOut, userData }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: userData?.name || "John Doe",
    email: userData?.email || "john.doe@example.com",
    bio: "AI enthusiast and creative writer",
  })

  useEffect(() => {
    if (userData) {
      setProfileData((prev) => {
        // Only update if the values are actually different
        if (prev.name !== userData.name || prev.email !== userData.email) {
          return {
            ...prev,
            name: userData.name,
            email: userData.email,
          }
        }
        return prev
      })
    }
  }, [userData])

  if (!isOpen) return null

  const handleSave = () => {
    setIsEditing(false)
    // Here you would typically save to your backend
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Profile Avatar Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <ProfileAvatar size="lg" />
            <button className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
              <Camera size={14} />
            </button>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">{profileData.name}</h3>
          <p className="text-sm text-muted-foreground">{profileData.email}</p>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleInputChange}
                className="form-input"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User size={18} className="text-muted-foreground" />
                <span className="text-foreground">{profileData.name}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                className="form-input"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Mail size={18} className="text-muted-foreground" />
                <span className="text-foreground">{profileData.email}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            {isEditing ? (
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleInputChange}
                className="form-input min-h-[80px] resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-foreground">{profileData.bio || "No bio added yet"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-6">
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={handleSave} className="form-button">
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-2 w-full p-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <Edit3 size={18} />
                Edit Profile
              </button>

              <button
                onClick={() => {
                  /* Handle settings */
                }}
                className="flex items-center justify-center gap-2 w-full p-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <Settings size={18} />
                Settings
              </button>

              <button
                onClick={() => {
                  onSignOut?.()
                  onClose()
                }}
                className="flex items-center justify-center gap-2 w-full p-3 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
