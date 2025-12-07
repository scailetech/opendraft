/**
 * Announcement Utilities
 * 
 * Helper functions for announcing dynamic content changes to screen readers.
 */

/**
 * Announce a message to screen readers (polite)
 */
export function announce(message: string) {
  const liveRegion = document.getElementById('live-region')
  if (liveRegion) {
    liveRegion.textContent = ''
    // Use setTimeout to ensure the textContent change is detected
    setTimeout(() => {
      liveRegion.textContent = message
    }, 100)
  }
}

/**
 * Announce an urgent message to screen readers (assertive)
 */
export function announceUrgent(message: string) {
  const liveRegion = document.getElementById('live-region-assertive')
  if (liveRegion) {
    liveRegion.textContent = ''
    setTimeout(() => {
      liveRegion.textContent = message
    }, 100)
  }
}

/**
 * Clear announcements
 */
export function clearAnnouncements() {
  const liveRegion = document.getElementById('live-region')
  const liveRegionAssertive = document.getElementById('live-region-assertive')
  if (liveRegion) liveRegion.textContent = ''
  if (liveRegionAssertive) liveRegionAssertive.textContent = ''
}

