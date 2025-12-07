/**
 * Resource Deduplication Utilities
 * Prevents creating duplicate resources from the same batch or multiple runs
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'

// Minimal type definitions (resources feature was removed)
type ResourceType = 'lead' | 'keyword' | 'content' | 'campaign'
type ResourceCreate = {
  type: ResourceType
  data: Record<string, unknown>
  source_type: string
  source_name: string
  batch_id: string
  agent_id: string
  tags: string[]
}

/**
 * Extract unique identifier from resource data based on type
 * Returns null if no unique identifier can be extracted
 */
export function extractUniqueIdentifier(
  resourceType: ResourceType,
  resourceData: Record<string, unknown>
): string | null {
  switch (resourceType) {
    case 'lead':
      // Use email as unique identifier for leads
      const email = resourceData.email as string | undefined
      return email ? email.toLowerCase().trim() : null

    case 'keyword':
      // Use keyword text as unique identifier
      const keyword = resourceData.keyword as string | undefined
      return keyword ? keyword.toLowerCase().trim() : null

    case 'content':
      // Use title as unique identifier (less strict, but reasonable)
      // Could also use content hash for stricter deduplication
      const title = resourceData.title as string | undefined
      return title ? title.toLowerCase().trim() : null

    case 'campaign':
      // Use name + type combination as unique identifier
      const name = resourceData.name as string | undefined
      const type = resourceData.type as string | undefined
      if (name && type) {
        return `${name.toLowerCase().trim()}:${type.toLowerCase().trim()}`
      }
      return name ? name.toLowerCase().trim() : null

    default:
      return null
  }
}

/**
 * Check if a resource already exists based on unique identifier
 */
async function checkResourceExists(
  userId: string,
  resourceType: ResourceType,
  uniqueIdentifier: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _resourceData: Record<string, unknown>
): Promise<{ exists: boolean; existingId?: string }> {
  try {
    const query = supabaseAdmin
      .from('resources')
      .select('id')
      .eq('user_id', userId)
      .eq('type', resourceType)

    // Build query based on resource type
    switch (resourceType) {
      case 'lead': {
        // Check by email (case-insensitive)
        const email = uniqueIdentifier
        const { data, error } = await query
          .or(`data->>email.ilike.%${email}%,data->>email.ilike.%${email.toUpperCase()}%`)
          .limit(1)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          logError('Error checking for duplicate lead', error)
          return { exists: false }
        }
        
        return { exists: !!data, existingId: data?.id }
      }

      case 'keyword': {
        // Check by keyword (case-insensitive)
        const keyword = uniqueIdentifier
        const { data, error } = await query
          .or(`data->>keyword.ilike.%${keyword}%,data->>keyword.ilike.%${keyword.toUpperCase()}%`)
          .limit(1)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          logError('Error checking for duplicate keyword', error)
          return { exists: false }
        }
        
        return { exists: !!data, existingId: data?.id }
      }

      case 'content': {
        // Check by title (case-insensitive)
        const title = uniqueIdentifier
        const { data, error } = await query
          .or(`data->>title.ilike.%${title}%,data->>title.ilike.%${title.toUpperCase()}%`)
          .limit(1)
          .maybeSingle()
        
        if (error && error.code !== 'PGRST116') {
          logError('Error checking for duplicate content', error)
          return { exists: false }
        }
        
        return { exists: !!data, existingId: data?.id }
      }

      case 'campaign': {
        // Check by name:type combination
        const [name, type] = uniqueIdentifier.split(':')
        
        // Fetch candidates by name
        let campaignQuery = query
        if (name) {
          campaignQuery = campaignQuery.or(`data->>name.ilike.%${name}%,data->>name.ilike.%${name.toUpperCase()}%`)
        }
        
        // Fetch all matching candidates and filter by type in memory
        // (Supabase doesn't easily support AND on multiple JSONB fields)
        const { data: candidates, error: fetchError } = await campaignQuery.select('id, data')
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          logError('Error checking for duplicate campaign', fetchError)
          return { exists: false }
        }
        
        if (!candidates || candidates.length === 0) {
          return { exists: false }
        }
        
        // If type is specified, filter by type in memory
        if (type) {
          const match = candidates.find((c: { data?: { type?: unknown } }) => {
            const candidateType = typeof c.data?.type === 'string' ? c.data.type.toLowerCase().trim() : ''
            return candidateType === type
          })
          return { exists: !!match, existingId: match?.id }
        }
        
        // If no type specified, return first match by name
        return { exists: true, existingId: candidates[0]?.id }
      }

      default:
        return { exists: false }
    }
  } catch (error) {
    logError('Error in checkResourceExists', error)
    return { exists: false }
  }
}

/**
 * Filter out duplicate resources before creation
 * Returns resources that don't already exist
 */
export async function filterDuplicateResources(
  userId: string,
  resourcesToCreate: ResourceCreate[]
): Promise<{
  uniqueResources: ResourceCreate[]
  duplicates: Array<{ resource: ResourceCreate; existingId?: string }>
  stats: {
    total: number
    unique: number
    duplicates: number
  }
}> {
  const duplicates: Array<{ resource: ResourceCreate; existingId?: string }> = []
  const uniqueResources: ResourceCreate[] = []

  for (const resource of resourcesToCreate) {
    const uniqueIdentifier = extractUniqueIdentifier(resource.type, resource.data)
    
    if (!uniqueIdentifier) {
      // No unique identifier - include it (can't deduplicate)
      uniqueResources.push(resource)
      continue
    }

    const { exists, existingId } = await checkResourceExists(
      userId,
      resource.type,
      uniqueIdentifier,
      resource.data
    )

    if (exists) {
      duplicates.push({ resource, existingId })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEDUP] Duplicate ${resource.type} detected:`, {
          identifier: uniqueIdentifier,
          existingId,
          batchId: resource.batch_id,
        })
      }
    } else {
      uniqueResources.push(resource)
    }
  }

  const stats = {
    total: resourcesToCreate.length,
    unique: uniqueResources.length,
    duplicates: duplicates.length,
  }

  if (duplicates.length > 0) {
    logError(
      'Duplicate resources detected',
      new Error(`${duplicates.length} duplicate resources skipped`),
      {
        userId,
        duplicates: duplicates.map(d => ({
          type: d.resource.type,
          identifier: extractUniqueIdentifier(d.resource.type, d.resource.data),
          existingId: d.existingId,
        })),
        stats,
      }
    )
  }

  return {
    uniqueResources,
    duplicates,
    stats,
  }
}

