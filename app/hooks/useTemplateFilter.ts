/**
 * ABOUTME: Hook for filtering prompt templates by search query and category
 * ABOUTME: Memoized for performance, reusable across template gallery implementations
 */

import { useMemo } from 'react'
import { PROMPT_TEMPLATES, type PromptTemplate } from '@/lib/constants/promptTemplates'

export interface TemplateFilterOptions {
  searchQuery: string
  category: 'all' | 'content' | 'data' | 'analysis'
}

/**
 * Filters prompt templates based on search query and category
 *
 * @param searchQuery - Text to search in template name, description, and category
 * @param category - Category filter ('all' shows all templates)
 * @returns Filtered array of templates, memoized to prevent unnecessary re-renders
 *
 * @example
 * const filteredTemplates = useTemplateFilter('bio', 'content')
 * // Returns only templates in 'content' category matching 'bio'
 */
export function useTemplateFilter(
  searchQuery: string,
  category: 'all' | 'content' | 'data' | 'analysis'
): PromptTemplate[] {
  return useMemo(() => {
    let filtered = PROMPT_TEMPLATES

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [searchQuery, category])
}
