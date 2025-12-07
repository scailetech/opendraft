/**
 * ABOUTME: Reusable section header component for bulk processor sections
 * ABOUTME: Provides consistent styling and layout for section titles with icons
 */

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon
  /** Section title text */
  title: string
  /** Whether this section is required (shows asterisk) */
  required?: boolean
  /** Additional description or help text */
  description?: string
  /** Additional CSS classes for the container */
  className?: string
  /** Additional content to render on the right side (e.g., action buttons) */
  rightContent?: React.ReactNode
}

/**
 * Consistent section header component for bulk processor
 *
 * Provides a standardized header layout with optional icon, title,
 * required indicator, and description text. Follows the existing
 * design system patterns used in the bulk processor.
 *
 * @example
 * <SectionHeader
 *   icon={Code}
 *   title="Output Format"
 *   description="Choose how the AI should format responses"
 * />
 *
 * @example
 * <SectionHeader
 *   icon={FileText}
 *   title="CSV Data"
 *   required
 *   rightContent={<button>Upload</button>}
 * />
 */
export function SectionHeader({
  icon: Icon,
  title,
  required = false,
  description,
  className,
  rightContent
}: SectionHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
          <h3 className="text-xs font-medium text-muted-foreground">
            {title}
            {required && <span className="ml-1 text-red-400" aria-label="required">*</span>}
          </h3>
        </div>
        {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
