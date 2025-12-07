/**
 * Hook for auto-refreshing resources when batches complete
 * Polls for new resources created from batches
 */

import { useEffect, useRef } from 'react'

interface UseResourceRefreshOptions {
  enabled?: boolean
  pollInterval?: number // milliseconds
  onNewResources?: (count: number) => void
  lastResourceTimestamp?: string | null
}

export function useResourceRefresh({
  enabled = true,
  pollInterval = 10000, // 10 seconds default
  onNewResources,
  lastResourceTimestamp,
}: UseResourceRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onNewResourcesRef = useRef(onNewResources)
  const lastTimestampRef = useRef<string | null>(lastResourceTimestamp || null)

  // Keep callback ref up to date
  useEffect(() => {
    onNewResourcesRef.current = onNewResources
  }, [onNewResources])

  // Update timestamp ref
  useEffect(() => {
    lastTimestampRef.current = lastResourceTimestamp || null
  }, [lastResourceTimestamp])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const checkForNewResources = async () => {
      try {
        // Check if there are resources created after our last known timestamp
        const response = await fetch('/api/resources?limit=1&sort=created_at:desc')
        if (response.ok) {
          const data = await response.json()
          const latestResource = data.resources?.[0]
          
          if (latestResource && latestResource.created_at) {
            const latestTimestamp = latestResource.created_at
            
            // If we have a previous timestamp and this is newer, notify
            if (lastTimestampRef.current && latestTimestamp > lastTimestampRef.current) {
              // Count new resources (simplified - just notify that there are new ones)
              if (onNewResourcesRef.current) {
                onNewResourcesRef.current(1) // Simplified - could count actual new resources
              }
            }
            
            lastTimestampRef.current = latestTimestamp
          }
        }
      } catch (error) {
        console.error('Error checking for new resources:', error)
      }
    }

    // Check immediately
    checkForNewResources()

    // Set up polling
    intervalRef.current = setInterval(() => {
      checkForNewResources()
    }, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, pollInterval])

  return {
    refresh: () => {
      lastTimestampRef.current = null // Reset to check for all new resources
    },
  }
}


