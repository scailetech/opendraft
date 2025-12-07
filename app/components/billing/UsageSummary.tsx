/**
 * Usage Summary Component
 * Shows current period usage, credits, and cost breakdown
 */

'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Zap } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { UsageSummary as UsageSummaryType, CreditInfo } from '@/lib/types/billing'

export function UsageSummary() {
  const [summary, setSummary] = useState<UsageSummaryType | null>(null)
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/billing/usage')
      if (!response.ok) throw new Error('Failed to fetch usage')
      
      const data = await response.json()
      setSummary(data)
      setCreditInfo(data.credit_info)
    } catch (error) {
      console.error('Error fetching usage:', error)
      toast.error('Failed to load usage summary')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
        <div className="h-64 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  if (!summary) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No usage data"
        description="Usage will appear here once you start using agents"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Usage & Credits</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Current billing period: {new Date(summary.period_start).toLocaleDateString()} - {new Date(summary.period_end).toLocaleDateString()}
        </p>
      </div>

      {/* Credit Info (for agency clients) */}
      {creditInfo && (
        <div className="border border-border rounded-lg p-4 bg-secondary/20 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Self-Service Credits
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Included</p>
              <p className="text-lg font-semibold">${creditInfo.included_credits.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Used</p>
              <p className="text-lg font-semibold">${creditInfo.used_credits.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-lg font-semibold text-green-600">
                ${creditInfo.remaining_credits.toFixed(2)}
              </p>
            </div>
            {creditInfo.overage_amount > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Overage</p>
                <p className="text-lg font-semibold text-red-600">
                  ${creditInfo.overage_amount.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          {creditInfo.rolled_over_credits > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Rolled over from previous month: ${creditInfo.rolled_over_credits.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4 bg-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Total Tokens</p>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{summary.total_tokens.toLocaleString()}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">API Cost</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">${summary.total_api_cost.toFixed(4)}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Billing Amount</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">${summary.total_billing_amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Usage by Agent */}
      {Object.keys(summary.usage_by_agent).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Usage by Agent</h3>
          <div className="border border-border rounded-lg divide-y divide-border">
            {Object.entries(summary.usage_by_agent).map(([agentId, usage]) => (
              <div key={agentId} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{agentId}</p>
                  <p className="text-xs text-muted-foreground">
                    {usage.tokens.toLocaleString()} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${usage.billing_amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    ${usage.api_cost.toFixed(4)} API cost
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage by Model */}
      {Object.keys(summary.usage_by_model).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Usage by Model</h3>
          <div className="border border-border rounded-lg divide-y divide-border">
            {Object.entries(summary.usage_by_model).map(([model, usage]) => (
              <div key={model} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{model}</p>
                  <p className="text-xs text-muted-foreground">
                    {usage.tokens.toLocaleString()} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${usage.billing_amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    ${usage.api_cost.toFixed(4)} API cost
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

