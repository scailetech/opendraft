/**
 * ABOUTME: Utility for persisting CSV files to IndexedDB
 * ABOUTME: Allows restoring uploaded CSV files when user returns to /bulk page
 */

const DB_NAME = 'bulk-gpt-storage'
const DB_VERSION = 1
const STORE_NAME = 'csv-files'

interface StoredCSV {
  filename: string
  content: string
  lastModified: number
  size: number
  timestamp: number
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'filename' })
      }
    }
  })
}

/**
 * Save CSV file to IndexedDB
 */
export async function saveCSVFile(file: File): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return // SSR or IndexedDB not available
  }

  try {
    const content = await file.text()
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const stored: StoredCSV = {
      filename: file.name,
      content,
      lastModified: file.lastModified,
      size: file.size,
      timestamp: Date.now(),
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(stored)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    db.close()
  } catch (error) {
    console.debug('Failed to save CSV file to IndexedDB:', error)
    // Silent failure - don't break the app
  }
}

/**
 * Restore CSV file from IndexedDB
 * Returns a File object if found, null otherwise
 */
export async function restoreCSVFile(filename?: string): Promise<File | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null
  }

  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    // If filename provided, get specific file, otherwise get most recent
    if (filename) {
      const stored = await new Promise<StoredCSV | undefined>((resolve, reject) => {
        const request = store.get(filename)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      db.close()

      if (!stored) return null

      // Recreate File object from stored content
      const blob = new Blob([stored.content], { type: 'text/csv' })
      return new File([blob], stored.filename, {
        lastModified: stored.lastModified,
        type: 'text/csv',
      })
    } else {
      // Get most recent file
      const stored = await new Promise<StoredCSV | undefined>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          const files = request.result as StoredCSV[]
          if (files.length === 0) {
            resolve(undefined)
            return
          }
          // Sort by timestamp descending, get most recent
          const mostRecent = files.sort((a, b) => b.timestamp - a.timestamp)[0]
          resolve(mostRecent)
        }
        request.onerror = () => reject(request.error)
      })

      db.close()

      if (!stored) return null

      // Recreate File object from stored content
      const blob = new Blob([stored.content], { type: 'text/csv' })
      return new File([blob], stored.filename, {
        lastModified: stored.lastModified,
        type: 'text/csv',
      })
    }
  } catch (error) {
    console.debug('Failed to restore CSV file from IndexedDB:', error)
    return null
  }
}

/**
 * Clear stored CSV file from IndexedDB
 */
export async function clearCSVFile(filename?: string): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return
  }

  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    if (filename) {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(filename)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } else {
      // Clear all files
      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }

    db.close()
  } catch (error) {
    console.debug('Failed to clear CSV file from IndexedDB:', error)
  }
}

