/**
 * ABOUTME: Bulk agent page - only ready agent
 * ABOUTME: Other agents archived as premature
 */

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BulkProcessorSkeleton } from '@/components/bulk/BulkProcessorSkeleton'

// Note: This route redirects to /go - kept for future agent support
export default function AgentPage() {
  const router = useRouter()

  // All agents redirect to main /go page (only bulk processor is ready)
  useEffect(() => {
    router.replace('/go')
  }, [router])

  // Show skeleton while redirecting
  return <BulkProcessorSkeleton />
}

