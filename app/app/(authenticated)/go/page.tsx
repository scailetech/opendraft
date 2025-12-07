/**
 * ABOUTME: Keyword generation page - generate keywords using OpenKeyword
 */

'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load KeywordGenerator
const KeywordGenerator = dynamic(
  () => import('@/components/keywords/KeywordGenerator').then(mod => ({ default: mod.KeywordGenerator })),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    ),
    ssr: false,
  }
)

export default function RunPage() {
  return <KeywordGenerator />
}
