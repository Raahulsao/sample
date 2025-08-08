'use client'

import { AlertCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface HuggingFaceSetupErrorProps {
  error: string
}

export function HuggingFaceSetupError({ error }: HuggingFaceSetupErrorProps) {
  const [copied, setCopied] = useState(false)
  
  const isPermissionError = error.includes('permissions') || error.includes('403')
  const isTokenError = error.includes('token') || error.includes('401')
  
  const handleCopyToken = async () => {
    await navigator.clipboard.writeText('HUGGINGFACE_API_TOKEN=hf_your_new_token_here')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isPermissionError && !isTokenError) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 mb-2">
            Hugging Face Setup Required
          </h3>
          
          <p className="text-red-700 mb-4">
            {error}
          </p>

          {isPermissionError && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">
                  🔧 How to Fix: Create a Token with Write Permissions
                </h4>
                <ol className="text-sm text-red-700 space-y-2 list-decimal list-inside">
                  <li>Go to <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Hugging Face Settings <ExternalLink className="w-3 h-3" />
                  </a></li>
                  <li>Click "New token"</li>
                  <li><strong>Important:</strong> Select "Write" permissions (not "Read")</li>
                  <li>Name it "Image Generation" or similar</li>
                  <li>Copy the token (starts with hf_)</li>
                  <li>Replace the token in your .env.local file</li>
                  <li>Restart your development server</li>
                </ol>
              </div>

              <div className="bg-gray-100 p-3 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Update your .env.local file:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToken}
                    className="h-6 px-2 text-xs"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <code className="text-xs bg-gray-200 p-2 rounded block">
                  HUGGINGFACE_API_TOKEN=hf_your_new_token_here
                </code>
              </div>
            </div>
          )}

          {isTokenError && !isPermissionError && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">
                  🔧 How to Fix: Check Your Token
                </h4>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Make sure your token starts with "hf_"</li>
                  <li>Verify you copied the entire token</li>
                  <li>Check for extra spaces or characters</li>
                  <li>Restart your development server after changes</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700">
              💡 <strong>Why Write permissions?</strong> The Hugging Face Inference API requires Write permissions to generate images, even though you're not actually writing to repositories.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}