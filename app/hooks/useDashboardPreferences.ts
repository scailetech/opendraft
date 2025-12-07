/**
 * Hook for managing dashboard preferences
 * Saves user preferences to localStorage
 */

import { useState, useEffect, useCallback } from 'react'

export interface DashboardPreferences {
  autoRefresh: boolean
  refreshInterval: number // in milliseconds
  defaultDateRange: '7d' | '30d' | '90d' | 'all'
  chartVisibility: {
    tokenUsage: boolean
    batchStatus: boolean
    modelBreakdown: boolean
    recentActivity: boolean
  }
  collapsedSections: string[]
}

const STORAGE_KEY = 'bulk-gpt-dashboard-preferences'
const DEFAULT_PREFERENCES: DashboardPreferences = {
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  defaultDateRange: '30d',
  chartVisibility: {
    tokenUsage: true,
    batchStatus: true,
    modelBreakdown: true,
    recentActivity: true,
  },
  collapsedSections: [],
}

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardPreferences
        // Merge with defaults to handle new preferences
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          chartVisibility: {
            ...DEFAULT_PREFERENCES.chartVisibility,
            ...parsed.chartVisibility,
          },
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save preferences to localStorage
  const updatePreferences = useCallback((updates: Partial<DashboardPreferences>) => {
    setPreferences((prevPreferences) => {
      const updated = {
        ...prevPreferences,
        ...updates,
        chartVisibility: {
          ...prevPreferences.chartVisibility,
          ...(updates.chartVisibility || {}),
        },
      }
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
          console.error('Failed to save dashboard preferences:', error)
        }
      }
      
      return updated
    })
  }, [])

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Failed to reset dashboard preferences:', error)
      }
    }
  }, [])

  return {
    preferences,
    isLoading,
    updatePreferences,
    resetPreferences,
  }
}

