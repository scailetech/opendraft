/**
 * Convert date/time and recurrence options to cron expression
 */

import { format } from 'date-fns'

export type ScheduleType = 'once' | 'recurring'

export type RecurrenceUnit = 'day' | 'week' | 'month'

export interface ScheduleOptions {
  type: ScheduleType
  date: Date
  time: string // HH:mm format
  recurrenceUnit?: RecurrenceUnit
  recurrenceValue?: number // e.g., every 2 days, every 3 weeks
}

/**
 * Convert schedule options to cron expression
 */
export function scheduleToCron(options: ScheduleOptions): string {
  const { date, time, type, recurrenceUnit, recurrenceValue = 1 } = options
  
  // Parse time (HH:mm)
  const [hours, minutes] = time.split(':').map(Number)
  
  if (type === 'once') {
    // For one-time schedules, we'll create a cron that runs once
    // Format: minute hour day month weekday
    const day = date.getDate()
    const month = date.getMonth() + 1 // getMonth() is 0-indexed
    const weekday = date.getDay() // 0 = Sunday, 6 = Saturday
    
    return `${minutes} ${hours} ${day} ${month} ${weekday}`
  }
  
  // Recurring schedules
  if (recurrenceUnit === 'day') {
    // Every X days: */X * * * *
    if (recurrenceValue === 1) {
      return `${minutes} ${hours} * * *` // Daily
    }
    // For intervals > 1 day, we need to use day of month pattern
    // This is a simplification - true "every N days" requires more complex logic
    // For now, we'll use a pattern that works for common cases
    return `${minutes} ${hours} */${recurrenceValue} * *`
  }
  
  if (recurrenceUnit === 'week') {
    // Every X weeks on the same weekday
    const weekday = date.getDay()
    if (recurrenceValue === 1) {
      return `${minutes} ${hours} * * ${weekday}` // Weekly
    }
    // For multiple weeks, we'll use a pattern (simplified)
    // Note: true "every N weeks" requires more complex logic
    return `${minutes} ${hours} * * ${weekday}`
  }
  
  if (recurrenceUnit === 'month') {
    // Every X months on the same day
    const day = date.getDate()
    if (recurrenceValue === 1) {
      return `${minutes} ${hours} ${day} * *` // Monthly
    }
    // For multiple months, use day pattern (simplified)
    return `${minutes} ${hours} ${day} */${recurrenceValue} *`
  }
  
  // Default: daily
  return `${minutes} ${hours} * * *`
}

/**
 * Format schedule options for display
 */
export function formatSchedule(options: ScheduleOptions): string {
  const { type, date, time, recurrenceUnit, recurrenceValue = 1 } = options
  
  const dateStr = format(date, 'MMM d, yyyy')
  const timeStr = time
  
  if (type === 'once') {
    return `Once on ${dateStr} at ${timeStr}`
  }
  
  const unitStr = recurrenceUnit === 'day' ? 'day' : 
                  recurrenceUnit === 'week' ? 'week' : 'month'
  const plural = recurrenceValue > 1 ? 's' : ''
  
  return `Every ${recurrenceValue} ${unitStr}${plural} at ${timeStr}`
}


