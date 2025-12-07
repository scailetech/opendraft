/**
 * Hook for managing saved filter presets
 * Saves frequently used filter combinations to localStorage
 */

import { useState, useEffect, useCallback } from 'react'

export interface FilterPreset {
  id: string
  name: string
  filters: {
    model?: string | null
    status?: string | null
    dateRange?: string | { from: Date; to: Date }
  }
  createdAt: Date
  lastUsed?: Date
}

const STORAGE_KEY = 'bulk-gpt-saved-filters'
const MAX_PRESETS = 10

export function useSavedFilters() {
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load presets from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as FilterPreset[]
        // Convert date strings back to Date objects
        const presetsWithDates = parsed.map(preset => ({
          ...preset,
          createdAt: new Date(preset.createdAt),
          lastUsed: preset.lastUsed ? new Date(preset.lastUsed) : undefined,
        }))
        setPresets(presetsWithDates)
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save preset
  const savePreset = useCallback((name: string, filters: FilterPreset['filters']) => {
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name,
      filters,
      createdAt: new Date(),
      lastUsed: new Date(),
    }

    const updated = [newPreset, ...presets].slice(0, MAX_PRESETS)
    setPresets(updated)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save filter preset:', error)
      }
    }

    return newPreset
  }, [presets])

  // Update last used timestamp
  const updateLastUsed = useCallback((id: string) => {
    const updated = presets.map(preset =>
      preset.id === id
        ? { ...preset, lastUsed: new Date() }
        : preset
    )
    // Sort by lastUsed (most recent first)
    updated.sort((a, b) => {
      const aTime = a.lastUsed?.getTime() || a.createdAt.getTime()
      const bTime = b.lastUsed?.getTime() || b.createdAt.getTime()
      return bTime - aTime
    })
    
    setPresets(updated)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to update filter preset:', error)
      }
    }
  }, [presets])

  // Delete preset
  const deletePreset = useCallback((id: string) => {
    const updated = presets.filter(preset => preset.id !== id)
    setPresets(updated)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to delete filter preset:', error)
      }
    }
  }, [presets])

  // Check if current filters match a preset
  const findMatchingPreset = useCallback((filters: FilterPreset['filters']) => {
    return presets.find(preset => {
      const p = preset.filters
      return (
        p.model === filters.model &&
        p.status === filters.status &&
        JSON.stringify(p.dateRange) === JSON.stringify(filters.dateRange)
      )
    })
  }, [presets])

  return {
    presets,
    isLoading,
    savePreset,
    updateLastUsed,
    deletePreset,
    findMatchingPreset,
  }
}

