/**
 * ABOUTME: Tool selection section for bulk processor
 * ABOUTME: Allows users to select which GTM tools the AI can use during batch processing
 * ABOUTME: Shows 5 essential tools by default, with all other tools in a single collapsible "More Tools" section
 */

'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Search, X, HelpCircle } from 'lucide-react'
import { type GTMTool, ESSENTIAL_GTM_TOOLS, ALL_OTHER_TOOLS } from '@/lib/types/gtm-types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { searchTools } from '@/lib/tool-search'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Re-export for backward compatibility
export { type GTMTool } from '@/lib/types/gtm-types'

interface ToolSelectionSectionProps {
  selectedTools: string[]
  onToggleTool: (toolName: string) => void
  hasOutputColumns?: boolean // Whether output columns are defined (kept for API compatibility)
}

export function ToolSelectionSection({
  selectedTools,
  onToggleTool,
  hasOutputColumns: _hasOutputColumns = false
}: ToolSelectionSectionProps) {
  const [showMoreTools, setShowMoreTools] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  // Sort tools alphabetically and filter by search
  const essentialTools = useMemo(() => {
    return searchTools(ESSENTIAL_GTM_TOOLS, searchQuery)
  }, [searchQuery])

  const allOtherTools = useMemo(() => {
    return searchTools(ALL_OTHER_TOOLS, searchQuery)
  }, [searchQuery])

  // Group tools by category for better organization
  const toolsByCategory = useMemo(() => {
    const grouped: Record<string, GTMTool[]> = {
      enrichment: [],
      generation: [],
      analysis: [],
    }
    
    allOtherTools.forEach(tool => {
      if (grouped[tool.category]) {
        grouped[tool.category].push(tool)
      }
    })
    
    return grouped
  }, [allOtherTools])

  const categoryLabels: Record<string, string> = {
    enrichment: 'Enrichment',
    generation: 'Generation',
    analysis: 'Analysis',
  }

  const categoryIcons: Record<string, string> = {
    enrichment: '🔍',
    generation: '✨',
    analysis: '📊',
  }

  // Auto-expand sections when searching
  const shouldShowMoreTools = showMoreTools || searchQuery.trim().length > 0

  // Helper to render tool badge (compact size matching output field chips)
  const renderToolBadge = (tool: GTMTool) => {
    const isSelected = selectedTools.includes(tool.name)

    return (
      <Tooltip key={tool.name}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onToggleTool(tool.name)}
            className={cn(
              "group relative inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? 'bg-secondary/60 border-border/50 text-foreground'
                : 'bg-background/60 border-border/50 text-muted-foreground hover:bg-background hover:border-border hover:text-foreground'
            )}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${tool.displayName} tool`}
          >
            {isSelected && (
              <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
            )}
            <span className="whitespace-nowrap font-mono">{tool.displayName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tool.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base flex-shrink-0" role="img" aria-hidden="true">🔧</span>
          <label className="text-sm font-medium text-foreground">AI Tools</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Learn about AI tools"
              >
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1.5 text-xs">
                <p className="font-medium">AI Tools</p>
                <p className="text-muted-foreground">
                  Select which AI tools the model can use during processing. These are built-in capabilities that enhance the AI&apos;s ability to research and analyze content.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          {selectedTools.length > 0 && (
            <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              {selectedTools.length} selected
            </span>
          )}
          {/* Search toggle button - Hidden for now */}
          {/* <button
            onClick={() => {
              setSearchOpen(!searchOpen)
              if (searchOpen) setSearchQuery('')
            }}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
            aria-label="Toggle search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button> */}
        </div>

        {/* SERP caching note when web-search is selected */}
        {selectedTools.includes('web-search') && (
          <div className="px-3 py-2 bg-muted/50 border border-border/30 rounded-lg text-xs text-muted-foreground">
            <p>
              <strong>Note:</strong> Web search results may be cached (typically 1-24 hours). For real-time data like exact current date, results may be slightly delayed.
            </p>
          </div>
        )}

        {/* Collapsible Search Box */}
        {searchOpen && (
          <div className="relative animate-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search tools... (⌘F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                  setSearchOpen(false)
                  e.currentTarget.blur()
                }
              }}
              autoFocus
              className="pl-8 pr-8 h-9 text-sm bg-secondary/70 border-border/50 focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Search AI tools"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded p-0.5"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* AI Tools (Always Visible) */}
        {essentialTools.length > 0 && (
          <div className="space-y-2">
            {searchQuery && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  ({essentialTools.length} found)
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {essentialTools.map(renderToolBadge)}
            </div>
          </div>
        )}

        {/* More Tools (Collapsible, starts collapsed) */}
        {allOtherTools.length > 0 && (
          <div className="space-y-2.5">
            <button
              onClick={() => setShowMoreTools(!showMoreTools)}
              className="flex items-center gap-2 w-full text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors py-1"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 flex-shrink-0 ${
                  shouldShowMoreTools ? 'rotate-180' : ''
                }`}
              />
              <span className="flex-1">
                More Tools ({searchQuery ? `${allOtherTools.length} found` : ALL_OTHER_TOOLS.length})
              </span>
            </button>

            {shouldShowMoreTools && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Group by category if not searching, otherwise show flat list */}
                {searchQuery.trim().length > 0 ? (
                  <div className="p-3 bg-muted/20 rounded-lg border border-border/40">
                    <div className="flex flex-wrap gap-2">
                      {allOtherTools.map(renderToolBadge)}
                    </div>
                  </div>
                ) : (
                  // Show categorized when not searching
                  Object.entries(toolsByCategory).map(([category, tools]) => {
                    if (tools.length === 0) return null
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          <span>{categoryIcons[category]}</span>
                          <span>{categoryLabels[category]} ({tools.length})</span>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg border border-border/40">
                          <div className="flex flex-wrap gap-2">
                            {tools.map(renderToolBadge)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* No results message */}
        {searchQuery && essentialTools.length === 0 && allOtherTools.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No tools found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

