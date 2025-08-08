import { CircleAlert } from "lucide-react"

interface ErrorAlertProps {
  message?: string
  className?: string
}

export default function ErrorAlert({ message = "An error occurred!", className = "" }: ErrorAlertProps) {
  return (
    <div className={`rounded-md border border-border px-4 py-3 bg-background ${className}`}>
      <p className="text-sm text-foreground">
        <CircleAlert className="me-3 -mt-0.5 inline-flex text-red-500 dark:text-red-400" size={16} aria-hidden="true" />
        {message}
      </p>
    </div>
  )
}
