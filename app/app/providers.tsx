'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { ResponsiveProvider } from '@/contexts/ResponsiveContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { initWebVitals } from '@/lib/analytics/web-vitals'
import { prefetchUsageStats } from '@/hooks/useUsageStats'

export function Providers({ children }: { children: React.ReactNode }) {
  // Create query client once per provider instance
  const [client] = useState(() => queryClient)

  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals()
    
    // Prefetch usage stats in background so it's ready when user navigates to profile
    // Small delay to not compete with initial page load
    const prefetchTimer = setTimeout(() => {
      prefetchUsageStats()
    }, 2000)
    
    // Initialize analytics on mount (async) if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { analytics } = require('@/lib/analytics')
      if (analytics?.init) {
        analytics.init().catch((error: unknown) => {
          // Silently fail if analytics initialization fails
          console.error('Analytics initialization failed:', error)
        })
      }
    } catch (error: unknown) {
      // Analytics module not available, continue without it
    }
    
    return () => clearTimeout(prefetchTimer)
  }, [])
  
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ResponsiveProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ResponsiveProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}




