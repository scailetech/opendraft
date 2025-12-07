/**
 * ProgressTracker - Tracks and calculates progress metrics
 */
export interface ProgressUpdate {
  processed: number
  total: number
  elapsedMs: number
}

export interface ProgressStats {
  percent: number
  remaining: number
  eta: number
}

export class ProgressTracker {
  private processed = 0
  private total = 0
  private elapsedMs = 0

  update(progress: ProgressUpdate): void {
    this.processed = progress.processed
    this.total = progress.total
    this.elapsedMs = progress.elapsedMs
  }

  getProgress(): number {
    if (this.total === 0) return 0
    return (this.processed / this.total) * 100
  }

  getRemaining(): number {
    return Math.max(0, this.total - this.processed)
  }

  getETA(): number {
    if (this.processed === 0 || this.elapsedMs === 0) return 0

    // Average time per item
    const avgTimePerItem = this.elapsedMs / this.processed
    const remaining = this.getRemaining()

    // ETA = (remaining items) * (avg time per item)
    return Math.ceil(remaining * avgTimePerItem)
  }

  getStats(): ProgressStats {
    return {
      percent: this.getProgress(),
      remaining: this.getRemaining(),
      eta: this.getETA(),
    }
  }

  getElapsedTime(): number {
    return this.elapsedMs
  }

  getProcessed(): number {
    return this.processed
  }

  getTotal(): number {
    return this.total
  }
}






