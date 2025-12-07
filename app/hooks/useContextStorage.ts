/**
 * Hook for managing business context in localStorage
 * Simplified version for standalone use
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BusinessContext {
  // Core fields
  companyName?: string
  companyWebsite?: string
  icp?: string
  valueProposition?: string
  
  // Arrays
  countries?: string[]
  products?: string[]
  targetKeywords?: string[]
  competitorKeywords?: string[]
  marketingGoals?: string[]
  
  // Legacy context fields
  tone?: string
  productDescription?: string
  competitors?: string
  targetIndustries?: string
  complianceFlags?: string
  productType?: string
  gtmPlaybook?: string
  
  // Company info
  legalEntity?: string
  vatNumber?: string
  registrationNumber?: string
  imprintUrl?: string
  contactEmail?: string
  contactPhone?: string
  linkedInUrl?: string
  twitterUrl?: string
  githubUrl?: string
}

const STORAGE_KEY = 'bulk-gpt-business-context'

export function useContextStorage() {
  const [businessContext, setBusinessContext] = useState<BusinessContext>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
        setBusinessContext(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load context from localStorage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save to localStorage whenever context changes
  const saveContext = useCallback((newContext: BusinessContext) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContext))
      setBusinessContext(newContext)
    } catch (error) {
      console.error('Failed to save context to localStorage:', error)
    }
  }, [])

  const updateContext = useCallback((updates: Partial<BusinessContext>) => {
    setBusinessContext(prev => {
      const newContext = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newContext))
    } catch (error) {
        console.error('Failed to save context:', error)
      }
      return newContext
    })
  }, [])

  const clearContext = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setBusinessContext({})
    } catch (error) {
      console.error('Failed to clear context:', error)
    }
  }, [])

  const hasContext = Object.keys(businessContext).some(key => {
    const value = businessContext[key as keyof BusinessContext]
    return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  })

  return {
    context: businessContext, // Legacy alias
    businessContext,
    updateContext,
    updateBusinessContext: updateContext, // Alias for compatibility
    clearContext,
    hasContext,
    isLoading,
  }
}
