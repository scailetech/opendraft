/**
 * Data Export Utilities
 * Functions for exporting analytics data as CSV or JSON
 */

import { format } from 'date-fns'

interface TokenStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  modelBreakdown: Record<string, { input: number; output: number; batches: number }>
}

interface AnalyticsData {
  tokenStats: TokenStats
  batchesByStatus: Record<string, number>
  recentActivity: Array<{
    date: string
    batches: number
    rows: number
    input?: number
    output?: number
  }>
  previousPeriod?: {
    tokenStats: TokenStats
    batchesByStatus: Record<string, number>
    totalBatches: number
  }
}

export interface ExportOptions {
  includeFilters?: boolean
  format?: 'csv' | 'json'
  filename?: string
}

/**
 * Convert array of arrays to CSV string
 */
function arrayToCSV(data: (string | number)[][]): string {
  return data.map(row => 
    row.map(cell => {
      const str = String(cell)
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  ).join('\n')
}

/**
 * Export analytics summary as CSV
 */
export function exportAnalyticsSummaryCSV(
  analytics: AnalyticsData,
  dateRange: string | { from: Date; to: Date },
  options: ExportOptions = {}
): void {
  const dateRangeStr = typeof dateRange === 'string' 
    ? (dateRange === 'all' ? 'All time' : `Last ${dateRange.replace('d', '')} days`)
    : `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`

  const csvData: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Total Tokens', analytics.tokenStats.totalTokens.toLocaleString()],
    ['Input Tokens', analytics.tokenStats.totalInputTokens.toLocaleString()],
    ['Output Tokens', analytics.tokenStats.totalOutputTokens.toLocaleString()],
    ['Date Range', dateRangeStr],
  ]

  // Add model breakdown
  if (Object.keys(analytics.tokenStats.modelBreakdown).length > 0) {
    csvData.push(['', ''])
    csvData.push(['Model Breakdown', ''])
    csvData.push(['Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Batches'])
    Object.entries(analytics.tokenStats.modelBreakdown)
      .filter(([, stats]) => (stats.input + stats.output) > 0)
      .forEach(([model, stats]) => {
        csvData.push([
          model,
          stats.input.toLocaleString(),
          stats.output.toLocaleString(),
          (stats.input + stats.output).toLocaleString(),
          stats.batches.toString(),
        ])
      })
  }

  // Add status breakdown
  if (Object.keys(analytics.batchesByStatus).length > 0) {
    csvData.push(['', ''])
    csvData.push(['Status Breakdown', ''])
    csvData.push(['Status', 'Count'])
    Object.entries(analytics.batchesByStatus).forEach(([status, count]) => {
      csvData.push([status, count.toString()])
    })
  }

  const csvContent = arrayToCSV(csvData)
  downloadFile(csvContent, options.filename || `analytics-summary-${getDateRangeFilename(dateRange)}.csv`, 'text/csv')
}

/**
 * Export analytics data as JSON
 */
export function exportAnalyticsJSON(
  analytics: AnalyticsData,
  dateRange: string | { from: Date; to: Date },
  filters: { model?: string | null; status?: string | null },
  options: ExportOptions = {}
): void {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      dateRange: typeof dateRange === 'string' 
        ? dateRange 
        : {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd'),
          },
      filters: options.includeFilters ? filters : undefined,
    },
    tokenStats: {
      totalTokens: analytics.tokenStats.totalTokens,
      totalInputTokens: analytics.tokenStats.totalInputTokens,
      totalOutputTokens: analytics.tokenStats.totalOutputTokens,
      modelBreakdown: analytics.tokenStats.modelBreakdown,
    },
    batchesByStatus: analytics.batchesByStatus,
    recentActivity: analytics.recentActivity.map(activity => ({
      date: activity.date,
      batches: activity.batches,
      rows: activity.rows,
      inputTokens: activity.input || 0,
      outputTokens: activity.output || 0,
    })),
    previousPeriod: analytics.previousPeriod ? {
      tokenStats: analytics.previousPeriod.tokenStats,
      batchesByStatus: analytics.previousPeriod.batchesByStatus,
      totalBatches: analytics.previousPeriod.totalBatches,
    } : undefined,
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  downloadFile(jsonContent, options.filename || `analytics-data-${getDateRangeFilename(dateRange)}.json`, 'application/json')
}

/**
 * Export token activity data as CSV
 */
export function exportTokenActivityCSV(
  activityData: Array<{ date: string; input?: number; output?: number; batches?: number; rows?: number }>,
  options: ExportOptions = {}
): void {
  const csvData: (string | number)[][] = [
    ['Date', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Batches', 'Rows'],
    ...activityData.map(d => [
      d.date,
      (d.input || 0).toLocaleString(),
      (d.output || 0).toLocaleString(),
      ((d.input || 0) + (d.output || 0)).toLocaleString(),
      (d.batches || 0).toString(),
      (d.rows || 0).toLocaleString(),
    ]),
  ]

  const csvContent = arrayToCSV(csvData)
  downloadFile(csvContent, options.filename || `token-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv')
}

/**
 * Export chart data as CSV
 */
export function exportChartDataCSV(
  chartData: Array<Record<string, string | number>>,
  chartName: string,
  options: ExportOptions = {}
): void {
  if (chartData.length === 0) {
    throw new Error('No data to export')
  }

  const headers = Object.keys(chartData[0])
  const csvData: (string | number)[][] = [
    headers,
    ...chartData.map(row => headers.map(header => row[header] || '')),
  ]

  const csvContent = arrayToCSV(csvData)
  const filename = options.filename || `${chartName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`
  downloadFile(csvContent, filename, 'text/csv')
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get date range string for filename
 */
function getDateRangeFilename(dateRange: string | { from: Date; to: Date }): string {
  if (typeof dateRange === 'string') {
    return dateRange === 'all' ? 'all-time' : dateRange
  }
  return `${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}`
}

/**
 * Copy data to clipboard as CSV
 */
export async function copyToClipboardCSV(data: (string | number)[][]): Promise<void> {
  const csvContent = arrayToCSV(data)
  await navigator.clipboard.writeText(csvContent)
}

/**
 * Copy data to clipboard as JSON
 */
export async function copyToClipboardJSON(data: unknown): Promise<void> {
  const jsonContent = JSON.stringify(data, null, 2)
  await navigator.clipboard.writeText(jsonContent)
}

