/**
 * Component Showcase
 * 
 * Demo page showcasing all UX improvement components.
 * Useful for testing, documentation, and stakeholder review.
 */

'use client'

import React, { useState } from 'react'
import { DisabledButtonTooltip, useDisabledButtonReason } from '@/components/ui/disabled-button-tooltip'
import { TruncatedText } from '@/components/ui/truncated-text'
import { AccessibleStatusBadge } from '@/components/ui/accessible-status-badge'
import { ExpandableCell } from '@/components/ui/expandable-cell'
import { FailedRowDetails } from '@/components/ui/failed-row-details'
import { ErrorDisplay } from '@/components/ui/error-display'
import { TableColumnToggle } from '@/components/ui/table-column-toggle'
import { MobileOptimizedButton } from '@/components/ui/mobile-optimized-button'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { formatProgress, formatProgressWithCount } from '@/lib/utils/progress-calculator'
import { useResponsive } from '@/hooks/useResponsive'
import { Button } from '@/components/ui/button'
// Card components - using divs if Card component doesn't exist
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Simple Card components with proper styling
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pb-4 border-b border-gray-100 dark:border-gray-800 ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h3>
)
const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}>{children}</p>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-4 ${className}`}>{children}</div>
)

export function ComponentShowcase() {
  const { isMobile, isTablet } = useResponsive()
  const [visibleColumns, setVisibleColumns] = useState(['filename', 'status', 'rows'])
  
  // Demo data
  const longFilename = 'very-long-filename-that-will-be-truncated-in-the-table-display.csv'
  const batches = [
    { id: '1', filename: longFilename, status: 'completed' as const, rows: 100 },
    { id: '2', filename: 'short.csv', status: 'failed' as const, rows: 50 },
    { id: '3', filename: 'medium-length-filename.csv', status: 'processing' as const, rows: 75 },
  ]
  
  const columns = [
    { key: 'filename', label: 'Filename', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'rows', label: 'Rows', defaultVisible: true },
    { key: 'created', label: 'Created', defaultVisible: false },
  ]
  
  // Disabled button demo
  const reason = useDisabledButtonReason({
    hasCSV: false,
    hasPrompt: true,
    hasOutputColumn: false,
  })
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">UX Components Showcase</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Responsive: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
          </p>
        </div>
        
        <div className="space-y-6">

      {/* Disabled Button Tooltip */}
      <Card>
        <CardHeader>
          <CardTitle>1. Disabled Button Tooltip (P0)</CardTitle>
          <CardDescription>
            Explains why buttons are disabled with helpful tooltips
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DisabledButtonTooltip
            reason={reason?.reason || 'Ready to run'}
            details={reason?.details}
            requirements={reason?.requirements}
          >
            <Button disabled>Run All</Button>
          </DisabledButtonTooltip>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hover over the disabled button to see the tooltip explaining why it&apos;s disabled.
          </p>
        </CardContent>
      </Card>

      {/* Truncated Text */}
      <Card>
        <CardHeader>
          <CardTitle>2. Truncated Text (P2)</CardTitle>
          <CardDescription>
            Long text with tooltip showing full content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm mb-2">Long filename:</p>
            <TruncatedText 
              text={longFilename} 
              maxLength={30}
              className="text-sm"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hover over the truncated text to see the full filename.
          </p>
        </CardContent>
      </Card>

      {/* Accessible Status Badge */}
      <Card>
        <CardHeader>
          <CardTitle>3. Accessible Status Badge (P2)</CardTitle>
          <CardDescription>
            Status badges with icons and text (not just color)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AccessibleStatusBadge status="pending" />
            <AccessibleStatusBadge status="processing" />
            <AccessibleStatusBadge status="completed" />
            <AccessibleStatusBadge status="completed_with_errors" />
            <AccessibleStatusBadge status="failed" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All status badges include icons and text for accessibility.
          </p>
        </CardContent>
      </Card>

      {/* Progress Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>4. Progress Calculator (P1)</CardTitle>
          <CardDescription>
            Accurate progress formatting (fixes &quot;100.0%&quot; when incomplete)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <span className="font-medium">Before:</span> 4/5 (100.0%)
            </div>
            <div>
              <span className="font-medium">After:</span> {formatProgressWithCount(4, 5)}
            </div>
            <div>
              <span className="font-medium">Percentage only:</span> {formatProgress(4, 5)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expandable Cell */}
      <Card>
        <CardHeader>
          <CardTitle>5. Expandable Cell (P2)</CardTitle>
          <CardDescription>
            Table cells with expand/collapse for long text
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-4">
            <ExpandableCell 
              content="This is a very long text that will be truncated and can be expanded to show the full content. Click 'Show more' to expand it."
              maxLength={50}
            />
          </div>
        </CardContent>
      </Card>

      {/* Failed Row Details */}
      <Card>
        <CardHeader>
          <CardTitle>6. Failed Row Details (P2)</CardTitle>
          <CardDescription>
            Error details with retry option for failed rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FailedRowDetails
            errorMessage="Failed to process row: API rate limit exceeded"
            rowIndex={2}
            onRetry={() => alert('Retry clicked!')}
            errorDetails={{
              model: 'gpt-4',
              timestamp: new Date().toISOString(),
              code: 'RATE_LIMIT',
            }}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      <Card>
        <CardHeader>
          <CardTitle>7. Error Display (P2)</CardTitle>
          <CardDescription>
            Consistent error messaging with retry functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Banner Variant:</h4>
            <ErrorDisplay
              message="Failed to load data"
              onRetry={() => {}}
              variant="banner"
              details="Please check your connection and try again."
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Card Variant:</h4>
            <ErrorDisplay
              message="Something went wrong"
              variant="card"
              onDismiss={() => {}}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Column Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>8. Table Column Toggle (P1)</CardTitle>
          <CardDescription>
            Show/hide table columns to reduce information density
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableColumnToggle
            columns={columns}
            onVisibilityChange={(visible) => {
              setVisibleColumns(visible)
            }}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click the button above to toggle column visibility. Currently showing: {visibleColumns.join(', ')}
          </p>
        </CardContent>
      </Card>

      {/* Mobile Optimized Button */}
      <Card>
        <CardHeader>
          <CardTitle>9. Mobile Optimized Button (P1)</CardTitle>
          <CardDescription>
            Touch-friendly buttons with appropriate sizing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <MobileOptimizedButton variant="default">
              Primary Action
            </MobileOptimizedButton>
            <MobileOptimizedButton variant="outline">
              Secondary Action
            </MobileOptimizedButton>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Buttons automatically adjust size based on device type. On mobile, minimum touch target is 44x44px.
          </p>
        </CardContent>
      </Card>

      {/* Keyboard Shortcut Hint */}
      <Card>
        <CardHeader>
          <CardTitle>10. Keyboard Shortcut Hint (P2)</CardTitle>
          <CardDescription>
            Makes keyboard shortcuts discoverable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button>
              Search
              <KeyboardShortcutHint keys={['Meta', 'K']} />
            </Button>
            <Button>
              Refresh
              <KeyboardShortcutHint keys={['Meta', 'R']} />
            </Button>
            <Button>
              Export
              <KeyboardShortcutHint keys={['Meta', 'E']} />
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Keyboard shortcuts are now visible next to actions, making them discoverable.
          </p>
        </CardContent>
      </Card>

      {/* Complete Table Example */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Table Example</CardTitle>
          <CardDescription>
            All components working together in a table
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Filename</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Rows</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                      <TruncatedText text={batch.filename} maxLength={20} />
                    </td>
                    <td className="p-3">
                      <AccessibleStatusBadge status={batch.status} size="sm" />
                    </td>
                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{batch.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}

