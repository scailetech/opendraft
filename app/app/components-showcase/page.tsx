/**
 * Components Showcase Page
 *
 * Demo page to view and test all UX improvement components.
 * Access at: /components-showcase
 */

'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load demo showcase - not a critical production page
const ComponentShowcase = dynamic(
  () => import('@/components/demo/ComponentShowcase').then(mod => ({ default: mod.ComponentShowcase })),
  {
    loading: () => (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ),
    ssr: false,
  }
)

export default function ComponentsShowcasePage() {
  return <ComponentShowcase />
}


