/**
 * Cron expression utilities using cron-parser
 */

import { CronExpressionParser } from 'cron-parser'
import { formatInTimeZone } from 'date-fns-tz'

/**
 * Validates a cron expression
 */
export function validateCronExpression(cronExpr: string): { valid: boolean; error?: string } {
  try {
    CronExpressionParser.parse(cronExpr)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression',
    }
  }
}

/**
 * Calculates the next run time from a cron expression
 * @param cronExpr Cron expression (e.g., "0 9 * * *")
 * @param timezone Timezone (e.g., "America/New_York")
 * @param fromDate Optional start date (defaults to now)
 * @returns Next run time as ISO string
 */
export function calculateNextRun(
  cronExpr: string,
  timezone: string = 'UTC',
  fromDate?: Date
): string {
  try {
    const startDate = fromDate || new Date()
    
    // Parse cron expression
    const interval = CronExpressionParser.parse(cronExpr, {
      tz: timezone,
      currentDate: startDate,
    })
    
    const nextDate = interval.next().toDate()
    return nextDate.toISOString()
  } catch (error) {
    throw new Error(`Failed to calculate next run: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculates multiple next run times
 * @param cronExpr Cron expression
 * @param timezone Timezone
 * @param count Number of runs to calculate
 * @returns Array of ISO date strings
 */
export function calculateNextRuns(
  cronExpr: string,
  timezone: string = 'UTC',
  count: number = 5
): string[] {
  try {
    const runs: string[] = []
    const interval = CronExpressionParser.parse(cronExpr, {
      tz: timezone,
      currentDate: new Date(),
    })
    
    for (let i = 0; i < count; i++) {
      const nextDate = interval.next().toDate()
      runs.push(nextDate.toISOString())
    }
    
    return runs
  } catch (error) {
    throw new Error(`Failed to calculate next runs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Formats a cron expression into human-readable text
 * @param cronExpr Cron expression
 * @param timezone Timezone
 * @returns Human-readable description
 */
export function formatCronExpression(cronExpr: string): string {
  try {
    const parts = cronExpr.split(' ')
    if (parts.length !== 5) {
      return cronExpr
    }
    
    const [minute, hour, dayOfMonth, , dayOfWeek] = parts
    
    // Common patterns
    if (cronExpr === '0 0 * * *') {
      return 'Daily at midnight'
    }
    if (cronExpr === '0 9 * * *') {
      return 'Daily at 9:00 AM'
    }
    if (cronExpr === '0 9 * * 1') {
      return 'Every Monday at 9:00 AM'
    }
    if (cronExpr === '0 0 1 * *') {
      return 'Monthly on the 1st at midnight'
    }
    if (cronExpr === '*/15 * * * *') {
      return 'Every 15 minutes'
    }
    if (cronExpr === '*/30 * * * *') {
      return 'Every 30 minutes'
    }
    if (cronExpr === '0 */1 * * *') {
      return 'Every hour'
    }
    
    // Generic description
    let description = ''
    if (minute !== '*' && hour !== '*') {
      const hourNum = parseInt(hour)
      const minuteNum = parseInt(minute)
      const ampm = hourNum >= 12 ? 'PM' : 'AM'
      const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
      description = `At ${displayHour}:${minuteNum.toString().padStart(2, '0')} ${ampm}`
    } else if (minute === '*' && hour !== '*') {
      description = `Every minute at hour ${hour}`
    } else if (minute !== '*' && hour === '*') {
      description = `At minute ${minute} of every hour`
    }
    
    if (dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayIndex = parseInt(dayOfWeek)
      if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
        description += ` on ${days[dayIndex]}`
      }
    }
    
    if (dayOfMonth !== '*') {
      description += ` on day ${dayOfMonth} of the month`
    }
    
    return description || cronExpr
  } catch {
    return cronExpr
  }
}

/**
 * Formats a date in the given timezone
 */
export function formatDateInTimezone(date: Date | string, timezone: string, format: string = 'PPp'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    // Use date-fns formatInTimeZone with a simple format string
    // PPp = Date + Time (e.g., "Apr 29, 2023, 9:00 AM")
    return formatInTimeZone(dateObj, timezone, format)
  } catch {
    // Fallback to ISO string if formatting fails
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString('en-US', { timeZone: timezone })
  }
}

