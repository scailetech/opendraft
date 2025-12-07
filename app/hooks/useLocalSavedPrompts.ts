/**
 * Simple localStorage-based saved prompts hook
 * Minimal implementation - no Supabase, no complex features
 */

import { useState, useEffect, useCallback } from 'react'

export interface LocalSavedPrompt {
  id: string
  name: string
  prompt: string
  savedAt: number
}

const STORAGE_KEY = 'bulk-gpt-saved-prompts'
const MAX_SAVED = 20 // Limit to prevent localStorage bloat

export function useLocalSavedPrompts() {
  const [prompts, setPrompts] = useState<LocalSavedPrompt[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as LocalSavedPrompt[]
        setPrompts(parsed.slice(0, MAX_SAVED))
      }
    } catch (error) {
      // Silent fail
    }
  }, [])

  // Save prompt
  const savePrompt = useCallback((name: string, prompt: string) => {
    if (typeof window === 'undefined') return

    const newPrompt: LocalSavedPrompt = {
      id: `prompt-${Date.now()}`,
      name: name.trim() || 'Untitled Prompt',
      prompt: prompt.trim(),
      savedAt: Date.now(),
    }

    const updated = [newPrompt, ...prompts].slice(0, MAX_SAVED)
    setPrompts(updated)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save prompt:', error)
    }

    return newPrompt
  }, [prompts])

  // Delete prompt
  const deletePrompt = useCallback((id: string) => {
    if (typeof window === 'undefined') return

    const updated = prompts.filter(p => p.id !== id)
    setPrompts(updated)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to delete prompt:', error)
    }
  }, [prompts])

  return {
    prompts,
    savePrompt,
    deletePrompt,
  }
}

