/**
 * ABOUTME: Smart search for GTM tools with fuzzy matching and synonym support
 * ABOUTME: Provides intelligent search that matches similar words and synonyms
 */

import type { GTMTool } from './types/gtm-types'

/**
 * Synonym mappings for common tool-related terms
 */
const SYNONYMS: Record<string, string[]> = {
  'email': ['mail', 'contact', 'address', 'inbox'],
  'phone': ['telephone', 'mobile', 'cell', 'number', 'contact'],
  'company': ['business', 'organization', 'firm', 'corporation', 'enterprise'],
  'person': ['people', 'individual', 'contact', 'lead', 'prospect'],
  'validate': ['verify', 'check', 'confirm', 'authenticate'],
  'enrich': ['enhance', 'augment', 'improve', 'complete'],
  'search': ['find', 'lookup', 'discover', 'locate'],
  'data': ['information', 'details', 'facts'],
  'tech': ['technology', 'software', 'stack', 'tools'],
  'social': ['social media', 'profile', 'network'],
  'domain': ['website', 'url', 'site'],
  'location': ['address', 'geography', 'geo', 'place'],
  'intelligence': ['insight', 'research', 'analysis'],
  'generate': ['create', 'make', 'produce', 'build'],
  'analyze': ['examine', 'study', 'evaluate', 'assess'],
  'scrape': ['extract', 'collect', 'gather'],
  'translate': ['convert', 'transform', 'change language'],
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[len2][len1]
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - distance / maxLen
}

/**
 * Expand search query with synonyms
 */
function expandQuery(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/)
  const expanded: string[] = [query.toLowerCase()]

  for (const term of terms) {
    // Add original term
    if (!expanded.includes(term)) {
      expanded.push(term)
    }

    // Add synonyms
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      if (term.includes(key) || key.includes(term)) {
        for (const synonym of synonyms) {
          const expandedTerm = term.replace(key, synonym)
          if (!expanded.includes(expandedTerm)) {
            expanded.push(expandedTerm)
          }
        }
      }
    }
  }

  return expanded
}

/**
 * Score a tool against a search query
 * Returns a score from 0-1, where 1 is a perfect match
 */
function scoreTool(tool: GTMTool, query: string): number {
  const expandedQueries = expandQuery(query)
  
  // Search in multiple fields
  const searchFields = [
    tool.displayName,
    tool.name,
    tool.description,
    ...(tool.useCases || []),
  ].map(f => f.toLowerCase())

  let maxScore = 0

  for (const expandedQuery of expandedQueries) {
    // Exact match (highest score)
    for (const field of searchFields) {
      if (field === expandedQuery) {
        maxScore = Math.max(maxScore, 1.0)
      }
      // Starts with query
      else if (field.startsWith(expandedQuery)) {
        maxScore = Math.max(maxScore, 0.9)
      }
      // Contains query
      else if (field.includes(expandedQuery)) {
        maxScore = Math.max(maxScore, 0.7)
      }
      // Fuzzy match
      else {
        const sim = similarity(field, expandedQuery)
        if (sim > 0.6) {
          maxScore = Math.max(maxScore, sim * 0.6)
        }
      }
    }

    // Check individual words
    const queryWords = expandedQuery.split(/\s+/)
    for (const word of queryWords) {
      for (const field of searchFields) {
        const fieldWords = field.split(/\s+/)
        for (const fieldWord of fieldWords) {
          if (fieldWord === word) {
            maxScore = Math.max(maxScore, 0.5)
          } else {
            const sim = similarity(fieldWord, word)
            if (sim > 0.7) {
              maxScore = Math.max(maxScore, sim * 0.4)
            }
          }
        }
      }
    }
  }

  return maxScore
}

/**
 * Filter and sort tools based on search query
 * 
 * @param tools - Array of tools to search
 * @param query - Search query string
 * @returns Filtered and sorted tools (best matches first)
 */
export function searchTools(tools: GTMTool[], query: string): GTMTool[] {
  if (!query.trim()) {
    // No query - return sorted alphabetically
    return [...tools].sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  // Score all tools
  const scored = tools.map(tool => ({
    tool,
    score: scoreTool(tool, query),
  }))

  // Filter out low-scoring matches (threshold: 0.2)
  const filtered = scored.filter(({ score }) => score >= 0.2)

  // Sort by score (descending), then alphabetically
  filtered.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.1) {
      return b.score - a.score
    }
    return a.tool.displayName.localeCompare(b.tool.displayName)
  })

  return filtered.map(({ tool }) => tool)
}

