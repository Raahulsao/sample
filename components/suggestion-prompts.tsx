'use client'

import { motion } from 'motion/react'
import { Sparkles, BookOpen, Code, Lightbulb, Palette, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuggestionPromptsProps {
  onSelectPrompt: (prompt: string) => void
  className?: string
}

const suggestions = [
  {
    icon: Sparkles,
    title: "Write a poem",
    prompt: "Write a beautiful poem about the changing seasons",
    category: "Creative"
  },
  {
    icon: BookOpen,
    title: "Explain quantum theory",
    prompt: "Explain quantum physics in simple terms that anyone can understand",
    category: "Educational"
  },
  {
    icon: Code,
    title: "Code a function",
    prompt: "Write a JavaScript function to sort an array of objects by date",
    category: "Programming"
  },
  {
    icon: Lightbulb,
    title: "Brainstorm ideas",
    prompt: "Give me 10 creative business ideas for a small startup",
    category: "Ideas"
  },
  {
    icon: Palette,
    title: "Design inspiration",
    prompt: "Suggest color palettes for a modern website design",
    category: "Design"
  },
  {
    icon: Calculator,
    title: "Solve a problem",
    prompt: "Help me calculate compound interest for a $10,000 investment",
    category: "Math"
  }
]

export function SuggestionPrompts({ onSelectPrompt, className }: SuggestionPromptsProps) {
  return (
    <div className={className}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">What can I help you with?</h3>
        <p className="text-muted-foreground text-sm">
          Choose a suggestion below or type your own message
        </p>
      </div>

      <div className="suggestion-prompt-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon
          return (
            <motion.div
              key={suggestion.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <Button
                variant="outline"
                onClick={() => onSelectPrompt(suggestion.prompt)}
                className="suggestion-prompt-card w-full h-full p-4 text-left hover:bg-muted/50 transition-colors group"
              >
                <div className="suggestion-prompt-content">
                  <div className="suggestion-prompt-icon bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="suggestion-prompt-text">
                    <div>
                      <div className="suggestion-prompt-title">{suggestion.title}</div>
                      <div className="suggestion-prompt-description">
                        {suggestion.prompt}
                      </div>
                    </div>
                    <div className="suggestion-prompt-category">
                      {suggestion.category}
                    </div>
                  </div>
                </div>
              </Button>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-muted-foreground">
          💡 Tip: You can also generate images by clicking the purple image button
        </p>
      </div>
    </div>
  )
}