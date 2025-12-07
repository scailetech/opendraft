/**
 * Resource utility functions
 * Formatting, icons, and display helpers for resources
 */

import { Database, Search, FileText, Megaphone } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

// Minimal type definitions (resources feature was removed)
type ResourceType = 'lead' | 'keyword' | 'content' | 'campaign'
type SourceType = 'customer' | 'tool' | 'generated'
type Resource = {
  id: string
  type: ResourceType
  data: Record<string, unknown>
  source_type: SourceType
  source_name: string
  created_at: string
  updated_at: string
}

export function getResourceIcon(type: ResourceType): LucideIcon {
  switch (type) {
    case 'lead':
      return Database
    case 'keyword':
      return Search
    case 'content':
      return FileText
    case 'campaign':
      return Megaphone
  }
}

export function getResourceTypeLabel(type: ResourceType): string {
  switch (type) {
    case 'lead':
      return 'Lead'
    case 'keyword':
      return 'Keyword'
    case 'content':
      return 'Content'
    case 'campaign':
      return 'Campaign'
  }
}

export function getSourceTypeLabel(sourceType: SourceType): string {
  switch (sourceType) {
    case 'customer':
      return 'Customer'
    case 'tool':
      return 'Tool'
    case 'generated':
      return 'Generated'
  }
}

export function formatSourceDisplayName(sourceName: string): string {
  // Convert snake_case or kebab-case to Title Case
  return sourceName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function formatResourceData(resource: Resource): {
  primary: string
  secondary?: string
  email?: string
} {
  const data = resource.data as Record<string, unknown>
  
  switch (resource.type) {
    case 'lead':
      return {
        primary: (typeof data.name === 'string' ? data.name : (typeof data.email === 'string' ? data.email : 'Unknown Lead')),
        secondary: (typeof data.company === 'string' ? data.company : (typeof data.title === 'string' ? data.title : '')),
        email: typeof data.email === 'string' ? data.email : undefined,
      }
    case 'keyword':
      return {
        primary: (typeof data.keyword === 'string' ? data.keyword : 'Unknown Keyword'),
        secondary: `Volume: ${data.search_volume || 'N/A'} | Difficulty: ${data.difficulty || 'N/A'}`,
      }
    case 'content':
      return {
        primary: (typeof data.title === 'string' ? data.title : 'Untitled Content'),
        secondary: `${data.format || 'content'} • ${data.word_count || 0} words`,
      }
    case 'campaign':
      return {
        primary: (typeof data.name === 'string' ? data.name : 'Unnamed Campaign'),
        secondary: `Status: ${data.status || 'unknown'} • Type: ${data.type || 'unknown'}`,
      }
  }
}

export function getResourceColorClass(type: ResourceType): string {
  switch (type) {
    case 'lead':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case 'keyword':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    case 'content':
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    case 'campaign':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  }
}

