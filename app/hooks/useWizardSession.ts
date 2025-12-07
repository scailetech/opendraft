/**
 * ABOUTME: Custom hook for wizard session state persistence using localStorage
 * ABOUTME: Handles auto-save, restoration, validation, and cross-tab synchronization
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { devLog } from '@/lib/dev-logger'

const STORAGE_KEY = 'wizard-session'
const SESSION_EXPIRY_DAYS = 7
const DEBOUNCE_DELAY = 500 // ms

interface CSVData {
  headers: string[]
  rowCount: number
  preview: string[][]
}

interface Step1Data {
  file?: File
  csvData: CSVData
}

interface Step2Data {
  mode: 'quick' | 'custom'
  promptTemplate: string
  columnMapping: { [key: string]: string }
}

interface Step3Data {
  results: Array<{
    id: string
    input: string
    output: string
    status: string
  }>
  summary: {
    total: number
    completed: number
    failed: number
  }
}

interface WizardSessionData {
  currentStep: number
  step1Data: Step1Data | null
  step2Data: Step2Data | null
  step3Data: Step3Data | null
  timestamp: number
}

export function useWizardSession() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Validate step number is in valid range (1-3)
   */
  const clampStepNumber = (step: number): number => {
    return Math.max(1, Math.min(3, step))
  }

  /**
   * Check if session has expired (> 7 days old)
   */
  const isSessionExpired = (timestamp: number): boolean => {
    const expiryMs = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    return Date.now() - timestamp > expiryMs
  }

  /**
   * Validate restored session data structure
   */
  const validateSessionData = (data: unknown): data is WizardSessionData => {
    if (!data || typeof data !== 'object') return false
    const obj = data as Record<string, unknown>
    if (typeof obj.currentStep !== 'number') return false
    if (typeof obj.timestamp !== 'number') return false
    return true
  }

  /**
   * Load session from localStorage
   */
  const loadSession = useCallback((): WizardSessionData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data: unknown = JSON.parse(stored)

      if (!validateSessionData(data)) {
        devLog.warn('Invalid session data structure, resetting')
        return null
      }

      if (isSessionExpired(data.timestamp)) {
        devLog.log('Session expired, clearing')
        localStorage.removeItem(STORAGE_KEY)
        return null
      }

      // Clamp step number to valid range
      data.currentStep = clampStepNumber(data.currentStep)

      return data
    } catch (error) {
      devLog.error('Failed to load session from localStorage:', error)
      return null
    }
  }, [])

  /**
   * Save session to localStorage (debounced)
   */
  const saveSession = useCallback(
    (data: WizardSessionData) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        try {
          const sessionData = {
            ...data,
            timestamp: Date.now(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData))
        } catch (error) {
          devLog.error('Failed to save session to localStorage:', error)
          // Continue - state is still updated in memory
        }
      }, DEBOUNCE_DELAY)
    },
    []
  )

  /**
   * Save immediately (no debounce) for critical events like beforeunload
   */
  const saveSessionImmediately = useCallback(() => {
    try {
      const sessionData: WizardSessionData = {
        currentStep,
        step1Data,
        step2Data,
        step3Data,
        timestamp: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData))
    } catch (error) {
      devLog.error('Failed to save session immediately:', error)
    }
  }, [currentStep, step1Data, step2Data, step3Data])

  /**
   * Initialize session from localStorage on mount
   */
  useEffect(() => {
    const savedSession = loadSession()
    if (savedSession) {
      setCurrentStep(savedSession.currentStep)
      setStep1Data(savedSession.step1Data)
      setStep2Data(savedSession.step2Data)
      setStep3Data(savedSession.step3Data)
    }
    setIsInitialized(true)
  }, [loadSession])

  /**
   * Auto-save whenever state changes
   */
  useEffect(() => {
    if (!isInitialized) return // Don't save during initial load

    const sessionData: WizardSessionData = {
      currentStep,
      step1Data,
      step2Data,
      step3Data,
      timestamp: Date.now(),
    }

    saveSession(sessionData)
  }, [currentStep, step1Data, step2Data, step3Data, isInitialized, saveSession])

  /**
   * Listen for storage events (cross-tab synchronization)
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      if (!event.newValue) return

      try {
        const data = JSON.parse(event.newValue)
        if (!validateSessionData(data)) return

        setCurrentStep(clampStepNumber(data.currentStep))
        setStep1Data(data.step1Data)
        setStep2Data(data.step2Data)
        setStep3Data(data.step3Data)
      } catch (error) {
        devLog.error('Failed to sync from storage event:', error)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  /**
   * Save on beforeunload (browser close/refresh)
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSessionImmediately()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveSessionImmediately])

  /**
   * Clear debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  /**
   * Public API methods
   */
  const saveStep1Data = useCallback((data: Step1Data) => {
    setStep1Data(data)
  }, [])

  const saveStep2Data = useCallback((data: Step2Data) => {
    setStep2Data(data)
  }, [])

  const saveStep3Data = useCallback((data: Step3Data) => {
    setStep3Data(data)
  }, [])

  const updateCurrentStep = useCallback((step: number) => {
    setCurrentStep(clampStepNumber(step))
  }, [])

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setCurrentStep(1)
      setStep1Data(null)
      setStep2Data(null)
      setStep3Data(null)
    } catch (error) {
      devLog.error('Failed to clear session:', error)
    }
  }, [])

  return {
    // State
    currentStep,
    step1Data,
    step2Data,
    step3Data,

    // Actions
    saveStep1Data,
    saveStep2Data,
    saveStep3Data,
    setCurrentStep: updateCurrentStep,
    clearSession,
  }
}
