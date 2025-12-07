/**
 * Keyboard Shortcuts Utilities
 * 
 * Utilities for handling and displaying keyboard shortcuts.
 * Helps make keyboard shortcuts discoverable.
 */

export interface KeyboardShortcut {
  /** Display name for the action */
  action: string
  /** Keyboard shortcut keys */
  keys: string[]
  /** Description of what the shortcut does */
  description?: string
  /** Category for grouping */
  category?: string
}

/**
 * Formats keyboard shortcut for display
 * @param keys Array of keys (e.g., ['Meta', 'K'])
 * @returns Formatted string (e.g., "⌘K" on Mac, "Ctrl+K" on Windows)
 */
export function formatKeyboardShortcut(keys: string[]): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
  
  return keys.map(key => {
    if (key === 'Meta' || key === 'Cmd') {
      return isMac ? '⌘' : 'Ctrl'
    }
    if (key === 'Alt') {
      return isMac ? '⌥' : 'Alt'
    }
    if (key === 'Shift') {
      return isMac ? '⇧' : 'Shift'
    }
    if (key === 'Control' || key === 'Ctrl') {
      return 'Ctrl'
    }
    return key
  }).join(isMac ? '' : '+')
}

/**
 * Gets keyboard event key combination
 * @param event Keyboard event
 * @returns Array of pressed keys
 */
export function getKeyboardShortcut(event: KeyboardEvent): string[] {
  const keys: string[] = []
  
  if (event.metaKey) keys.push('Meta')
  if (event.ctrlKey) keys.push('Control')
  if (event.altKey) keys.push('Alt')
  if (event.shiftKey) keys.push('Shift')
  
  // Don't include modifier keys as the main key
  if (event.key && !['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) {
    keys.push(event.key)
  }
  
  return keys
}

/**
 * Checks if keyboard shortcut matches
 * @param event Keyboard event
 * @param shortcut Expected shortcut keys
 * @returns True if shortcut matches
 */
export function matchesKeyboardShortcut(
  event: KeyboardEvent,
  shortcut: string[]
): boolean {
  const pressed = getKeyboardShortcut(event)
  
  if (pressed.length !== shortcut.length) {
    return false
  }
  
  // Normalize keys for comparison
  const normalize = (key: string) => {
    if (key === 'Meta' || key === 'Cmd') return 'Meta'
    if (key === 'Control' || key === 'Ctrl') return 'Control'
    return key
  }
  
  const normalizedPressed = pressed.map(normalize).sort()
  const normalizedShortcut = shortcut.map(normalize).sort()
  
  return JSON.stringify(normalizedPressed) === JSON.stringify(normalizedShortcut)
}

/**
 * Common keyboard shortcuts for the application
 */
export const COMMON_SHORTCUTS: KeyboardShortcut[] = [
  {
    action: 'Search',
    keys: ['Meta', 'K'],
    description: 'Focus search input',
    category: 'Navigation',
  },
  {
    action: 'Refresh',
    keys: ['Meta', 'R'],
    description: 'Refresh current page',
    category: 'Data Operations',
  },
  {
    action: 'Export CSV',
    keys: ['Meta', 'Shift', 'C'],
    description: 'Export data as CSV',
    category: 'Export',
  },
  {
    action: 'Export PDF',
    keys: ['Meta', 'E'],
    description: 'Export dashboard as PDF',
    category: 'Export',
  },
  {
    action: 'Clear Search',
    keys: ['Escape'],
    description: 'Clear search input',
    category: 'Navigation',
  },
  {
    action: 'Run Batch',
    keys: ['Meta', 'Enter'],
    description: 'Run batch processing',
    category: 'Actions',
  },
]

