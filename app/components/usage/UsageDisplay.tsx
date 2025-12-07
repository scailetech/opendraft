/**
 * ABOUTME: Displays user's current usage stats and limits
 * ABOUTME: Shows daily/monthly progress bars, plan information, tokens by model, and tool usage
 */

'use client'

import { Activity, TrendingUp, Calendar, Cpu, Wrench, Zap } from 'lucide-react'
import { useUsageStats } from '@/hooks/useUsageStats'

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return tokens.toString()
}

export function UsageDisplay() {
  const { usage, isLoading, error } = useUsageStats()

  function getPercentage(current: number, limit: number) {
    return Math.min(100, (current / limit) * 100)
  }

  function getProgressColor(percentage: number) {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-primary'
  }

  // Show error only if there's an actual error and we're not loading
  if (error && !isLoading) {
    return (
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-xs font-medium text-red-400 mb-1">Failed to load usage statistics</p>
        <p className="text-xs text-red-400/80">
          {error instanceof Error ? error.message : 'Unable to fetch usage data. Please try refreshing the page.'}
        </p>
      </div>
    )
  }

  // Show loading state - compact and quick shimmer
  if (isLoading || !usage) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Plan badge skeleton */}
        <div className="pb-2 border-b border-border">
          <div className="h-3 w-32 bg-secondary/60 rounded animate-shimmer" />
        </div>
        
        {/* Progress bars skeleton */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-secondary/60 rounded animate-shimmer" />
              <div className="h-3 w-16 bg-secondary/60 rounded animate-shimmer" />
            </div>
            <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-primary/30 rounded-full animate-shimmer" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-secondary/60 rounded animate-shimmer" />
              <div className="h-3 w-20 bg-secondary/60 rounded animate-shimmer" />
            </div>
            <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-primary/30 rounded-full animate-shimmer" />
            </div>
          </div>
        </div>
        
        {/* Monthly stats skeleton */}
        <div className="border border-border/50 rounded-lg p-3 bg-secondary/20">
          <div className="h-3 w-20 bg-secondary/60 rounded animate-shimmer mb-2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="h-4 w-12 bg-secondary/60 rounded animate-shimmer" />
              <div className="h-2.5 w-14 bg-secondary/40 rounded animate-shimmer" />
            </div>
            <div className="space-y-1">
              <div className="h-4 w-16 bg-secondary/60 rounded animate-shimmer" />
              <div className="h-2.5 w-10 bg-secondary/40 rounded animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const batchPercentage = getPercentage(usage.batchesToday, usage.dailyBatchLimit)
  const rowPercentage = getPercentage(usage.rowsToday, usage.dailyRowLimit)

  return (
      <div className="space-y-4 animate-fade-in">
        {/* Plan Badge */}
        <div className="pb-2 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Current plan: <span className="capitalize text-primary font-medium">{usage.planType}</span>
          </p>
        </div>

        {/* Daily Limits */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Batches Today</span>
              </div>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {usage.batchesToday.toLocaleString()} / {usage.dailyBatchLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor(batchPercentage)}`}
                style={{ width: `${Math.max(batchPercentage, 0.5)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Rows Today</span>
              </div>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {usage.rowsToday.toLocaleString()} / {usage.dailyRowLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor(rowPercentage)}`}
                style={{ width: `${Math.max(rowPercentage, 0.5)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="border border-border rounded-lg p-3 bg-secondary/30">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">This Month</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {usage.batchesThisMonth.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Batches</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {usage.rowsThisMonth.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Rows</div>
            </div>
          </div>
        </div>

        {/* Token Usage */}
        <div className="border border-border rounded-lg p-3 bg-secondary/30">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Token Usage</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {formatTokens(usage.totalInputTokens || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Input tokens</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {formatTokens(usage.totalOutputTokens || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Output tokens</div>
            </div>
          </div>
          
          {/* Token breakdown by model */}
          {usage.tokensByModel && usage.tokensByModel.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By Model</span>
              </div>
              <div className="space-y-1.5">
                {usage.tokensByModel.slice(0, 5).map((item) => (
                  <div key={item.model} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[120px] font-mono text-xs">
                      {item.model}
                    </span>
                    <span className="text-foreground tabular-nums">
                      {formatTokens(item.inputTokens)} ↑ / {formatTokens(item.outputTokens)} ↓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tool Usage */}
        {usage.toolUsage && usage.toolUsage.length > 0 && (
          <div className="border border-border rounded-lg p-3 bg-secondary/30">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Wrench className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Tool Calls</span>
            </div>
            <div className="space-y-1.5">
              {usage.toolUsage.slice(0, 5).map((item) => (
                <div key={item.tool} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {item.tool.replace(/_/g, ' ')}
                  </span>
                  <span className="text-foreground tabular-nums font-medium">
                    {item.callCount.toLocaleString()} calls
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All-time Stats */}
        <div className="pt-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>All-time: <span className="font-medium tabular-nums">{usage.totalBatches.toLocaleString()}</span> batches</span>
          <span><span className="font-medium tabular-nums">{usage.totalRows.toLocaleString()}</span> rows processed</span>
        </div>
      </div>
  )
}
