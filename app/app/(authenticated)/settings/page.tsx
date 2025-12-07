'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Check, Key } from 'lucide-react'

export default function SettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Load API key on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini-api-key')
      if (storedKey) {
        setGeminiApiKey(storedKey)
      }
    }
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (typeof window !== 'undefined') {
        if (geminiApiKey.trim()) {
          localStorage.setItem('gemini-api-key', geminiApiKey.trim())
        } else {
          localStorage.removeItem('gemini-api-key')
        }
      }

      setIsSaved(true)
      setTimeout(() => {
        setIsSaved(false)
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your API keys and preferences
            </p>
          </div>

          {/* API Key Section */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Gemini API Key</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-api-key" className="text-sm font-medium">
                  API Key
                </Label>
                <Input
                  id="gemini-api-key"
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  disabled={isSaving}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Required for keyword generation and website analysis. Get your free key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSaving || !geminiApiKey.trim()}
                  className="gap-2"
                >
                  {isSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved
                    </>
                  ) : isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save API Key
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Success Message */}
            {isSaved && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  API key saved successfully!
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
              🔐 Your API Key is Secure
            </h3>
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally in your browser only. It's never sent to our servers
              and is only used for direct communication with Google's AI services.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

