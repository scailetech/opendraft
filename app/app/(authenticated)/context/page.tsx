/**
 * Context page for analyzing company websites
 * Extract business context from domain analysis
 */

'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load context form
const ContextForm = dynamic(
  () => import('@/components/context/ContextForm').then(mod => ({ default: mod.ContextForm })),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: false,
  }
)

export default function ContextPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Company Context</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze a website to extract company information for AEO optimization
            </p>
          </div>
          
          <ContextForm />
          
          {/* Help Section */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Why Company Context Matters</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>AI extracts company info, products, and brand identity</li>
              <li>Powers strategic keyword generation for AI search engines</li>
              <li>Optimizes content for ChatGPT, Perplexity, Claude, and Gemini</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

