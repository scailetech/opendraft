/**
 * ABOUTME: Compact breadcrumb navigation component
 * ABOUTME: Shows current page name only (no redundant home chain)
 * ABOUTME: Designed to be integrated into tab headers for space efficiency
 */

'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
  /** Compact mode: shows only current page with home icon, no chain */
  compact?: boolean
}

const routeLabels: Record<string, string> = {
  '/go': 'Run',
  '/log': 'Log',
  '/profile': 'Profile',
}

export function Breadcrumb({ items, className, compact = true }: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const paths = pathname.split('/').filter(Boolean)
    const result: BreadcrumbItem[] = []
    
    // Build breadcrumbs from path segments
    let currentPath = ''
    paths.forEach((segment) => {
      currentPath += `/${segment}`
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)
      result.push({ label, href: currentPath })
    })
    
    return result
  })()

  // Don't show breadcrumbs on root pages or if no items
  if (breadcrumbItems.length === 0) return null

  // Compact mode: show only current page with home icon
  if (compact) {
    const currentPage = breadcrumbItems[breadcrumbItems.length - 1]
    return (
      <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5', className)}>
        <Link
          href="/go"
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Home"
        >
          <Home className="h-3 w-3" aria-hidden="true" />
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
        <span className="text-xs text-foreground font-medium" aria-current="page">
          {currentPage.label}
        </span>
      </nav>
    )
  }

  // Full mode: show full breadcrumb chain
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href="/go"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Home"
          >
            <Home className="h-3 w-3" aria-hidden="true" />
          </Link>
        </li>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          
          return (
            <li key={`${item.href}-${index}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

