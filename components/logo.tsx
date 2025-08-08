export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 flex items-center justify-center">
        <span className="text-white dark:text-gray-900 font-bold text-sm">AI</span>
      </div>
      <span className="font-semibold text-lg text-foreground">ChatAI</span>
    </div>
  )
}
