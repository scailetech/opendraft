/**
 * ABOUTME: Single-page bulk processor - power-user optimized interface
 * ABOUTME: Full-width layout, keyboard shortcuts, inline results, no wizard steps
 */

'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Upload, Play, CheckCircle, X,
  HelpCircle, RotateCcw, Settings2
} from 'lucide-react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useCSVParser } from '@/hooks/useCSVParser'
import { useBatchProcessor } from '@/hooks/useBatchProcessor'
import { useManualJobOptimizer } from '@/hooks/useManualJobOptimizer'
import { useVariableValidation } from '@/hooks/useVariableValidation'
import { getTimeEstimate } from '@/lib/time-estimation'
import { PARALLEL_CONCURRENCY } from '@/lib/processing-constants'
import { useJobContext } from '@/hooks/useJobContext'
import { useContextStorage } from '@/hooks/useContextStorage'
import { PromptSection } from './PromptSection'
import { JobPreview } from './JobPreview'
import { ResultsTable } from './ResultsTable'
import { BatchLoadingScreen } from './BatchLoadingScreen'
import { DataInputTabs } from './DataInputTabs'
import { OutputFieldsSection } from './OutputFieldsSection'
import { ToolSelectionSection } from './ToolSelectionSection'
import { Modal } from '@/components/ui/modal'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ToolbarIconButton, ToolbarPrimaryButton, ToolbarButtonGroup, ToolbarDivider } from '@/components/ui/toolbar-icon-button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logError } from '@/lib/errors'
import { generateExportFilename } from '@/lib/export-filename'
import { downloadXLSX, flattenBatchResultsForExport, type BatchResultRow, type FlattenedExportResult } from '@/lib/export'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { saveCSVFile, restoreCSVFile, clearCSVFile } from '@/lib/storage/csv-storage'
import { ValidationSummary } from '@/components/ui/validation-summary'
import { useMobile } from '@/hooks/useMobile'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
// AUTO_RETRIES handled by backend (Modal) - see modal-processor/main.py

export default function BulkProcessor() {
  // === FILE STATE ===
  const fileUpload = useFileUpload()
  const csvParser = useCSVParser()
  const batchProcessor = useBatchProcessor()


  // === JOB CONTEXT PERSISTENCE ===
  const { saveContext, restoreContext, clearContext, loadContext } = useJobContext()
  const [hasRestoredContext, setHasRestoredContext] = useState(false)

  // === COMPANY CONTEXT ===
  const { context: contextVariables } = useContextStorage()

  // === CONFIG STATE ===
  const [prompt, setPrompt] = useState('')
  const [outputFields, setOutputFields] = useState<string[]>([])
  const [outputFieldsWithDescriptions, setOutputFieldsWithDescriptions] = useState<Array<{name: string, description?: string}>>([])
  const [newField, setNewField] = useState('')
  const [showAdvancedSettingsModal, setShowAdvancedSettingsModal] = useState(false)
  // JSON mode is always enabled - no toggle needed for better output quality
  const [selectedTools, setSelectedTools] = useState<string[]>([]) // GTM tools - empty by default, AI optimization suggests when needed
  const [selectedInputColumns, setSelectedInputColumns] = useState<string[]>([]) // Input columns to include in output
  const [optimizeInput, setOptimizeInput] = useState(true)
  const [optimizeTask, setOptimizeTask] = useState(true)
  const [optimizeOutput, setOptimizeOutput] = useState(true)

  // === KEYBOARD SHORTCUTS HELP ===
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // === DELETE CONFIRMATION ===
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

  // === RESET CONFIRMATION ===
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [showClearDataConfirmation, setShowClearDataConfirmation] = useState(false)

  // === COLLAPSIBLE SECTIONS STATE ===
  // Progressive disclosure: Input open by default, Task/Output closed
  // All sections use local state (no persistence) for consistent UX
  const [dataInputSectionOpen, setDataInputSectionOpen] = useState(true)
  const dataInputSection = useMemo(() => ({
    isOpen: dataInputSectionOpen,
    setIsOpen: setDataInputSectionOpen
  }), [dataInputSectionOpen])

  // Clean up old localStorage keys from previous versions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bulk-processor-data-input')
      localStorage.removeItem('bulk-processor-data-input-v2')
    }
  }, [])
  
  // Mobile detection
  const { isMobile } = useMobile()

  // Mobile tab state - for auto-switching to Results when processing starts
  const [mobileActiveTab, setMobileActiveTab] = useState<string>('configure')

  // Task and Output sections - start closed for cleaner UX
  // Only INPUT is open by default for progressive disclosure
  const [promptSectionOpen, setPromptSectionOpen] = useState(false)
  const [outputSettingsSectionOpen, setOutputSettingsSectionOpen] = useState(false)

  // AI Suggestion animation state
  const [isJobPreviewExiting, setIsJobPreviewExiting] = useState(false)
  const [hasOptimizationBeenApplied, setHasOptimizationBeenApplied] = useState(false)
  const promptSectionRef = useRef<HTMLDivElement>(null)
  const jobPreviewRef = useRef<HTMLDivElement>(null)
  const wasOptimizingRef = useRef(false)
  
  

  // Restore job context and CSV file on mount (only once)
  useEffect(() => {
    if (hasRestoredContext) return

    const restoreFileAndContext = async () => {
      // Restore CSV file from IndexedDB
      const savedContext = loadContext()
      const csvFilename = savedContext?.csvFilename
      const restoredFile = await restoreCSVFile(csvFilename)

      if (restoredFile) {
        // File found - upload and parse it
        try {
          await fileUpload.uploadFile(restoredFile)
          await csvParser.parseFile(restoredFile)
        } catch (err) {
          // Silent failure - restore failed
        }
      }

      // Now restore job context (after file is loaded if it exists)
      const currentCsvFilename = fileUpload.file?.name || csvParser.csvData?.filename || savedContext?.csvFilename
      const currentCsvColumnCount = csvParser.csvData?.columns.length
      const restored = restoreContext(currentCsvFilename, currentCsvColumnCount)

      if (Object.keys(restored).length > 0) {
        // Restore all context
        if (restored.prompt) setPrompt(restored.prompt)
        if (restored.outputFields) setOutputFields(restored.outputFields)
        if (restored.selectedTools) setSelectedTools(restored.selectedTools)
        if (restored.optimizeInput !== undefined) setOptimizeInput(restored.optimizeInput)
        if (restored.optimizeTask !== undefined) setOptimizeTask(restored.optimizeTask)
        if (restored.optimizeOutput !== undefined) setOptimizeOutput(restored.optimizeOutput)
        
        // Only restore selectedInputColumns if CSV matches
        if (restored.selectedInputColumns && csvParser.csvData) {
          // Validate that restored columns exist in current CSV
          const validColumns = restored.selectedInputColumns.filter(col =>
            csvParser.csvData!.columns.includes(col)
          )
          if (validColumns.length > 0) {
            setSelectedInputColumns(validColumns)
          }
          // If no valid columns, let existing logic handle it (defaults to all columns)
        }
      }

      setHasRestoredContext(true)
    }

    restoreFileAndContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Track which CSV file has been initialized (to avoid re-initializing on every render)
  const initializedCsvRef = useRef<string | null>(null)

  // Re-restore selectedInputColumns when CSV loads after context restoration
  useEffect(() => {
    if (!hasRestoredContext || !csvParser.csvData) return

    const csvFilename = fileUpload.file?.name || csvParser.csvData.filename || 'data'
    
    // Skip if we've already initialized this CSV file
    if (initializedCsvRef.current === csvFilename) return
    
    const csvColumnCount = csvParser.csvData.columns.length
    const restored = restoreContext(csvFilename, csvColumnCount)

    // If CSV matches saved context, restore selectedInputColumns
    if (restored.selectedInputColumns && csvFilename && csvColumnCount) {
      const validColumns = restored.selectedInputColumns.filter(col =>
        csvParser.csvData!.columns.includes(col)
      )
      if (validColumns.length > 0) {
        setSelectedInputColumns(validColumns)
        initializedCsvRef.current = csvFilename
        return // Don't run default logic below
      }
    }

    // Default: all columns selected on FIRST load only
    if (selectedInputColumns.length === 0) {
      setSelectedInputColumns([...csvParser.csvData.columns])
    }
    
    // Mark this CSV as initialized
    initializedCsvRef.current = csvFilename
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvParser.csvData?.columns.join(','), hasRestoredContext, fileUpload.file?.name])

  // Clear stale results when CSV changes (Bug F fix)
  const prevCsvFilenameRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const currentFilename = csvParser.csvData?.filename || fileUpload.file?.name
    if (prevCsvFilenameRef.current !== undefined &&
        currentFilename !== undefined &&
        prevCsvFilenameRef.current !== currentFilename) {
      // CSV changed - clear old results to avoid confusion
      batchProcessor.clearResults()
    }
    prevCsvFilenameRef.current = currentFilename
  }, [csvParser.csvData?.filename, fileUpload.file?.name, batchProcessor])

  // Remove auto-collapse/expand - let user control sections manually
  // Sections stay open/closed based on user preference

  // === ONBOARDING STATE ===
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if user needs onboarding on mount (only once)
  useEffect(() => {
    // Only check on initial mount, not on every state change
    if (typeof window === 'undefined') return undefined
    
    const hasSeenOnboarding = localStorage.getItem('bulk-run-onboarding-seen')
    const isDefaultPrompt = !prompt.trim()
    
    // Show onboarding for new users: no CSV uploaded, default/empty prompt, and haven't seen onboarding
    if (!hasSeenOnboarding && !csvParser.csvData && isDefaultPrompt) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - prompt and csvParser.csvData checked inside

  // === PROCESSING STATE ===
  const [isTesting, setIsTesting] = useState(false)
  const [testStartTime, setTestStartTime] = useState<number | undefined>(undefined)
  const [isStartingBatch, setIsStartingBatch] = useState(false) // Immediate feedback state
  const [processingStartTime, setProcessingStartTime] = useState<number | undefined>(undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [exportStartTime, setExportStartTime] = useState<number | undefined>(undefined)
  void exportStartTime // Prevent unused variable error (used for future timing analytics)
  
  // Track if user has attempted to test/process (to show validation errors only after attempt)
  const [hasAttemptedAction, setHasAttemptedAction] = useState(false)

  // Auto-switch mobile tab to Results when processing starts (Bug I fix)
  useEffect(() => {
    if (isMobile && (batchProcessor.isProcessing || isStartingBatch || isTesting)) {
      setMobileActiveTab('results')
    }
  }, [isMobile, batchProcessor.isProcessing, isStartingBatch, isTesting])

  /**
   * Error Display Strategy (P1 UX Issue #5 - Error Redundancy):
   * - Critical/blocking errors (user cannot proceed): Use setError() for persistent banner
   * - Transient/non-blocking errors (can retry): Use toast.error() for temporary notification
   * - Never show the same error in both banner AND toast
   *
   * Critical errors: File upload failures, CSV parsing errors, Google Sheets loading errors,
   *                  variable validation errors, test/process failures
   * Transient errors: Export failures, retry failures, save context failures
   */
  const [error, setError] = useState<string | null>(null)

  // Memoize CSV columns to prevent infinite render loop (array created on every render)
  const csvColumns = useMemo(() => {
    return csvParser.csvData?.columns || []
  }, [csvParser.csvData?.columns])

  // Unified results: use batchProcessor.results as single source of truth
  const displayResults = useMemo(() => {
    return batchProcessor.results
  }, [batchProcessor.results])

  // Clear isStartingBatch when first actual result arrives (not just pending)
  // This ensures the loader shows until Modal actually processes a row
  useEffect(() => {
    if (!isStartingBatch) return
    
    // Check if we have any completed or failed results (actual processing happened)
    const hasActualResults = displayResults.some(
      r => r.status === 'completed' || r.status === 'failed'
    )
    
    if (hasActualResults) {
      setIsStartingBatch(false)
    }
  }, [displayResults, isStartingBatch])

  // Calculate token totals from batch results (computed from Realtime results - no polling!)
  const tokenTotals = useMemo(() => {
    if (!batchProcessor.results || batchProcessor.results.length === 0) {
      return { input: 0, output: 0 }
    }
    return batchProcessor.results.reduce(
      (acc, row) => ({
        input: acc.input + (row.input_tokens || 0),
        output: acc.output + (row.output_tokens || 0),
      }),
      { input: 0, output: 0 }
    )
  }, [batchProcessor.results])

  // DISABLED: Auto-detection was causing crashes on mobile resize
  // The user must set output columns manually before running batch
  // This is safer and prevents render crashes when switching to mobile view

  // Manual AI optimization (user triggers with button)
  const {
    optimizedPrompt,
    setOptimizedPrompt,
    outputColumns,
    suggestedTools,
    suggestedInputColumns,
    reasoning,
    isOptimizing,
    error: optimizationError,
    triggerOptimization,
    clearOptimization,
  } = useManualJobOptimizer(
    prompt, 
    csvColumns,
    // Pass first 5 rows as sample data so AI can see which columns have content
    csvParser.csvData?.rows.slice(0, 5).map(row => row.data) || undefined
  )

  // Collapse all sections when optimization starts (helps user focus on the AI suggestion)
  useEffect(() => {
    if (isOptimizing) {
      dataInputSection.setIsOpen(false)
      setPromptSectionOpen(false)
      setOutputSettingsSectionOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOptimizing])

  // Show toast when optimization fails
  useEffect(() => {
    if (optimizationError) {
      toast.error(`AI optimization failed: ${optimizationError}`)
    }
  }, [optimizationError])

  // Memoize AI suggestion check to avoid unnecessary re-renders
  const hasAISuggestion = useMemo(() => {
    return !!(optimizedPrompt || outputColumns.length > 0 || suggestedInputColumns.length > 0 || suggestedTools.length > 0)
  }, [optimizedPrompt, outputColumns.length, suggestedInputColumns.length, suggestedTools.length])

  // Handle accepting AI suggestion
  const handleAcceptOptimization = useCallback(() => {
    // Trigger fade-out animation
    setIsJobPreviewExiting(true)

    // Wait for animation to complete before clearing (200ms)
    const timer = setTimeout(() => {
      // Apply all suggestions
      if (optimizedPrompt) {
        setPrompt(optimizedPrompt)
      }
      // Use AI-detected output columns (store both names and descriptions)
      if (outputColumns.length > 0) {
        setOutputFields(outputColumns.map((col) => col.name))
        setOutputFieldsWithDescriptions(outputColumns.map((col) => ({ name: col.name, description: col.description })))
      }
      // Apply AI-suggested tools (always apply, even if empty - to clear old selections)
      setSelectedTools(suggestedTools)
      // Apply AI-suggested input columns
      if (suggestedInputColumns.length > 0) {
        setSelectedInputColumns(suggestedInputColumns)
      }

      // Clear optimization (removes JobPreview from DOM)
      clearOptimization()
      setIsJobPreviewExiting(false)
      setHasOptimizationBeenApplied(true)

      // Build detailed success message
      const appliedItems: string[] = []
      if (optimizedPrompt) appliedItems.push('prompt')
      if (outputColumns.length > 0) appliedItems.push(`${outputColumns.length} output field${outputColumns.length > 1 ? 's' : ''}`)
      if (suggestedTools.length > 0) appliedItems.push(`${suggestedTools.length} tool${suggestedTools.length > 1 ? 's' : ''}`)

      const itemsText = appliedItems.join(' + ')
      toast.success(`✓ Optimized: ${itemsText}`)

      // Auto-scroll to prompt section to show applied changes
      promptSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)

    return () => clearTimeout(timer)
  }, [optimizedPrompt, outputColumns, suggestedTools, suggestedInputColumns, clearOptimization])

  // Handle optimize button click
  const handleOptimize = useCallback(() => {
    // Show toast feedback for missing requirements
    if (!csvParser.csvData) {
      toast.error('Upload a CSV file first')
      return
    }
    if (!prompt.trim()) {
      toast.error('Write a prompt first')
      return
    }
    if (!optimizeInput && !optimizeTask && !optimizeOutput) {
      toast.error('Enable at least one option (Input, Task, or Output) in AI settings', {
        action: {
          label: 'Open Settings',
          onClick: () => {
            // Find and click the settings button programmatically
            const settingsBtn = document.querySelector('[aria-label="AI optimization settings"]') as HTMLButtonElement
            settingsBtn?.click()
          }
        }
      })
      return
    }
    triggerOptimization({
      optimizeInput,
      optimizeTask,
      optimizeOutput,
      selectedInputColumns,
      // Pass sample rows so AI can see which columns have data
      sampleRows: csvParser.csvData.rows.slice(0, 5).map(row => row.data),
    })
  }, [csvParser.csvData, prompt, optimizeInput, optimizeTask, optimizeOutput, selectedInputColumns, triggerOptimization])

  // Handle rejecting AI suggestion
  const handleRejectOptimization = useCallback(() => {
    clearOptimization()
  }, [clearOptimization])

  // Auto-scroll to AI Suggestion panel when optimization completes
  useEffect(() => {
    // Detect transition: was optimizing -> now finished with results
    if (wasOptimizingRef.current && !isOptimizing && hasAISuggestion) {
      // Delay to let JobPreview render and DOM settle after sections collapse/expand
      setTimeout(() => {
        // Use ID selector for reliable targeting (wrapper div around JobPreview)
        const aiSuggestionPanel = document.getElementById('ai-suggestion-panel')
        if (aiSuggestionPanel) {
          aiSuggestionPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 350)
    }
    wasOptimizingRef.current = isOptimizing
  }, [isOptimizing, hasAISuggestion])

  // Recent files feature removed - users can re-upload files if needed

  // === VARIABLE VALIDATION ===
  const variableValidation = useVariableValidation(prompt, csvParser.csvData, selectedInputColumns, contextVariables)
  
  // Reset attempted action flag when validation becomes valid (user fixed the issue)
  useEffect(() => {
    if (hasAttemptedAction && variableValidation.isValid) {
      setHasAttemptedAction(false)
    }
  }, [hasAttemptedAction, variableValidation.isValid])

  // === AUTO-EXPAND: Progressive disclosure flow ===
  // After CSV loads, expand TASK to guide user to next step (never auto-collapse)
  useEffect(() => {
    if (csvParser.csvData && !promptSectionOpen) {
      setPromptSectionOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvParser.csvData?.filename]) // Only trigger on new file

  // After prompt is valid and no output fields defined, expand OUTPUT (never auto-collapse)
  useEffect(() => {
    if (
      csvParser.csvData &&
      prompt.trim() &&
      variableValidation.isValid &&
      outputFields.length === 0 &&
      !outputSettingsSectionOpen
    ) {
      setOutputSettingsSectionOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvParser.csvData, prompt, variableValidation.isValid, outputFields.length])

  // === FORMAT CONTEXT FOR API ===
  const formatContextString = useCallback((): string => {
    const parts: string[] = []
    
    // Core Business Context
    if (contextVariables.tone) parts.push(`Tone: ${contextVariables.tone}`)
    if (contextVariables.valueProposition) parts.push(`Value Proposition: ${contextVariables.valueProposition}`)
    if (contextVariables.icp) parts.push(`ICP: ${contextVariables.icp}`)
    if (contextVariables.productDescription) parts.push(`Product Description: ${contextVariables.productDescription}`)
    if (contextVariables.products && contextVariables.products.length > 0) {
      parts.push(`Products: ${Array.isArray(contextVariables.products) ? contextVariables.products.join(', ') : contextVariables.products}`)
    }
    if (contextVariables.targetCountries) parts.push(`Target Countries: ${contextVariables.targetCountries}`)
    if (contextVariables.targetIndustries) parts.push(`Target Industries: ${contextVariables.targetIndustries}`)
    if (contextVariables.competitors) parts.push(`Competitors: ${contextVariables.competitors}`)
    if (contextVariables.complianceFlags) parts.push(`Compliance: ${contextVariables.complianceFlags}`)
    if (contextVariables.marketingGoals && Array.isArray(contextVariables.marketingGoals) && contextVariables.marketingGoals.length > 0) {
      parts.push(`Marketing Goals: ${contextVariables.marketingGoals.join(', ')}`)
    }
    
    // Company Information
    if (contextVariables.companyName) parts.push(`Company Name: ${contextVariables.companyName}`)
    if (contextVariables.companyWebsite) parts.push(`Company Website: ${contextVariables.companyWebsite}`)
    
    // Contact & Social
    if (contextVariables.contactEmail) parts.push(`Contact Email: ${contextVariables.contactEmail}`)
    if (contextVariables.contactPhone) parts.push(`Contact Phone: ${contextVariables.contactPhone}`)
    if (contextVariables.linkedInUrl) parts.push(`LinkedIn: ${contextVariables.linkedInUrl}`)
    if (contextVariables.twitterUrl) parts.push(`Twitter: ${contextVariables.twitterUrl}`)
    if (contextVariables.githubUrl) parts.push(`GitHub: ${contextVariables.githubUrl}`)
    
    // GTM Classification
    if (contextVariables.gtmPlaybook) parts.push(`GTM Playbook: ${contextVariables.gtmPlaybook}`)
    if (contextVariables.productType) parts.push(`Product Type: ${contextVariables.productType}`)
    
    return parts.join('\n')
  }, [contextVariables])

  // === REPLACE CONTEXT VARIABLES IN PROMPT ===
  const replaceContextVariables = useCallback((promptText: string): string => {
    let replacedPrompt = promptText
    
    // Replace {{context.variableName}} with actual values
    // Core Business Context
    if (contextVariables.tone) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.tone\}\}/g, contextVariables.tone)
    }
    if (contextVariables.valueProposition) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.valueProposition\}\}/g, contextVariables.valueProposition)
    }
    if (contextVariables.icp) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.icp\}\}/g, contextVariables.icp)
    }
    if (contextVariables.productDescription) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.productDescription\}\}/g, contextVariables.productDescription)
    }
    if (contextVariables.products) {
      const productsStr = Array.isArray(contextVariables.products) 
        ? contextVariables.products.join(', ') 
        : contextVariables.products
      replacedPrompt = replacedPrompt.replace(/\{\{context\.products\}\}/g, productsStr)
    }
    if (contextVariables.targetCountries) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.targetCountries\}\}/g, contextVariables.targetCountries)
    }
    if (contextVariables.targetIndustries) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.targetIndustries\}\}/g, contextVariables.targetIndustries)
    }
    if (contextVariables.competitors) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.competitors\}\}/g, contextVariables.competitors)
    }
    if (contextVariables.complianceFlags) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.complianceFlags\}\}/g, contextVariables.complianceFlags)
    }
    if (contextVariables.marketingGoals && Array.isArray(contextVariables.marketingGoals)) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.marketingGoals\}\}/g, contextVariables.marketingGoals.join(', '))
    }
    
    // Company Information
    if (contextVariables.companyName) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.companyName\}\}/g, contextVariables.companyName)
    }
    if (contextVariables.companyWebsite) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.companyWebsite\}\}/g, contextVariables.companyWebsite)
    }
    
    // Contact & Social
    if (contextVariables.contactEmail) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.contactEmail\}\}/g, contextVariables.contactEmail)
    }
    if (contextVariables.contactPhone) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.contactPhone\}\}/g, contextVariables.contactPhone)
    }
    if (contextVariables.linkedInUrl) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.linkedInUrl\}\}/g, contextVariables.linkedInUrl)
    }
    if (contextVariables.twitterUrl) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.twitterUrl\}\}/g, contextVariables.twitterUrl)
    }
    if (contextVariables.githubUrl) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.githubUrl\}\}/g, contextVariables.githubUrl)
    }
    
    // GTM Classification
    if (contextVariables.gtmPlaybook) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.gtmPlaybook\}\}/g, contextVariables.gtmPlaybook)
    }
    if (contextVariables.productType) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.productType\}\}/g, contextVariables.productType)
    }
    
    return replacedPrompt
  }, [contextVariables])

  // === TIME ESTIMATION ===
  const timeEstimate = useMemo(() => {
    if (!csvParser.csvData || !prompt || !variableValidation.isValid) {
      return null
    }
    return getTimeEstimate(
      csvParser.csvData.totalRows,
      prompt.length,
      selectedTools.length,
      PARALLEL_CONCURRENCY
    )
  }, [csvParser.csvData, prompt, selectedTools.length, variableValidation.isValid])

  // Auto-save job context when state changes (debounced)
  useEffect(() => {
    if (!hasRestoredContext) return // Don't save during initial restoration

    const timeoutId = setTimeout(() => {
      saveContext({
        prompt,
        outputFields,
        selectedTools,
        selectedInputColumns,
        optimizeInput,
        optimizeTask,
        optimizeOutput,
        csvFilename: fileUpload.file?.name || csvParser.csvData?.filename,
        csvColumnCount: csvParser.csvData?.columns.length,
        googleSheetsUrl: csvParser.csvData?.googleSheetsUrl,
        googleSheetsId: csvParser.csvData?.googleSheetsId,
        inputSource: csvParser.csvData?.googleSheetsId ? 'google_sheets' : 'csv',
      })
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [
    hasRestoredContext,
    prompt,
    outputFields,
    selectedTools,
    selectedInputColumns,
    optimizeInput,
    optimizeTask,
    optimizeOutput,
    fileUpload.file?.name,
    csvParser.csvData?.columns.length,
    csvParser.csvData?.filename,
    csvParser.csvData?.googleSheetsId,
    csvParser.csvData?.googleSheetsUrl,
    saveContext,
  ])

  // === BATCH COMPLETION HANDLER ===
  // Clear test state when batch completes and show success feedback
  const [previousProcessingState, setPreviousProcessingState] = useState(false)
  
  useEffect(() => {
    // Track when processing completes or is cancelled
    if (previousProcessingState && !batchProcessor.isProcessing) {
      // Always reset testing/starting state when processing stops (success, error, or cancelled)
      const wasTesting = isTesting
      if (isTesting) {
        setIsTesting(false)
        setTestStartTime(undefined)
      }
      setIsStartingBatch(false)
      
      // Only show completion toasts if we have results
      if (displayResults.length > 0) {
        const successCount = displayResults.filter(r => r.status === 'completed').length
        const errorCount = displayResults.filter(r => r.status === 'failed').length
        const totalCount = displayResults.length
      
        if (wasTesting && successCount > 0) {
          // Test completed
          toast.success('Test completed', {
            description: 'Review the result below. Click "Process All" to process all rows.',
            id: 'test-complete'
          })
        } else if (successCount === totalCount && !wasTesting) {
          // All rows succeeded - celebrate!
          toast.success('🎉 Batch completed successfully!', {
            description: `All ${totalCount} rows processed successfully. Ready to export.`,
            id: 'batch-complete-success',
            duration: 6000,
          })
          // Trigger success animation
          document.body.classList.add('batch-success-celebration')
          setTimeout(() => {
            document.body.classList.remove('batch-success-celebration')
          }, 2000)
        } else if (successCount > 0 && !wasTesting) {
          // Partial success
          toast.success('Batch completed', {
            description: `${successCount} succeeded, ${errorCount} failed out of ${totalCount} rows`,
            id: 'batch-complete-partial',
            duration: 5000,
          })
        }
      }
    }
    
    setPreviousProcessingState(batchProcessor.isProcessing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchProcessor.isProcessing, displayResults, isTesting, previousProcessingState])

  // === PROCESSING START TIME TRACKING ===
  // Track when processing starts for progress bar animation
  useEffect(() => {
    if (batchProcessor.isProcessing && !processingStartTime) {
      // Processing just started, set start time
      setProcessingStartTime(Date.now())
    } else if (!batchProcessor.isProcessing && processingStartTime) {
      // Processing stopped, clear start time
      setProcessingStartTime(undefined)
    }
  }, [batchProcessor.isProcessing, processingStartTime])

  // === DYNAMIC PAGE TITLE DURING PROCESSING ===
  // UX issue #28: Show progress in browser tab title
  useEffect(() => {
    const originalTitle = 'bulk.run'
    
    if (batchProcessor.isProcessing) {
      const completed = displayResults.filter(r => r.status === 'completed').length
      const total = displayResults.length || csvParser.csvData?.totalRows || 0
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0
      document.title = `Processing ${percent}%... | ${originalTitle}`
    } else if (displayResults.length > 0) {
      const successCount = displayResults.filter(r => r.status === 'completed').length
      const errorCount = displayResults.filter(r => r.status === 'failed').length
      if (errorCount > 0) {
        document.title = `✓ ${successCount} done, ${errorCount} failed | ${originalTitle}`
      } else {
        document.title = `✓ ${successCount} completed | ${originalTitle}`
      }
    } else {
      document.title = originalTitle
    }
    // No cleanup here - title updates are intentional state changes
  }, [batchProcessor.isProcessing, displayResults, csvParser.csvData?.totalRows])
  
  // Restore title only on component unmount
  useEffect(() => {
    return () => {
      document.title = 'bulk.run'
    }
  }, [])

  // === FILTERED TEMPLATES ===

  // === FILE UPLOAD ===
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    // IMMEDIATE feedback (within 100ms)
    setIsUploading(true)
    setError(null)
    batchProcessor.clearResults() // Clear any previous batch errors

    // Validate file (applies to both V1 and V2)
    if (!uploadedFile.name.endsWith('.csv')) {
      setIsUploading(false)
      setError(`File type not supported. Please upload a CSV file (found: ${uploadedFile.name.split('.').pop()}). Export your spreadsheet as CSV from Excel or Google Sheets.`)
      return
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      setIsUploading(false)
      setError(`File is too large (${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB. Try reducing the number of rows or removing unnecessary columns.`)
      return
    }
    if (uploadedFile.size === 0) {
      setIsUploading(false)
      setError(`File "${uploadedFile.name}" is empty (0 bytes). Please check your file and try again.`)
      return
    }

    // Upload and parse CSV using hooks
    try {
      // Upload file (validates and tracks)
      await fileUpload.uploadFile(uploadedFile)

      // Parse CSV immediately (don't check state - it hasn't updated yet!)
      const parsed = await csvParser.parseFile(uploadedFile)

      // Save CSV file to IndexedDB and update context (always save, not just after restoration)
      if (parsed) {
        // Save file to IndexedDB for persistence
        await saveCSVFile(uploadedFile)
        
        // Save CSV filename to context
        saveContext({
          csvFilename: uploadedFile.name,
          csvColumnCount: parsed.columns.length,
          inputSource: 'csv',
          googleSheetsUrl: undefined,
          googleSheetsId: undefined,
        })
        
        // Success feedback
        toast.success('CSV uploaded successfully', {
          description: `${parsed.totalRows} rows • ${parsed.columns.length} columns ready to process`,
          duration: 4000,
        })
      }
    } catch (err) {
      // Errors are already handled by the hooks
      // Log error for debugging
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'fileUpload',
      })
    } finally {
      setIsUploading(false)
    }
  }, [csvParser, fileUpload, saveContext, batchProcessor])

  // === GOOGLE SHEETS DATA LOADED ===
  // === CLEAR DATA HANDLER ===
  // Show confirmation before clearing (Bug H fix)
  const handleClearData = useCallback(() => {
    // Only show confirmation if there's data or results to clear
    if (csvParser.csvData || batchProcessor.results.length > 0) {
      setShowClearDataConfirmation(true)
    }
  }, [csvParser.csvData, batchProcessor.results.length])

  // Actually clear data after confirmation
  const handleConfirmClearData = useCallback(() => {
    csvParser.clearData()
    fileUpload.clearFile()
    setSelectedInputColumns([])
    batchProcessor.clearResults()
    // Clear any stored CSV file from IndexedDB
    const csvFilename = fileUpload.file?.name || csvParser.csvData?.filename
    if (csvFilename) {
      clearCSVFile(csvFilename).catch(() => {
        // Silent failure - clear failed
      })
    }
    // Clear Google Sheets metadata from context
    saveContext({
      googleSheetsUrl: undefined,
      googleSheetsId: undefined,
      inputSource: 'csv',
    })
    setShowClearDataConfirmation(false)
    toast.success('Data cleared')
  }, [csvParser, fileUpload, batchProcessor, saveContext])

  // === KEYBOARD SHORTCUTS ===
  // Note: CSV file input is now handled inside CSVUploadTab component
  // Keyboard shortcut for file upload can be handled at tab level if needed

  useHotkeys('mod+t', (e) => {
    e.preventDefault()
    if (csvParser.csvData && prompt) handleTest()
  })

  useHotkeys('mod+enter', (e) => {
    e.preventDefault()
    if (csvParser.csvData && prompt) handleProcess()
  })

  // Keyboard shortcut for help: Cmd+? 
  // On Mac: CMD+? sends mod+shift+/ because ? requires Shift key
  // On Windows/Linux: CMD+Shift+/ also works
  useHotkeys('mod+shift+/', (e) => {
    e.preventDefault()
    setShowKeyboardHelp(true)
  }, { enableOnFormTags: true, enableOnContentEditable: true })
  
  // Alternative pattern: shift+mod+/ (some keyboards may register differently)
  useHotkeys('shift+mod+/', (e) => {
    e.preventDefault()
    setShowKeyboardHelp(true)
  }, { enableOnFormTags: true, enableOnContentEditable: true })


  // === OUTPUT FIELDS ===
  const addOutputField = useCallback(() => {
    if (newField.trim() && !outputFields.includes(newField.trim())) {
      const fieldName = newField.trim()
      setOutputFields([...outputFields, fieldName])
      // Also add to descriptions array to ensure it's sent even if AI optimization was used
      setOutputFieldsWithDescriptions(prev => [...prev, { name: fieldName }])
      setNewField('')
    }
  }, [newField, outputFields])

  const removeOutputField = useCallback((field: string) => {
    setFieldToDelete(field)
  }, [])

  const confirmDeleteOutputField = useCallback(() => {
    if (fieldToDelete) {
      setOutputFields(outputFields.filter(f => f !== fieldToDelete))
      // Also remove from descriptions array
      setOutputFieldsWithDescriptions(prev => prev.filter(f => f.name !== fieldToDelete))
      setFieldToDelete(null)
    }
  }, [fieldToDelete, outputFields])

  // === TOOL SELECTION ===
  const toggleTool = useCallback((toolName: string) => {
    setSelectedTools(prev =>
      prev.includes(toolName)
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    )
  }, [])

  // === RESET CONFIGURATION ===
  const handleResetConfiguration = useCallback(async () => {
    // Reset all configuration state
    setPrompt('')
    setOutputFields([])
    setOutputFieldsWithDescriptions([])
    setSelectedTools([])
    setOptimizeInput(true)
    setOptimizeTask(true)
    setOptimizeOutput(true)
    
    // Clear CSV file from IndexedDB
    const csvFilename = fileUpload.file?.name
    if (csvFilename) {
      await clearCSVFile(csvFilename)
    }
    
    // Clear file upload state
    fileUpload.clearFile()
    csvParser.clearData()
    
    // Reset selected input columns
    setSelectedInputColumns([])
    
    // Clear job context from localStorage
    clearContext()
    
    // Clear optimization results
    clearOptimization()
    setHasOptimizationBeenApplied(false)
    
    // Reset attempted action flag
    setHasAttemptedAction(false)

    // Reset section states to defaults (Bug D+E fix)
    setDataInputSectionOpen(true)
    setPromptSectionOpen(false)
    setOutputSettingsSectionOpen(false)
    setMobileActiveTab('configure')

    // Close confirmation modal
    setShowResetConfirmation(false)

    toast.success('Configuration reset')

    trackEvent(ANALYTICS_EVENTS.JOB_RESET, {})
  }, [csvParser, fileUpload, clearContext, clearOptimization])

  // === TEST (1 ROW) - Unified with batch processor ===
  const handleTest = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Mark that user has attempted an action (to show validation errors)
    setHasAttemptedAction(true)

    // Variable validation warning (non-blocking)
    if (!variableValidation.isValid) {
      toast.warning(`Variables not found in CSV: ${variableValidation.missing.join(', ')}. These will appear as literal text in your output.`)
    }

    // Immediate feedback - show spinner right away
    setIsStartingBatch(true)
    setIsTesting(true)
    setError(null)
    setTestStartTime(Date.now())

    // Auto-switch to Results tab on mobile for better UX
    if (isMobile) {
      setMobileActiveTab('results')
    }

    try {
      // Create test CSV with only first row
      const testCSVData = {
        ...csvParser.csvData,
        rows: [csvParser.csvData.rows[0]],
        totalRows: 1,
      }

      // Replace context variables in prompt before sending
      const processedPrompt = replaceContextVariables(prompt)

      // Use unified batch processor with testMode flag
      // Use descriptions from AI optimization if available
      const outputColumnsToSend = outputFieldsWithDescriptions.length > 0 
        ? outputFieldsWithDescriptions 
        : outputFields
      await batchProcessor.startBatch({
        csvData: testCSVData,
          prompt: processedPrompt,
          context: formatContextString(),
        outputColumns: outputColumnsToSend,
          tools: selectedTools.length > 0 ? selectedTools : undefined,
        testMode: true, // Enable test mode to bypass batch limit
        selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
      })

      // Don't clear isStartingBatch here - let useEffect clear it when first result arrives
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Provide more actionable error messages
      let actionableMessage = message
      if (message.includes('variable') || message.includes('column')) {
        actionableMessage = `Test failed: ${message}. Check that all variables in your prompt ({{variable}}) match column names in your CSV.`
      } else if (message.includes('token') || message.includes('limit')) {
        actionableMessage = `Test failed: ${message}. Try reducing the prompt length or wait a moment and try again.`
      } else if (message.includes('network') || message.includes('fetch')) {
        actionableMessage = `Test failed: Connection error. Check your internet connection and try again.`
      } else {
        actionableMessage = `Test failed: ${message}. Please check your prompt and CSV data, then try again.`
      }
      setError(actionableMessage)
      setIsTesting(false)
      setTestStartTime(undefined)
      setIsStartingBatch(false) // Clear on error only
    }
  }, [csvParser.csvData, prompt, outputFields, outputFieldsWithDescriptions, variableValidation, batchProcessor, selectedTools, selectedInputColumns, formatContextString, replaceContextVariables, isMobile, setMobileActiveTab])

  // === PROCESS ALL ===
  const handleProcess = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Mark that user has attempted an action (to show validation errors)
    setHasAttemptedAction(true)

    // Variable validation warning (non-blocking)
    if (!variableValidation.isValid) {
      toast.warning(`Variables not found in CSV: ${variableValidation.missing.join(', ')}. These will appear as literal text in your output.`)
    }

    // Immediate feedback - show spinner right away
    setIsStartingBatch(true)

    // Auto-switch to Results tab on mobile for better UX
    if (isMobile) {
      setMobileActiveTab('results')
    }

    // Clear test state when starting full batch
    setIsTesting(false)
    setTestStartTime(undefined)

    // Replace context variables in prompt before sending
    const processedPrompt = replaceContextVariables(prompt)

    try {
      // Start batch processing using hook
      // Use descriptions from AI optimization if available
      const outputColumnsToSend = outputFieldsWithDescriptions.length > 0 
        ? outputFieldsWithDescriptions 
        : outputFields
      await batchProcessor.startBatch({
        csvData: csvParser.csvData,
        prompt: processedPrompt,
        context: formatContextString(),
        outputColumns: outputColumnsToSend, // Always use JSON mode for structured output
        tools: selectedTools.length > 0 ? selectedTools : undefined,
        testMode: false, // Full batch
        selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
      })
      // Don't clear isStartingBatch here - let useEffect clear it when first result arrives
    } catch (err) {
      setIsStartingBatch(false) // Clear on error only
      const message = err instanceof Error ? err.message : 'Failed to start batch'
      setError(message)
    }
  }, [csvParser.csvData, prompt, outputFields, outputFieldsWithDescriptions, batchProcessor, variableValidation, selectedTools, selectedInputColumns, formatContextString, replaceContextVariables, isMobile, setMobileActiveTab])

  // Track retry state for manual retries
  const retryingRowsRef = useRef<Set<string>>(new Set())

  // === RETRY FAILED ROW ===
  const handleRetryRow = useCallback(async (failedResult: { id: string; input: Record<string, string>; output: string; status: string; error?: string }, isAutoRetry = false) => {
    if (!csvParser.csvData || !prompt) {
      if (!isAutoRetry) {
        toast.error('Cannot retry', {
          description: 'Missing CSV data or prompt'
        })
      }
      return
    }

    // Prevent duplicate retries
    if (retryingRowsRef.current.has(failedResult.id)) {
      return
    }

    retryingRowsRef.current.add(failedResult.id)

    // Replace context variables in prompt before sending
    const processedPrompt = replaceContextVariables(prompt)

    // Create a single-row CSV for retry
    const retryCSVData = {
      ...csvParser.csvData,
      rows: [{ data: failedResult.input, rowIndex: 0 }],
      totalRows: 1,
    }

    try {
      // Use batch processor with testMode to bypass batch limit
      const outputColumnsToSend = outputFieldsWithDescriptions.length > 0 
        ? outputFieldsWithDescriptions 
        : outputFields
      await batchProcessor.startBatch({
        csvData: retryCSVData,
        prompt: processedPrompt,
        context: formatContextString(),
        outputColumns: outputColumnsToSend,
        tools: selectedTools.length > 0 ? selectedTools : undefined,
        testMode: true, // Use test mode to bypass batch limit for retries
        selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
      })

      if (!isAutoRetry) {
        toast.success('Retrying row', {
          description: 'Processing failed row again...'
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (!isAutoRetry) {
        // Provide more actionable error messages
        let actionableMessage = message
        if (message.includes('variable') || message.includes('column')) {
          actionableMessage = `${message} Check that all variables match your CSV columns.`
        } else if (message.includes('token') || message.includes('limit')) {
          actionableMessage = `${message} Try reducing your prompt length or wait a moment.`
        }
        toast.error('Retry failed', {
          description: actionableMessage
        })
      }
    } finally {
      retryingRowsRef.current.delete(failedResult.id)
    }
  }, [csvParser.csvData, prompt, outputFields, outputFieldsWithDescriptions, batchProcessor, selectedTools, selectedInputColumns, formatContextString, replaceContextVariables])

  // AUTO-RETRY: Disabled on frontend - backend (Modal) handles retries with exponential backoff
  // The hook now waits for backend retries to complete before showing results
  // Manual retry button is still available for users who want to retry after all attempts exhausted

  // Clear retry tracking when batch is cleared
  useEffect(() => {
    if (!batchProcessor.batchId) {
      retryingRowsRef.current.clear()
    }
  }, [batchProcessor.batchId])

  // === STOP PROCESSING ===
  // Wrapper that cancels batch AND clears all local processing state
  const handleStopProcessing = useCallback(async () => {
    console.log('[UI] Stop button clicked - cancelling batch and resetting UI state')
    
    // Show immediate feedback
    toast.loading('Stopping batch...', { id: 'stop-batch' })
    
    // Cancel the batch (clears polling, calls API, resets batch state)
    const success = await batchProcessor.cancelBatch()
    
    // Also reset local testing/starting state
    setIsTesting(false)
    setTestStartTime(undefined)
    setIsStartingBatch(false)
    setProcessingStartTime(undefined)
    
    // Clear retry tracking
    retryingRowsRef.current.clear()
    
    // Show result
    if (success) {
      toast.success('Batch stopped', {
        id: 'stop-batch',
        description: 'Remaining rows will be skipped'
      })
    } else {
      toast.warning('Stop requested', {
        id: 'stop-batch',
        description: 'Some in-progress rows may still complete'
      })
    }
  }, [batchProcessor])

  // === EXPORT ===
  const handleExport = useCallback(async (format: 'csv' | 'xlsx' = 'csv', visibleColumns?: string[]) => {
    // Unified batch ID: use current batch (works for both test and full batches)
    const currentBatchId = batchProcessor.batchId
    if (!currentBatchId) {
      toast.error('No Batch Available', {
        description: 'Please run a batch first before exporting results.'
      })
      return
    }

    try {
      const startTime = Date.now()
      setExportStartTime(startTime)
      toast.loading('Preparing download...', { id: `export-${currentBatchId}` })

      // First try to fetch from status API (includes batch info)
      interface StatusResult {
        id?: string
        input?: Record<string, unknown>
        output?: string
        status?: string
        error?: string
        input_tokens?: number
        output_tokens?: number
        model?: string
        tools_used?: string[]
      }
      interface ExportResult {
        input_data: Record<string, unknown>
        output_data: string
        status: string
        error_message: string
        input_tokens: number
        output_tokens: number
        model: string
        tools_used?: string[]
      }
      let results: ExportResult[] = []
      try {
        const statusResponse = await fetch(`/api/batch/${currentBatchId}/status?limit=10000`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json() as { results?: StatusResult[] }
          if (statusData.results && Array.isArray(statusData.results) && statusData.results.length > 0) {
            // Transform status API results to export format (include tokens and tools)
            results = statusData.results.map((r: StatusResult) => ({
              input_data: r.input || {},
              output_data: r.output || '',
              status: r.status === 'success' ? 'success' : r.status === 'error' ? 'error' : (r.status || 'unknown'),
              error_message: r.error || '',
              input_tokens: r.input_tokens || 0,
              output_tokens: r.output_tokens || 0,
              model: r.model || '',
              tools_used: r.tools_used || []
            }))
          }
        }
      } catch {
        // Silent failure - fallback to database
      }

      // Fallback to direct database fetch if status API didn't work
      if (results.length === 0) {
      const supabase = createClient()
      if (!supabase) {
        toast.error('Database Error', {
            description: 'Supabase client not configured. Please refresh the page.',
            id: `export-${currentBatchId}`
        })
        return
      }

        const { data: dbResults, error } = await supabase
        .from('batch_results')
          .select('input_data, output_data, status, error_message, input_tokens, output_tokens, model, tools_used')
          .eq('batch_id', currentBatchId)
        .order('id', { ascending: true })

      if (error) {
        logError(new Error('Batch results fetch failed'), {
          source: 'BulkProcessor/handleExport',
            batchId: currentBatchId,
          supabaseError: error
        })
        toast.error('Failed to Fetch Results', {
          description: 'Please try again or check the Dashboard for completed batches.',
            id: `export-${currentBatchId}`
        })
        return
        }

        results = dbResults || []
      }

      if (!results || results.length === 0) {
        toast.warning('No Results Available', {
          description: 'The batch may still be processing. Please wait a few moments and try again.',
          id: `export-${batchProcessor.batchId}`
        })
        return
      }

      // Transform results for export API
      const exportData = results.map(row => {
        let input = row.input_data
        try {
          if (typeof row.input_data === 'string') {
            input = JSON.parse(row.input_data)
          }
        } catch {
          // Keep original value if parsing fails
        }

        return {
          input_data: input,
          output_data: row.output_data,
          status: row.status,
          error_message: row.error_message,
          input_tokens: row.input_tokens || 0,
          output_tokens: row.output_tokens || 0,
          model: row.model || '',
          tools_used: row.tools_used || []
        }
      })

      // Handle XLSX export client-side (server API only supports CSV/JSON)
      if (format === 'xlsx') {
        // Flatten results for export
        const flattenedResults = flattenBatchResultsForExport(exportData as BatchResultRow[])
        
        // Filter columns if visibleColumns is provided
        let filteredResults = flattenedResults
        if (visibleColumns && visibleColumns.length > 0) {
          // Always include metadata columns alongside user-selected columns
          const columnsToKeep = new Set([
            '#', 'status', 
            ...visibleColumns,
            // Always include metadata columns at the end
            'input_tokens', 'output_tokens', 'total_tokens', 'tools_used', 'model', 'error'
          ])
          filteredResults = flattenedResults.map(row => {
            const filtered: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(row)) {
              if (columnsToKeep.has(key)) {
                filtered[key] = value
              }
            }
            return filtered as FlattenedExportResult
          })
        }
        
        // Use same filename logic as CSV export for consistency
        const originalFilename = fileUpload.file?.name || csvParser.csvData?.filename
        const filename = generateExportFilename(originalFilename, new Date(), 'xlsx')
        await downloadXLSX(filteredResults, filename, 'Results')
      } else {
        // Call server-side export API for CSV/JSON
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results: exportData,
            format,
            batchId: currentBatchId,
            timestamp: new Date().toISOString(),
            visibleColumns // Pass visible columns for filtering (undefined = all columns)
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
          throw new Error(errorData.error || `Export failed with status ${response.status}`)
        }

        // Get filename from Content-Disposition header (set by API using new naming convention)
        const disposition = response.headers.get('content-disposition') || ''
        const filenameMatch = disposition.match(/filename="([^"]+)"/)
        // Fallback uses same utility function for consistency (unlikely to be used, but ensures alignment)
        const filename = filenameMatch?.[1] || generateExportFilename(null, new Date(), format)

        // Trigger browser download
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
      toast.success('Download Complete', {
        description: `Successfully downloaded ${results.length} result rows in ${elapsedSeconds}s.`,
        id: `export-${currentBatchId}`
      })
      setExportStartTime(undefined)
    } catch (err) {
      setExportStartTime(undefined)
      logError(err instanceof Error ? err : new Error('Export failed'), {
        source: 'BulkProcessor/handleExport',
        batchId: currentBatchId
      })
      toast.error('Export Failed', {
        description: 'An unexpected error occurred. Please try again.',
        id: `export-${currentBatchId}`
      })
    }
  }, [batchProcessor.batchId, fileUpload.file?.name, csvParser.csvData?.filename])


  // === KEYBOARD NAVIGATION: ESC TO CLOSE MODALS & CLEAR ERRORS ===
  // Also handle CMD+? (native fallback for keyboard shortcuts help)
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Close modals in priority order (innermost first)
        if (fieldToDelete) {
          setFieldToDelete(null)
        } else if (showKeyboardHelp) {
          setShowKeyboardHelp(false)
        } else if (showAdvancedSettingsModal) {
          setShowAdvancedSettingsModal(false)
        } else if (error || fileUpload.error || csvParser.error || batchProcessor.error) {
          // Clear errors on ESC if no modals are open
          setError(null)
          fileUpload.clearError?.()
          csvParser.clearError?.()
          // batchProcessor doesn't have clearError, errors are managed via state
        }
      }
    }
    
    // Native handler for CMD+? (fallback if react-hotkeys-hook doesn't catch it)
    const handleCmdQuestion = (event: KeyboardEvent) => {
      // CMD+? on Mac is Meta+Shift+Slash, on Windows/Linux it's Ctrl+Shift+Slash
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? event.metaKey : event.ctrlKey
      
      if (modKey && event.shiftKey && (event.key === '/' || event.key === '?')) {
        event.preventDefault()
        setShowKeyboardHelp(true)
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleEscapeKey)
    document.addEventListener('keydown', handleCmdQuestion)

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('keydown', handleCmdQuestion)
    }
  }, [fieldToDelete, showKeyboardHelp, showAdvancedSettingsModal, error, fileUpload, csvParser, batchProcessor])

  // === RENDER ===
  return (
    <div className="h-full bg-background text-foreground flex flex-col">
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onDismiss={() => setShowOnboarding(false)}
          onComplete={() => setShowOnboarding(false)}
        />
      )}


      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main Content - matches LOG page structure exactly */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="bg-card h-full flex flex-col overflow-hidden">
          {/* Mobile: Flex layout - tabs header, content area, toolbar */}
          <div className="md:hidden h-full flex flex-col min-h-0 overflow-hidden">
            <Tabs value={mobileActiveTab} onValueChange={setMobileActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <TabsList className="flex-shrink-0 w-full rounded-none border-b border-border/40 bg-gradient-to-b from-secondary/30 to-secondary/15">
                <TabsTrigger value="configure" className="flex-1 data-[state=active]:bg-background/60 data-[state=active]:shadow-sm">
                  PRE
                </TabsTrigger>
                <TabsTrigger value="results" className="flex-1 flex items-center gap-2 data-[state=active]:bg-background/60 data-[state=active]:shadow-sm">
                  POST
                  {displayResults.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-md bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      {displayResults.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="configure" className="mt-0 flex-1 overflow-y-auto min-h-0 bg-gradient-to-br from-background via-background to-muted/5 px-4 pt-5 pb-4 space-y-4">
                {/* Error Banner - Enhanced with recovery suggestions */}
                {(fileUpload.error || csvParser.error || batchProcessor.error || error) && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md space-y-2 animate-slide-in-up relative">
                    <button
                      onClick={() => {
                        setError(null)
                        fileUpload.clearError?.()
                        csvParser.clearError?.()
                        batchProcessor.clearResults()
                      }}
                      className="absolute top-2 right-2 text-red-400/60 hover:text-red-400 transition-colors"
                      aria-label="Dismiss error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs sm:text-sm text-red-400 font-medium break-words pr-6">
                      {fileUpload.error || csvParser.error || batchProcessor.error || error}
                    </p>
                    {/* Enhanced error recovery suggestions */}
                    {(() => {
                          const errorLower = (fileUpload.error || csvParser.error || batchProcessor.error || error || '').toLowerCase()
                          
                          if (errorLower.includes('limit reached') || errorLower.includes('limit resets') || errorLower.includes('daily limit')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">What you can do:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Wait for the limit to reset (shown in banner above)</li>
                                  <li>Review and delete old batches in Dashboard</li>
                                  <li>Contact support to upgrade your plan</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('variable') || errorLower.includes('column') || errorLower.includes('missing')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Check that all variables in your prompt match CSV column names exactly</li>
                                  <li>Use the &quot;Quick fix&quot; button in the prompt section to remove missing variables</li>
                                  <li>Or add the missing columns to your CSV file</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('file type') || errorLower.includes('not supported') || (errorLower.includes('file') && errorLower.includes('csv'))) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Export your spreadsheet as CSV format</li>
                                  <li>In Excel: File → Save As → CSV (Comma delimited)</li>
                                  <li>In Google Sheets: File → Download → CSV</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('too large') || errorLower.includes('size') || errorLower.includes('10mb')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Split your CSV into smaller files (max 10MB each)</li>
                                  <li>Remove unnecessary columns to reduce file size</li>
                                  <li>Process files separately and combine results</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('empty') || errorLower.includes('0 bytes') || errorLower.includes('no data')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Check that your CSV file contains data rows</li>
                                  <li>Ensure the file wasn&apos;t corrupted during download</li>
                                  <li>Try re-exporting from your spreadsheet application</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('google sheets') || errorLower.includes('spreadsheet') || errorLower.includes('permission')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Ensure the Google Sheet is publicly accessible (View access)</li>
                                  <li>Or share it with the service account email</li>
                                  <li>Try downloading as CSV and uploading directly</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          // Generic recovery for unknown errors
                          return (
                            <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                              <p className="font-medium mb-1.5">Try these steps:</p>
                              <ul className="list-disc list-inside space-y-1 ml-1">
                                <li>Refresh the page and try again</li>
                                <li>Check your internet connection</li>
                                <li>If the problem persists, contact support</li>
                              </ul>
                            </div>
                          )
                        })()}
                    {(error?.includes('wait for your current batch') || error?.includes('batch to complete')) && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/batch/reset', { method: 'POST' })
                            if (response.ok) {
                              setError(null)
                            }
                          } catch {
                            // Silent failure - user can try again
                          }
                        }}
                        className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        aria-label="Reset stuck batch to allow new processing"
                      >
                        Reset Stuck Batch
                      </button>
                    )}
                  </div>
                )}

                {/* Validation Summary */}
                {csvParser.csvData && prompt && !variableValidation.isValid && variableValidation.missing.length > 0 && (
                  <ValidationSummary
                    errors={[
                      {
                        field: 'prompt',
                        message: `Prompt uses ${variableValidation.missing.map(v => `{{${v}}}`).join(', ')} but these columns don't exist in your CSV. Remove these variables or add these columns.`,
                        scrollToField: () => {
                          setPromptSectionOpen(true)
                          setTimeout(() => {
                            const textarea = document.querySelector('[data-testid="prompt-textarea"]') as HTMLTextAreaElement
                            textarea?.focus()
                            textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }, 100)
                        },
                      },
                    ]}
                    title="Fix these issues to continue"
                    dismissible={false}
                    className="mb-4"
                  />
                )}

                {/* INPUT SECTION */}
                <CollapsibleSection
                  title="Input"
                  open={dataInputSection.isOpen}
                  onOpenChange={dataInputSection.setIsOpen}
                  className="border border-border rounded-md bg-card"
                  triggerClassName="hover:bg-accent/20"
                  contentClassName="px-0 pb-0"
                  status={csvParser.csvData ? 'ready' : undefined}
                  statusMessage={csvParser.csvData ? 'Ready' : undefined}
                >
                  <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
                    <DataInputTabs
                      isParsing={csvParser.isParsing}
                      csvData={csvParser.csvData}
                      fileName={fileUpload.file?.name}
                      isUploading={isUploading}
                      onFileUpload={handleFileUpload}
                      onClearData={handleClearData}
                      selectedInputColumns={selectedInputColumns}
                      onInputColumnsChange={setSelectedInputColumns}
                      onColumnRename={csvParser.renameColumn}
                    />
                  </div>
                </CollapsibleSection>

                {/* TASK SECTION */}
                <CollapsibleSection
                  ref={promptSectionRef}
                  title="Task"
                  open={promptSectionOpen}
                  onOpenChange={setPromptSectionOpen}
                  className="border border-border rounded-md bg-card"
                  triggerClassName="hover:bg-accent/20"
                  highlight={!!csvParser.csvData && !prompt.trim()}
                  status={
                    !csvParser.csvData ? undefined :
                    !prompt.trim() ? undefined :
                    !variableValidation.isValid ? 'warning' :
                    'ready'
                  }
                  statusMessage={
                    !csvParser.csvData ? undefined :
                    !prompt.trim() ? undefined :
                    !variableValidation.isValid ? 'Missing variables (will run anyway)' :
                    'Ready'
                  }
                >
                  <PromptSection
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    csvData={csvParser.csvData}
                    selectedInputColumns={selectedInputColumns}
                    variableValidation={variableValidation}
                  />
                </CollapsibleSection>

                {/* OUTPUT SECTION */}
                <CollapsibleSection
                  title="Output"
                  open={outputSettingsSectionOpen}
                  onOpenChange={setOutputSettingsSectionOpen}
                  className="border border-border rounded-md bg-card"
                  triggerClassName="hover:bg-accent/20"
                  contentClassName="px-0 pb-0"
                  highlight={!!csvParser.csvData && !!prompt.trim() && variableValidation.isValid && outputFields.length === 0}
                  status={
                    !csvParser.csvData || !prompt.trim() ? undefined :
                    outputFields.length === 0 ? 'warning' :
                    'ready'
                  }
                  statusMessage={
                    !csvParser.csvData || !prompt.trim() ? undefined :
                    outputFields.length === 0 ? 'No output fields' :
                    'Ready'
                  }
                >
                  <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
                    <OutputFieldsSection
                      outputFields={outputFields}
                      newField={newField}
                      onNewFieldChange={setNewField}
                      onAddField={addOutputField}
                      onRemoveField={removeOutputField}
                    />

                    {/* TOOL SELECTION */}
                    <ToolSelectionSection
                      selectedTools={selectedTools}
                      onToggleTool={toggleTool}
                      hasOutputColumns={outputFields.length > 0}
                    />
                  </div>
                </CollapsibleSection>

                {/* AI OPTIMIZATION RESULTS - Placed below Output section */}
                {(optimizedPrompt || outputColumns.length > 0 || suggestedInputColumns.length > 0 || suggestedTools.length > 0 || isOptimizing) && (
                  <JobPreview
                    optimizedPrompt={optimizedPrompt || undefined}
                    setOptimizedPrompt={setOptimizedPrompt}
                    outputColumns={outputColumns}
                    suggestedInputColumns={suggestedInputColumns}
                    suggestedTools={suggestedTools}
                    reasoning={reasoning}
                    isOptimizing={isOptimizing}
                    onAccept={handleAcceptOptimization}
                    onReject={handleRejectOptimization}
                    isExiting={isJobPreviewExiting}
                    csvColumns={csvParser.csvData?.columns || []}
                  />
                )}
              </TabsContent>

              <TabsContent value="results" className="mt-0 flex-1 overflow-y-auto min-h-0 bg-card">
                {/* Show loading screen when processing but no results yet */}
                {(batchProcessor.isProcessing || isStartingBatch) && displayResults.length === 0 ? (
                  <div className="flex-1 h-full flex items-center justify-center p-8">
                    <BatchLoadingScreen 
                      rowCount={isTesting ? 1 : (csvParser.csvData?.totalRows || 0)}
                      tools={selectedTools}
                      prompt={prompt}
                      initialElapsedSeconds={batchProcessor.elapsedSeconds}
                    />
                  </div>
                ) : displayResults.length > 0 ? (
                  <ResultsTable
                    results={displayResults}
                    columns={selectedInputColumns}
                    outputColumns={outputFields}
                    progress={batchProcessor.progress ?? undefined}
                    onExport={handleExport}
                    onRetry={handleRetryRow}
                    isTesting={isTesting}
                    testStartTime={testStartTime}
                    testEstimatedSeconds={isTesting && prompt ? getTimeEstimate(1, prompt.length, selectedTools.length).seconds : undefined}
                    totalInputTokens={tokenTotals.input}
                    totalOutputTokens={tokenTotals.output}
                    isQueued={batchProcessor.isQueued}
                    queueInfo={batchProcessor.queueInfo}
                    isStarting={isStartingBatch}
                    enabledTools={selectedTools}
                  />
                ) : (
                  <div className="flex-1 h-full flex items-center justify-center p-8 bg-card">
                    <div className="text-center space-y-3 max-w-sm">
                      {csvParser.csvData ? (
                        <>
                          <div className="flex justify-center">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                              <Play className="h-6 w-6 text-primary/60" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Ready to process</p>
                            <p className="text-xs text-muted-foreground">
                              {csvParser.csvData.totalRows} {csvParser.csvData.totalRows === 1 ? 'row' : 'rows'} ready
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-center">
                            <span className="text-4xl" role="img" aria-hidden="true">🏟️</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Ready to run</p>
                            <p className="text-xs text-muted-foreground">
                              Upload a CSV and configure your prompt to get started
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* MOBILE TOOLBAR - 3rd row of grid, only on PRE tab */}
            {mobileActiveTab === 'configure' && (
            <div className="px-4 border-t border-border/50 bg-background">
              <div className="flex items-center justify-between h-14">
                {/* Left: Reset & Help */}
                <div className="flex items-center">
                  <button
                    onClick={() => setShowResetConfirmation(true)}
                    className="flex items-center justify-center h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    aria-label="Reset configuration"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowKeyboardHelp(true)}
                    className="flex items-center justify-center h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    aria-label="Help"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>

                {/* Right: AI Optimization + Run Actions */}
                <div className="flex items-center gap-2">
                  <ToolbarButtonGroup>
                    <ToolbarIconButton
                      icon={<span className="text-base">✨</span>}
                      tooltip={!csvParser.csvData || !prompt ? "Upload CSV and add prompt to optimize" : "Optimize with AI"}
                      onClick={handleOptimize}
                      disabled={!csvParser.csvData || !prompt || isOptimizing}
                      isLoading={isOptimizing}
                      className={csvParser.csvData && prompt && outputFields.length > 0 && !isOptimizing && !hasAISuggestion && !hasOptimizationBeenApplied ? 'ring-1 ring-green-500/50' : undefined}
                    />
                    <ToolbarDivider />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border-0 rounded-md hover:bg-accent/50 [&_svg]:h-4 [&_svg]:w-4"
                          aria-label="AI optimization settings"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" align="end" side="top">
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-foreground">What to optimize:</div>
                          <div className="space-y-2">
                            <label className="flex items-center justify-between cursor-pointer group">
                              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Input</span>
                              <Switch checked={optimizeInput} onCheckedChange={setOptimizeInput} />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group">
                              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Task</span>
                              <Switch checked={optimizeTask} onCheckedChange={setOptimizeTask} />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group">
                              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Output</span>
                              <Switch checked={optimizeOutput} onCheckedChange={setOptimizeOutput} />
                            </label>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </ToolbarButtonGroup>

                  <ToolbarButtonGroup>
                    <ToolbarIconButton
                      icon={<span className="text-base">🧪</span>}
                      tooltip={!csvParser.csvData || !prompt ? "Upload CSV and add prompt to test" : "Test with first row"}
                      onClick={handleTest}
                      disabled={!csvParser.csvData || !prompt || isTesting}
                      isLoading={isTesting}
                    />
                    <ToolbarDivider />
                    {batchProcessor.isProcessing ? (
                      <ToolbarIconButton
                        icon={<span className="text-base">⏹️</span>}
                        tooltip="Stop processing"
                        onClick={handleStopProcessing}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                      />
                    ) : (
                      <ToolbarPrimaryButton
                        icon={<Play className="h-4 w-4" />}
                        tooltip={`Run all ${csvParser.csvData?.totalRows || 0} rows`}
                        onClick={handleProcess}
                        disabled={!csvParser.csvData || !prompt || batchProcessor.isProcessing}
                        isLoading={batchProcessor.isProcessing}
                      />
                    )}
                  </ToolbarButtonGroup>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Desktop: Side-by-side panels */}
          <div className="hidden md:grid h-full grid-cols-2 gap-0 overflow-hidden">
            {/* LEFT PANEL - Configuration with actions at bottom */}
            <div className="h-full border-r border-border/40 bg-gradient-to-br from-secondary/20 via-secondary/15 to-background flex flex-col min-h-0 overflow-hidden shadow-sm">
              <div className="flex-1 overflow-y-auto px-4 lg:px-5 pt-5 lg:pt-6 pb-4 lg:pb-5 space-y-4 lg:space-y-5 min-h-0">
                {/* Error - Use V2 error if available */}
                {(fileUpload.error || csvParser.error || batchProcessor.error || error) && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md space-y-2 animate-slide-in-up relative">
                    <button
                      onClick={() => {
                        setError(null)
                        fileUpload.clearError?.()
                        csvParser.clearError?.()
                        batchProcessor.clearResults()
                      }}
                      className="absolute top-2 right-2 text-red-400/60 hover:text-red-400 transition-colors"
                      aria-label="Dismiss error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs sm:text-sm text-red-400 font-medium break-words pr-6">
                      {fileUpload.error || csvParser.error || batchProcessor.error || error}
                    </p>
                    {/* Enhanced error recovery suggestions */}
                    {(() => {
                          const errorLower = (fileUpload.error || csvParser.error || batchProcessor.error || error || '').toLowerCase()
                          
                          if (errorLower.includes('limit reached') || errorLower.includes('limit resets') || errorLower.includes('daily limit')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">What you can do:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Wait for the limit to reset (shown in banner above)</li>
                                  <li>Review and delete old batches in Dashboard</li>
                                  <li>Contact support to upgrade your plan</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('variable') || errorLower.includes('column') || errorLower.includes('missing')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Check that all variables in your prompt match CSV column names exactly</li>
                                  <li>Use the &quot;Quick fix&quot; button in the prompt section to remove missing variables</li>
                                  <li>Or add the missing columns to your CSV file</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('file type') || errorLower.includes('not supported') || (errorLower.includes('file') && errorLower.includes('csv'))) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Export your spreadsheet as CSV format</li>
                                  <li>In Excel: File → Save As → CSV (Comma delimited)</li>
                                  <li>In Google Sheets: File → Download → CSV</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('too large') || errorLower.includes('size') || errorLower.includes('10mb')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Split your CSV into smaller files (max 10MB each)</li>
                                  <li>Remove unnecessary columns to reduce file size</li>
                                  <li>Process files separately and combine results</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('empty') || errorLower.includes('0 bytes') || errorLower.includes('no data')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Check that your CSV file contains data rows</li>
                                  <li>Ensure the file wasn&apos;t corrupted during download</li>
                                  <li>Try re-exporting from your spreadsheet application</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('google sheets') || errorLower.includes('spreadsheet') || errorLower.includes('permission')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Ensure the Google Sheet is publicly accessible (View access)</li>
                                  <li>Or share it with the service account email</li>
                                  <li>Try downloading as CSV and uploading directly</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          // Generic recovery for unknown errors
                          return (
                            <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                              <p className="font-medium mb-1.5">Try these steps:</p>
                              <ul className="list-disc list-inside space-y-1 ml-1">
                                <li>Refresh the page and try again</li>
                                <li>Check your internet connection</li>
                                <li>If the problem persists, contact support</li>
                              </ul>
                            </div>
                          )
                        })()}
                    {(error?.includes('wait for your current batch') || error?.includes('batch to complete')) && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/batch/reset', { method: 'POST' })
                            if (response.ok) {
                              setError(null)
                            }
                          } catch {
                            // Silent failure - user can try again
                          }
                        }}
                        className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        aria-label="Reset stuck batch to allow new processing"
                      >
                        Reset Stuck Batch
                      </button>
                    )}
                  </div>
                )}

                {/* Validation Summary - Only show after user attempts to test/process */}
                {/* Don't overwhelm users with errors before they've tried anything */}
                {hasAttemptedAction && csvParser.csvData && prompt && !variableValidation.isValid && variableValidation.missing.length > 0 && (
                  <ValidationSummary
                    errors={[
                      {
                        field: 'prompt',
                        message: `Prompt uses ${variableValidation.missing.map(v => `{{${v}}}`).join(', ')} but these columns don't exist in your CSV. Remove these variables or add these columns.`,
                        scrollToField: () => {
                          setPromptSectionOpen(true)
                          setTimeout(() => {
                            const textarea = document.querySelector('[data-testid="prompt-textarea"]') as HTMLTextAreaElement
                            textarea?.focus()
                            textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }, 100)
                        },
                      },
                    ]}
                    title="Fix these issues to continue"
                    dismissible={false}
                    className="mb-4"
                  />
                )}

                {/* Unused columns warning - Hidden to reduce noise */}

                {/* WORKFLOW STEPS - Hidden to reduce visual noise, onboarding handles guidance */}

                {/* INPUT SECTION */}
                <CollapsibleSection
                  title="Input"
                  open={dataInputSection.isOpen}
                  onOpenChange={dataInputSection.setIsOpen}
                  className="border border-border rounded-md bg-card"
                  triggerClassName="hover:bg-accent/20"
                  contentClassName="px-0 pb-0"
                  status={csvParser.csvData ? 'ready' : undefined}
                  statusMessage={csvParser.csvData ? 'Ready' : undefined}
                >
                  <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
                    <DataInputTabs
                isParsing={csvParser.isParsing}
                csvData={csvParser.csvData}
                fileName={fileUpload.file?.name}
                isUploading={isUploading}
                onFileUpload={handleFileUpload}
                onClearData={handleClearData}
                selectedInputColumns={selectedInputColumns}
                    onInputColumnsChange={setSelectedInputColumns}
                      onColumnRename={csvParser.renameColumn}
                  />
                </div>
              </CollapsibleSection>

              {/* TASK SECTION */}
              <CollapsibleSection
                title="Task"
                open={promptSectionOpen}
                onOpenChange={setPromptSectionOpen}
                className="border border-border rounded-md bg-card"
                triggerClassName="hover:bg-accent/20"
                contentClassName="px-0 pb-0"
                highlight={!!csvParser.csvData && !prompt.trim()}
                status={
                  !csvParser.csvData ? undefined :
                  !prompt.trim() ? undefined :
                  !variableValidation.isValid ? 'warning' :
                  'ready'
                }
                statusMessage={
                  !csvParser.csvData ? undefined :
                  !prompt.trim() ? undefined :
                  !variableValidation.isValid ? 'Missing variables (will run anyway)' :
                  'Ready'
                }
              >
                <PromptSection
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  csvData={csvParser.csvData}
                  selectedInputColumns={selectedInputColumns}
                  variableValidation={variableValidation}
                />
              </CollapsibleSection>

              {/* OUTPUT SECTION */}
              <CollapsibleSection
                title="Output"
                open={outputSettingsSectionOpen}
                onOpenChange={setOutputSettingsSectionOpen}
                className="border border-border rounded-md bg-card"
                triggerClassName="hover:bg-accent/20"
                contentClassName="px-0 pb-0"
                highlight={!!csvParser.csvData && !!prompt.trim() && variableValidation.isValid && outputFields.length === 0}
                status={
                  !csvParser.csvData || !prompt.trim() ? undefined :
                  outputFields.length === 0 ? 'warning' :
                  'ready'
                }
                statusMessage={
                  !csvParser.csvData || !prompt.trim() ? undefined :
                  outputFields.length === 0 ? 'No output fields' :
                  'Ready'
                }
              >
                {/* OUTPUT COLUMNS - JSON mode always enabled for structured output */}
                <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
                  <OutputFieldsSection
                    outputFields={outputFields}
                    newField={newField}
                    onNewFieldChange={setNewField}
                    onAddField={addOutputField}
                    onRemoveField={removeOutputField}
                  />

                  {/* TOOL SELECTION */}
                  <ToolSelectionSection
                    selectedTools={selectedTools}
                    onToggleTool={toggleTool}
                    hasOutputColumns={outputFields.length > 0}
                  />
                </div>
              </CollapsibleSection>

              {/* AI OPTIMIZATION RESULTS - Placed below Output section */}
              {(optimizedPrompt || outputColumns.length > 0 || suggestedInputColumns.length > 0 || suggestedTools.length > 0 || isOptimizing) && (
                <div ref={jobPreviewRef} id="ai-suggestion-panel">
                <JobPreview
                  optimizedPrompt={optimizedPrompt || undefined}
                  setOptimizedPrompt={setOptimizedPrompt}
                  outputColumns={outputColumns}
                  suggestedInputColumns={suggestedInputColumns}
                  suggestedTools={suggestedTools}
                  reasoning={reasoning}
                  isOptimizing={isOptimizing}
                  onAccept={handleAcceptOptimization}
                  onReject={handleRejectOptimization}
                  isExiting={isJobPreviewExiting}
                  csvColumns={csvParser.csvData?.columns || []}
                />
                </div>
              )}
              </div>

          {/* ACTIONS TOOLBAR - Bottom of LEFT panel only */}
          <div className="flex-shrink-0 px-4 lg:px-5 border-t border-border/50 bg-background/80 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between h-14">
              {/* Left: Reset and Help - no gap */}
              <div className="flex items-center">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowResetConfirmation(true)}
                        className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                        aria-label="Reset configuration"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Reset configuration
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowKeyboardHelp(true)}
                        className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                        aria-label="View keyboard shortcuts"
                        title="Keyboard shortcuts (⌘?)"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Keyboard shortcuts (⌘?)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Right: AI Optimization + Run Actions */}
              <div className="flex items-center gap-2">
                <ToolbarButtonGroup>
                  <ToolbarIconButton
                    icon={<span className="text-base">✨</span>}
                    tooltip={!csvParser.csvData || !prompt ? "Upload CSV and add prompt to optimize" : "Optimize with AI"}
                    onClick={handleOptimize}
                    disabled={!csvParser.csvData || !prompt || isOptimizing}
                    isLoading={isOptimizing}
                    className={csvParser.csvData && prompt && outputFields.length > 0 && !isOptimizing && !hasAISuggestion ? 'ring-1 ring-green-500/50' : undefined}
                  />
                  <ToolbarDivider />
                  <Popover>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border-0 rounded-md hover:bg-accent/50 [&_svg]:h-4 [&_svg]:w-4"
                              aria-label="AI optimization settings"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}>
                          <p className="text-xs">Optimization settings</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <PopoverContent className="w-56" align="end">
                      <div className="space-y-3">
                        <div className="text-xs font-medium text-foreground">What to optimize:</div>
                        <div className="space-y-2">
                          <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Input</span>
                            <Switch
                              checked={optimizeInput}
                              onCheckedChange={setOptimizeInput}
                            />
                          </label>
                          <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Task</span>
                            <Switch
                              checked={optimizeTask}
                              onCheckedChange={setOptimizeTask}
                            />
                          </label>
                          <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Output</span>
                            <Switch
                              checked={optimizeOutput}
                              onCheckedChange={setOptimizeOutput}
                            />
                          </label>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </ToolbarButtonGroup>

                <ToolbarButtonGroup>
                  <ToolbarIconButton
                    icon={<span className="text-base">🧪</span>}
                    tooltip={!variableValidation.isValid ? "Test (warning: missing variables)" : "Test with first row"}
                    onClick={handleTest}
                    disabled={!csvParser.csvData || !prompt || isTesting}
                    isLoading={isTesting}
                  />
                  <ToolbarDivider />
                  {batchProcessor.isProcessing ? (
                    <ToolbarIconButton
                      icon={<span className="text-base">⏹️</span>}
                      tooltip="Stop processing"
                      onClick={handleStopProcessing}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                      data-testid="stop-button"
                    />
                  ) : (
                    <ToolbarPrimaryButton
                      icon={<Play className="h-4 w-4" />}
                      tooltip={`Run all ${csvParser.csvData?.totalRows || 0} rows${timeEstimate ? ` (${timeEstimate.formatted})` : ''}${!variableValidation.isValid ? ' (warning: missing variables)' : ''}`}
                      onClick={handleProcess}
                      disabled={!csvParser.csvData || !prompt || batchProcessor.isProcessing}
                      isLoading={batchProcessor.isProcessing}
                      data-testid="run-button"
                    />
                  )}
                </ToolbarButtonGroup>
              </div>
            </div>
          </div>
            </div>

            {/* RIGHT PANEL - Results */}
            <div className="h-full overflow-hidden flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/10 border-l border-border/30">
              {/* Show loading screen when processing but no results yet */}
              {(batchProcessor.isProcessing || isStartingBatch) && displayResults.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <BatchLoadingScreen 
                    rowCount={isTesting ? 1 : (csvParser.csvData?.totalRows || 0)}
                    tools={selectedTools}
                    prompt={prompt}
                    initialElapsedSeconds={batchProcessor.elapsedSeconds}
                  />
                </div>
              ) : displayResults.length > 0 ? (
                <ResultsTable
                  results={displayResults}
                  columns={selectedInputColumns}
                  outputColumns={outputFields}
                  progress={batchProcessor.progress ?? undefined}
                  onExport={handleExport}
                  onRetry={handleRetryRow}
                  isTesting={isTesting}
                  testStartTime={testStartTime}
                  testEstimatedSeconds={isTesting && prompt ? getTimeEstimate(1, prompt.length, selectedTools.length).seconds : undefined}
                  totalInputTokens={tokenTotals.input}
                  totalOutputTokens={tokenTotals.output}
                  isQueued={batchProcessor.isQueued}
                  queueInfo={batchProcessor.queueInfo}
                  isStarting={isStartingBatch}
                  forceTableView={true}
                  enabledTools={selectedTools}
                />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-3 max-w-sm">
                {csvParser.csvData ? (
                  <>
                    <div className="flex justify-center">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Play className="h-6 w-6 text-primary/60" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Ready to process</p>
                      <p className="text-xs text-muted-foreground">
                        {csvParser.csvData.totalRows} {csvParser.csvData.totalRows === 1 ? 'row' : 'rows'} ready
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <span className="text-4xl" role="img" aria-hidden="true">🏟️</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Ready to run</p>
                      <p className="text-xs text-muted-foreground">
                        Upload a CSV and configure your prompt to get started
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          </div>
          </div>
        </div>
      </div>



      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      <Modal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        title="Keyboard Shortcuts"
        titleEmoji="⌨️"
        size="md"
        ariaLabelledBy="keyboard-shortcuts-title"
        footer={
          <button onClick={() => setShowKeyboardHelp(false)} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors">
            Got it
          </button>
        }
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Keyboard shortcuts</p>

          <div className="space-y-4">
            {/* File Operations */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File Operations</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Open file picker</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">O</kbd>
                  </div>
                </div>
              </div>
            </div>


            {/* Processing */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processing</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Test with first row</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">T</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-foreground">Process All ({csvParser.csvData?.totalRows || 0} rows)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">↵</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary/90">Pro Tip</p>
                  <p className="text-xs text-primary/70 leading-relaxed">
                    Use ⌘T to test your prompt with the first row before running the full batch. This helps you verify the output format and catch any issues early.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* DELETE OUTPUT FIELD CONFIRMATION MODAL */}
      <Modal
        isOpen={fieldToDelete !== null}
        onClose={() => setFieldToDelete(null)}
        title="Delete Output Field?"
        titleEmoji="⚠️"
        size="sm"
        ariaLabelledBy="delete-field-title"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setFieldToDelete(null)}
              className="px-4 py-2 bg-accent hover:bg-accent text-foreground text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteOutputField}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              Delete Field
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete the output field <span className="font-mono text-primary">{fieldToDelete}</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. You&apos;ll need to manually add it back if you change your mind.
          </p>
        </div>
      </Modal>

      {/* RESET CONFIGURATION CONFIRMATION MODAL */}
      <Modal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        title="Reset configuration?"
        titleEmoji="😰"
        size="sm"
        ariaLabelledBy="reset-config-title"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetConfiguration}
            >
              Reset
            </Button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          This will clear your prompt, output fields, selected tools, and AI optimization settings. Your CSV file will remain unchanged.
        </p>
      </Modal>

      {/* CLEAR DATA CONFIRMATION MODAL (Bug H fix) */}
      <Modal
        isOpen={showClearDataConfirmation}
        onClose={() => setShowClearDataConfirmation(false)}
        title="Clear data?"
        titleEmoji="🗑️"
        size="sm"
        ariaLabelledBy="clear-data-title"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDataConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmClearData}
            >
              Clear Data
            </Button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          This will remove your uploaded CSV file and all processing results. This action cannot be undone.
        </p>
      </Modal>

    </div>
  )
}
