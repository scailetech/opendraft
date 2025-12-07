/**
 * ABOUTME: Token usage summary component - shows total input/output tokens and estimated cost
 * ABOUTME: Used in ResultsTable footer to display aggregated token metrics from Gemini API
 */

import { Zap } from 'lucide-react'

interface TokenSummaryProps {
  totalInputTokens: number
  totalOutputTokens: number
}

// Gemini 2.5 Flash pricing (as of 2025)
const COST_PER_1M_INPUT_TOKENS = 0.075  // $0.075 per 1M input tokens
const COST_PER_1M_OUTPUT_TOKENS = 0.30  // $0.30 per 1M output tokens

export function TokenSummary({ totalInputTokens, totalOutputTokens }: TokenSummaryProps) {
  const totalTokens = totalInputTokens + totalOutputTokens

  // Calculate cost in dollars
  const inputCost = (totalInputTokens / 1_000_000) * COST_PER_1M_INPUT_TOKENS
  const outputCost = (totalOutputTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS
  const totalCost = inputCost + outputCost

  // Format numbers with commas
  const formatNumber = (num: number) => num.toLocaleString('en-US')

  // Format cost (show at least 4 decimal places for small amounts)
  const formatCost = (cost: number) => {
    if (cost < 0.0001) return '$0.0000'
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    if (cost < 1) return `$${cost.toFixed(3)}`
    return `$${cost.toFixed(2)}`
  }

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-secondary/50 border-t border-border text-xs">
      <div className="flex items-center gap-2 text-primary">
        <Zap className="h-4 w-4" aria-hidden="true" />
        <span className="font-medium">Token Usage</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Input:</span>
        <span className="font-mono text-foreground">{formatNumber(totalInputTokens)}</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Output:</span>
        <span className="font-mono text-foreground">{formatNumber(totalOutputTokens)}</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-mono text-foreground">{formatNumber(totalTokens)}</span>
      </div>

      <div className="h-3 w-px bg-accent" />

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Est. Cost:</span>
        <span className="font-mono text-green-400">{formatCost(totalCost)}</span>
      </div>
    </div>
  )
}
