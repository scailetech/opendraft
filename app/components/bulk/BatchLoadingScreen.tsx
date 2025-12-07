'use client'

import { useState, useEffect } from 'react'

interface BatchLoadingScreenProps {
  rowCount: number
  filename?: string // Kept for compatibility, but not displayed
  tools?: string[]
  prompt?: string // Used to generate task description
  initialElapsedSeconds?: number // Resume from this time when navigating back
}

/**
 * Clean loading screen with progress bar that fills based on estimated time.
 * Inspired by ChatGPT deep research / AI optimization loading bars.
 */
export function BatchLoadingScreen({ rowCount, tools = [], prompt, initialElapsedSeconds = 0 }: BatchLoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds)

  const hasWebSearch = tools.includes('web-search')
  const hasScrapePage = tools.includes('scrape-page')
  const hasTools = hasWebSearch || hasScrapePage
  
  // Generate smart task description based on tools and prompt
  const getTaskDescription = (): string => {
    if (hasWebSearch && hasScrapePage) {
      return 'Researching & analyzing websites'
    } else if (hasWebSearch) {
      return 'Researching with web search'
    } else if (hasScrapePage) {
      return 'Analyzing website content'
    } else if (prompt) {
      // Extract first meaningful phrase from prompt (up to 40 chars)
      const cleaned = prompt.replace(/\{\{.*?\}\}/g, '').trim()
      const firstLine = cleaned.split('\n')[0].substring(0, 40)
      return firstLine.length < cleaned.length ? `${firstLine}...` : firstLine
    }
    return 'Processing with AI'
  }

  // Calculate estimated time in seconds based on rows and tools
  // Based on real-world observations with Modal parallel processing
  // ALL rows process in parallel on Modal - 1000 rows takes ~same time as 1 row!
  const getEstimatedSeconds = (rows: number, usingTools: boolean): number => {
    // Cold start + container spin-up + result collection
    const overheadTime = 5
    
    // Single row processing time (all rows run in parallel, so this is the total)
    // With tools: ~10-12 seconds (web search + scrape adds latency)
    // Without tools: ~3-5 seconds
    const singleRowTime = usingTools ? 12 : 5
    
    // Small overhead for very large batches (result collection, DB writes)
    // But NOT proportional to row count since processing is parallel
    const collectionOverhead = rows > 500 ? 3 : (rows > 100 ? 2 : 0)
    
    return Math.ceil(overheadTime + singleRowTime + collectionOverhead)
  }

  const estimatedSeconds = getEstimatedSeconds(rowCount, hasTools)
  
  // Human-readable time estimate - more granular for better UX
  const getEstimatedTimeText = (seconds: number): string => {
    if (seconds <= 10) return '~10 seconds'
    if (seconds <= 20) return '~20 seconds'
    if (seconds <= 30) return '~30 seconds'
    if (seconds <= 45) return '~45 seconds'
    if (seconds <= 60) return '~1 minute'
    if (seconds <= 90) return '~1.5 minutes'
    if (seconds <= 120) return '~2 minutes'
    if (seconds <= 180) return '~3 minutes'
    if (seconds <= 240) return '~4 minutes'
    if (seconds <= 300) return '~5 minutes'
    return '5+ minutes'
  }

  // Rotating messages with emojis
  const messages = hasTools ? [
    { emoji: '✨', text: 'Initializing AI' },
    { emoji: '📊', text: 'Loading your data' },
    hasWebSearch ? { emoji: '🔍', text: 'Searching the web' } : { emoji: '🧠', text: 'Analyzing data' },
    hasScrapePage ? { emoji: '🌐', text: 'Reading websites' } : { emoji: '💭', text: 'AI is thinking' },
    { emoji: '⚡', text: 'Generating responses' },
    { emoji: '🎯', text: 'Almost done' },
  ] : [
    { emoji: '✨', text: 'Initializing AI' },
    { emoji: '📊', text: 'Loading your data' },
    { emoji: '🧠', text: 'AI is processing' },
    { emoji: '⚡', text: 'Generating responses' },
    { emoji: '🎯', text: 'Almost done' },
  ]

  // Rotate messages every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [messages.length])

  // Progress bar animation - fills up over estimated time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 0.1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Calculate progress percentage with easing (slows down near end)
  useEffect(() => {
    // Progress based on elapsed vs estimated time
    const rawProgress = (elapsedSeconds / estimatedSeconds) * 100
    
    // Apply easing - fast at start, slows down approaching 95%
    // Never reaches 100% (that happens when results actually arrive)
    let easedProgress: number
    if (rawProgress < 50) {
      easedProgress = rawProgress
    } else if (rawProgress < 80) {
      easedProgress = 50 + (rawProgress - 50) * 0.8
    } else if (rawProgress < 100) {
      easedProgress = 74 + (rawProgress - 80) * 0.5
    } else {
      // After estimated time, crawl slowly up to 95%
      const overtime = rawProgress - 100
      easedProgress = Math.min(95, 84 + overtime * 0.1)
    }
    
    setProgress(easedProgress)
  }, [elapsedSeconds, estimatedSeconds])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-6 w-full max-w-md mx-auto">
      {/* Magic sparkle animation */}
      <div className="relative">
        <div className="text-5xl animate-bounce" style={{ animationDuration: '2s' }}>
          {messages[messageIndex].emoji}
        </div>
        {/* Sparkle particles */}
        <div className="absolute -top-2 -right-2 text-lg animate-ping" style={{ animationDuration: '1.5s' }}>✨</div>
        <div className="absolute -bottom-1 -left-2 text-sm animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>✨</div>
      </div>

      {/* Main heading */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">
          {getTaskDescription()}
        </h3>
        <p className="text-sm text-muted-foreground">
          {rowCount.toLocaleString()} {rowCount === 1 ? 'row' : 'rows'} · {getEstimatedTimeText(estimatedSeconds)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${progress}%`,
              boxShadow: '0 0 8px rgba(var(--primary), 0.5)'
            }}
          />
        </div>
      </div>

      {/* Status message with fade animation */}
      <div 
        key={messageIndex}
        className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-full"
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        <span>{messages[messageIndex].emoji}</span>
        <span>{messages[messageIndex].text}</span>
      </div>

      {/* Subtle footer */}
      <p className="text-xs text-muted-foreground/50 mt-4">
        You can close this tab — check results on LOG page
      </p>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default BatchLoadingScreen
