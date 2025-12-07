/**
 * Full-screen chart modal for detailed chart views
 * Provides larger, interactive chart views with export and filtering options
 */

'use client'

import { X, Download } from 'lucide-react'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { exportSVGAsPNG, findChartSVG } from '@/lib/utils/chart-export'
import { toast } from 'sonner'

interface ChartModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: ReactNode
  chartRef?: React.RefObject<HTMLDivElement>
  dateRange?: string
}

export function ChartModal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  chartRef,
  dateRange = '30d',
}: ChartModalProps) {
  if (!isOpen) return null

  const handleExport = async () => {
    if (!chartRef?.current) {
      toast.error('Chart not found')
      return
    }

    try {
      const svg = findChartSVG(chartRef.current)
      if (svg) {
        await exportSVGAsPNG(
          svg,
          `${title.toLowerCase().replace(/\s+/g, '-')}-${dateRange}-${new Date().toISOString().split('T')[0]}`
        )
        toast.success('Chart exported successfully', {
          description: `Downloaded ${title}.png`,
        })
      } else {
        toast.error('Could not find chart to export')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export chart', {
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      tabIndex={-1}
    >
      <div
        className="bg-secondary border border-border rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden sm:h-[85vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <h2 id="chart-modal-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="h-8 px-3 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm p-1"
              aria-label={`Close ${title}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={chartRef} className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

