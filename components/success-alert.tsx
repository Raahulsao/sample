import { CircleCheckIcon } from "lucide-react"

interface SuccessAlertProps {
  message?: string
  className?: string
}

export default function SuccessAlert({ message = "Completed successfully!", className = "" }: SuccessAlertProps) {
  return (
    <div className={`border border-border rounded-md px-4 py-3 bg-background ${className}`}>
      <p className="text-sm text-foreground">
        <CircleCheckIcon
          className="me-3 -mt-0.5 inline-flex text-emerald-500 dark:text-emerald-400"
          size={16}
          aria-hidden="true"
        />
        {message}
      </p>
    </div>
  )
}
