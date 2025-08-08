import { UserRoundIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ProfileAvatarProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function ProfileAvatar({ size = "md", className = "" }: ProfileAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarFallback className="bg-muted">
        <UserRoundIcon size={iconSizes[size]} className="opacity-60 text-muted-foreground" aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  )
}
