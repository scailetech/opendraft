/**
 * Chart annotation utilities
 * Functions to find peaks, trends, and generate insights from chart data
 */

export interface ChartDataPoint {
  date: string
  input?: number
  output?: number
  value?: number
  batches?: number
  rows?: number
}

export interface PeakMarker {
  date: string
  value: number
  label: string
  type: 'peak' | 'trough'
}

export interface TrendLine {
  start: { date: string; value: number }
  end: { date: string; value: number }
  slope: number
  direction: 'up' | 'down' | 'flat'
}

/**
 * Find peak usage in chart data
 */
export function findPeakUsage(
  data: ChartDataPoint[],
  key: 'input' | 'output' | 'value' = 'value'
): PeakMarker | null {
  if (data.length === 0) return null

  let peak: PeakMarker | null = null

  for (const point of data) {
    const total = key === 'value' 
      ? (point.value || 0)
      : (point.input || 0) + (point.output || 0)

    if (!peak || total > peak.value) {
      peak = {
        date: point.date,
        value: total,
        label: `Peak: ${formatNumber(total)}`,
        type: 'peak',
      }
    }
  }

  // Only return peak if it's significantly higher than average
  if (peak) {
    const avg = data.reduce((sum, p) => {
      const total = key === 'value' 
        ? (p.value || 0)
        : (p.input || 0) + (p.output || 0)
      return sum + total
    }, 0) / data.length

    // Return peak if it's at least 20% higher than average, or if there's only one data point
    if (data.length === 1 || (avg > 0 && peak.value > avg * 1.2)) {
      return peak
    }
  }

  return null
}

/**
 * Calculate trend line from chart data
 */
export function calculateTrendLine(
  data: ChartDataPoint[],
  key: 'input' | 'output' | 'value' = 'value'
): TrendLine | null {
  if (data.length < 2) return null

  const values = data.map((point) => {
    if (key === 'value') return point.value || 0
    return (point.input || 0) + (point.output || 0)
  })

  const startValue = values[0]
  const endValue = values[values.length - 1]
  const startDate = data[0].date
  const endDate = data[data.length - 1].date

  const slope = (endValue - startValue) / (values.length - 1)
  const direction: 'up' | 'down' | 'flat' = 
    slope > 0.05 ? 'up' : slope < -0.05 ? 'down' : 'flat'

  return {
    start: { date: startDate, value: startValue },
    end: { date: endDate, value: endValue },
    slope,
    direction,
  }
}

/**
 * Detect significant changes in chart data
 */
export function detectSignificantChanges(
  data: ChartDataPoint[],
  key: 'input' | 'output' | 'value' = 'value',
  threshold: number = 0.2 // 20% change threshold
): Array<{ date: string; change: number; label: string }> {
  if (data.length < 2) return []

  const changes: Array<{ date: string; change: number; label: string }> = []

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1]
    const curr = data[i]

    const prevValue = key === 'value' 
      ? (prev.value || 0)
      : (prev.input || 0) + (prev.output || 0)
    const currValue = key === 'value'
      ? (curr.value || 0)
      : (curr.input || 0) + (curr.output || 0)

    if (prevValue === 0) continue

    const changePercent = ((currValue - prevValue) / prevValue) * 100
    const absChange = Math.abs(changePercent)

    if (absChange >= threshold * 100) {
      changes.push({
        date: curr.date,
        change: changePercent,
        label: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(0)}%`,
      })
    }
  }

  return changes
}

/**
 * Find average value in chart data
 */
export function calculateAverage(
  data: ChartDataPoint[],
  key: 'input' | 'output' | 'value' = 'value'
): number {
  if (data.length === 0) return 0

  const sum = data.reduce((acc, point) => {
    if (key === 'value') return acc + (point.value || 0)
    return acc + (point.input || 0) + (point.output || 0)
  }, 0)

  return sum / data.length
}

/**
 * Format number for display
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return Math.round(num).toString()
}

