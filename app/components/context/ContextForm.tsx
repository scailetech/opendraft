'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe, CheckCircle, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useContextStorage } from '@/hooks/useContextStorage'
import { toast } from 'sonner'

/**
 * Context Form Component
 * Allows users to analyze a website domain to extract company context
 */

export function ContextForm() {
  const { businessContext, updateContext, clearContext, hasContext, isLoading } = useContextStorage()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)

  const EXPECTED_ANALYSIS_TIME = 38 // seconds for Gemini 3 Pro
  
  // Load Gemini API key and analyzed URL from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini-api-key')
      setGeminiApiKey(storedKey)
      
      const stored = localStorage.getItem('bulk-gpt-analyzed-url')
      if (stored && hasContext) {
        setAnalyzedUrl(stored)
      }
    }
  }, [hasContext])

  const handleAnalyzeWebsite = useCallback(async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL')
      return
    }

    // API key is optional if server has GEMINI_API_KEY env variable
    // Show warning but allow request to proceed
    if (!geminiApiKey) {
      console.log('[ContextForm] No client API key, will try server env variable')
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setTimeRemaining(EXPECTED_ANALYSIS_TIME)
    
    // Start progress timer
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min((elapsed / EXPECTED_ANALYSIS_TIME) * 100, 95) // Cap at 95% until complete
      const remaining = Math.max(EXPECTED_ANALYSIS_TIME - Math.floor(elapsed), 0)
      
      setAnalysisProgress(progress)
      setTimeRemaining(remaining)
    }, 100)
    
    try {
      // Call local API endpoint with Gemini key
      const response = await fetch('/api/analyse-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: websiteUrl.trim(),
          apiKey: geminiApiKey,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to analyze website' }))
        throw new Error(error.message || error.error || 'Failed to analyze website')
      }

      const data = await response.json()

      // Map the simplified response to our context structure
      const contextUpdates: Record<string, any> = {}
      
      // Core info
      if (data.company_name) contextUpdates.companyName = data.company_name
      if (data.company_url) contextUpdates.companyWebsite = data.company_url
      if (data.description) contextUpdates.productDescription = data.description
      if (data.industry) contextUpdates.targetIndustries = data.industry
      if (data.target_audience) contextUpdates.targetAudience = data.target_audience
      if (data.tone) contextUpdates.brandTone = data.tone
      
      // Products/services as comma-separated list
      if (data.products && Array.isArray(data.products) && data.products.length > 0) {
        contextUpdates.products = data.products.join(', ')
      }
      
      // Competitors as comma-separated list
      if (data.competitors && Array.isArray(data.competitors) && data.competitors.length > 0) {
        contextUpdates.competitors = data.competitors.join(', ')
      }
      
      // Pain points as comma-separated list
      if (data.pain_points && Array.isArray(data.pain_points) && data.pain_points.length > 0) {
        contextUpdates.painPoints = data.pain_points.join(', ')
      }
      
      // Value propositions as comma-separated list
      if (data.value_propositions && Array.isArray(data.value_propositions) && data.value_propositions.length > 0) {
        contextUpdates.valuePropositions = data.value_propositions.join(', ')
      }
      
      // Use cases as comma-separated list
      if (data.use_cases && Array.isArray(data.use_cases) && data.use_cases.length > 0) {
        contextUpdates.useCases = data.use_cases.join(', ')
      }
      
      // Content themes as comma-separated list
      if (data.content_themes && Array.isArray(data.content_themes) && data.content_themes.length > 0) {
        contextUpdates.contentThemes = data.content_themes.join(', ')
      }

      updateContext(contextUpdates)

      // Store the analyzed URL
      const normalizedUrl = websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`
      setAnalyzedUrl(normalizedUrl)
      if (typeof window !== 'undefined') {
        localStorage.setItem('bulk-gpt-analyzed-url', normalizedUrl)
      }

      // Complete progress
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setTimeRemaining(0)

      toast.success('Website analyzed successfully')
    } catch (error) {
      console.error('Analysis error:', error)
      clearInterval(progressInterval)
      setAnalysisProgress(0)
      setTimeRemaining(0)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze website')
    } finally {
      setIsAnalyzing(false)
    }
  }, [websiteUrl, updateContext, geminiApiKey])

  const handleClearAll = useCallback(() => {
    clearContext()
    setAnalyzedUrl(null)
    setShowClearConfirmation(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bulk-gpt-analyzed-url')
    }
    toast.success('Context cleared')
  }, [clearContext])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-secondary/50 rounded animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* API Key Info (not blocking) */}
      {!geminiApiKey && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-500">Using Server API Key</p>
          </div>
              <p className="text-xs text-muted-foreground">
                No client API key set. The server will use its configured GEMINI_API_KEY environment variable. 
                To use your own key, set it in{' '}
                <a href="/settings" className="text-primary hover:underline">
                  Settings
                </a>.
              </p>
        </div>
      )}

      {/* Website Analysis Section */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <Label htmlFor="website-url" className="text-sm font-semibold text-foreground">
            Analyze Website
          </Label>
        </div>
        
        {/* Show analyzed URL if data exists */}
        {analyzedUrl && hasContext && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-primary/20 rounded-md">
            <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Data from:</span>
            <a 
              href={analyzedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-medium truncate flex-1"
            >
              {analyzedUrl}
            </a>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            id="website-url"
            type="text"
            placeholder="yourcompany.com or https://yourcompany.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isAnalyzing && websiteUrl.trim()) {
                handleAnalyzeWebsite()
              }
            }}
            disabled={isAnalyzing}
            className="text-xs flex-1"
          />
          <Button
            onClick={handleAnalyzeWebsite}
            disabled={!websiteUrl.trim() || isAnalyzing}
            size="sm"
            className="text-xs font-medium"
          >
            {isAnalyzing ? (
              <>
                <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </Button>
        </div>
        
        {/* Progress Bar with Timer */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Analyzing with Gemini 3 Pro...
              </span>
              <span className="font-medium text-primary">
                {timeRemaining > 0 ? `~${timeRemaining}s remaining` : 'Finalizing...'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Enter a website URL to extract company context for AEO optimization
        </p>
      </div>

      {/* Divider */}
      {hasContext && <div className="border-t border-border" />}

      {/* Context Display */}
      {hasContext && (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Extracted Context</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirmation(true)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          </div>

          <div className="grid gap-3">
            {businessContext.companyName && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input value={businessContext.companyName} readOnly className="text-xs bg-muted/50" />
                  </div>
            )}
            
            {businessContext.companyWebsite && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input value={businessContext.companyWebsite} readOnly className="text-xs bg-muted/50" />
                  </div>
            )}
            
            {businessContext.targetIndustries && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Industry</Label>
                <Input value={businessContext.targetIndustries} readOnly className="text-xs bg-muted/50" />
                  </div>
            )}
            
            {businessContext.productDescription && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
                  value={businessContext.productDescription} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={3}
            />
          </div>
            )}
            
            {businessContext.products && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Products/Services</Label>
            <Textarea
                  value={businessContext.products} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
            </div>
          )}
            
            {businessContext.targetAudience && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Target Audience</Label>
                <Input value={businessContext.targetAudience} readOnly className="text-xs bg-muted/50" />
            </div>
          )}
            
            {businessContext.competitors && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Competitors</Label>
                <Textarea 
                  value={businessContext.competitors} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
            
            {businessContext.brandTone && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Brand Tone</Label>
                <Input value={businessContext.brandTone} readOnly className="text-xs bg-muted/50" />
              </div>
            )}
            
            {businessContext.painPoints && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pain Points</Label>
                <Textarea 
                  value={businessContext.painPoints} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={3}
                />
              </div>
            )}
            
            {businessContext.valuePropositions && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Value Propositions</Label>
                <Textarea 
                  value={businessContext.valuePropositions} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
            
            {businessContext.useCases && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Use Cases</Label>
                <Textarea 
                  value={businessContext.useCases} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
            
            {businessContext.contentThemes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Content Themes</Label>
                <Textarea 
                  value={businessContext.contentThemes} 
                  readOnly 
                  className="text-xs bg-muted/50 resize-none" 
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-sm font-semibold">Clear all context?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              This will clear all extracted context. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirmation(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
            </div>
          </div>
        </div>
      )}
      </div>
  )
}
