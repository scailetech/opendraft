/**
 * Custom Tooltip component for Recharts
 * Replaces default tooltip to fix white background highlighting issue
 * Based on gtm-os-v2 implementation
 */

import React from 'react'

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number | string
    dataKey?: string
    color?: string
    formatter?: (value: number | string) => string
  }>
  label?: string
  formatter?: (value: number) => string
}

export const CustomTooltip = React.memo(function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div 
      className="border border-border rounded-md"
      style={{
        backgroundColor: 'hsl(var(--card))',
        background: 'hsl(var(--card))',
        margin: 0,
        padding: '10px 14px',
        minWidth: '140px',
        opacity: 1,
        zIndex: 1000,
      }}
    >
      {label && (
        <div className="text-xs font-semibold text-foreground mb-2 pb-1.5 border-b border-border/50">
          {label}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const value = entry.value
          const displayValue = formatter && typeof value === 'number' 
            ? formatter(value) 
            : typeof value === 'number' 
              ? value.toLocaleString() 
              : value

          return (
            <div key={index} className="flex items-center gap-2.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border"
                style={{ 
                  backgroundColor: entry.color || 'hsl(var(--primary))',
                  boxShadow: `0 0 0 1px ${entry.color || 'hsl(var(--primary))'}40`
                }}
              />
              <span className="text-muted-foreground/80 text-xs">{entry.name || entry.dataKey}:</span>
              <span className="text-foreground font-semibold ml-auto">{displayValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

