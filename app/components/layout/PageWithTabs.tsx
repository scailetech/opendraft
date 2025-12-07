/**
 * ABOUTME: Shared layout component for pages with tabs
 * ABOUTME: DRY - provides consistent breadcrumb + tabs layout across all pages
 * ABOUTME: Compact breadcrumb integrated into tabs header area
 */

'use client'

import { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface TabConfig {
  value: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

interface PageWithTabsProps {
  /** Default tab value */
  defaultValue: string
  /** Tab configurations */
  tabs: TabConfig[]
  /** Max width container class (unused, kept for API compatibility) */
  maxWidth?: string
  /** Controlled value (for URL-based tab switching) */
  value?: string
  /** Callback when tab changes */
  onValueChange?: (value: string) => void
}

export function PageWithTabs({
  defaultValue,
  tabs,
  // maxWidth kept for API compatibility but not used in current layout
  maxWidth: _maxWidth,
  value,
  onValueChange,
}: PageWithTabsProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background text-foreground">
      <Tabs 
        defaultValue={defaultValue} 
        value={value}
        onValueChange={onValueChange}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex-shrink-0 pt-4 sm:pt-6 pb-2">
          {/* Tabs - Centered, no border since inside card */}
          <div className="flex justify-center">
            <TabsList className="w-auto">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-row gap-1.5"
                >
                  {tab.icon && <span className="[&_svg]:h-3.5 [&_svg]:w-3.5 flex-shrink-0">{tab.icon}</span>}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="flex-1 min-h-0 overflow-y-auto mt-0"
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
