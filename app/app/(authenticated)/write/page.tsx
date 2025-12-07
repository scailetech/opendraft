'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load thesis writer
const ThesisWriter = dynamic(
  () => import('@/components/thesis/ThesisWriter').then(mod => ({ default: mod.ThesisWriter })),
  {
    loading: () => <Skeleton className="h-full w-full" />,
    ssr: false,
  }
)

export default function WritePage() {
  return (
    <div className="h-full overflow-hidden">
      <ThesisWriter />
    </div>
  )
}

