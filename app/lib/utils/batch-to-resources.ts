/**
 * Utility: Transform batch results into resources
 * Creates resources from batch_results based on agent type
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'
import { filterDuplicateResources } from '@/lib/utils/resource-deduplication'

// Minimal type definition for resource creation (resources feature was removed)
type ResourceCreate = {
  type: 'lead' | 'keyword' | 'content' | 'campaign'
  data: Record<string, unknown>
  source_type: string
  source_name: string
  batch_id: string
  agent_id: string
  tags: string[]
}

/**
 * Map agent_id to resource type
 */
function getResourceTypeFromAgent(agentId: string | null): 'lead' | 'keyword' | 'content' | 'campaign' | null {
  if (!agentId) return null

  // Map agent IDs to resource types
  // Note: Agent IDs must match agent_definitions.id values exactly (from migration seed)
  const agentTypeMap: Record<string, 'lead' | 'keyword' | 'content' | 'campaign'> = {
    'bulk': 'content', // Bulk Agent
    'lead_crawler': 'lead', // Lead Crawler
    'lead_enricher': 'lead', // Lead Enricher
    'seo_content_writer': 'content', // SEO Content Writer
    'outbound_copywriter': 'content', // Outbound Copywriter
    'campaign_setup': 'campaign', // Campaign Setup
    // Analytics agents don't create resources:
    // 'seo_analytics', 'campaign_analytics', 'market_analytics'
  }

  return agentTypeMap[agentId] || null
}

/**
 * Transform batch result to resource data based on agent type
 */
function transformResultToResourceData(
  agentId: string | null,
  inputData: string,
  outputData: string
): Record<string, unknown> | null {
  if (!agentId) return null

  try {
    const input = inputData ? JSON.parse(inputData) : {}
    const output = outputData ? (outputData.startsWith('{') ? JSON.parse(outputData) : outputData) : {}

    switch (agentId) {
      case 'bulk':
        // Bulk agent creates content from CSV processing
        return {
          title: output.title || output.name || 'Generated Content',
          content: typeof output === 'string' ? output : output.content || output.output || JSON.stringify(output),
          content_type: 'generated',
          word_count: typeof output === 'string' ? output.split(/\s+/).length : 0,
          ...output,
        }

      case 'lead_crawler':
      case 'lead_enricher':
        // Lead crawler/enricher creates lead resources
        return {
          email: output.email || input.email,
          name: output.name || input.name,
          company: output.company || input.company,
          title: output.title || input.title,
          linkedin_url: output.linkedin_url || output.linkedIn,
          phone: output.phone,
          website: output.website,
          ...output,
        }

      case 'seo_content_writer':
        // SEO content writer creates content
        return {
          title: output.title || 'SEO Content',
          content: output.content || output.text || JSON.stringify(output),
          content_type: 'seo',
          seo_score: output.seo_score,
          keyword_density: output.keyword_density,
          word_count: output.word_count || (output.content ? output.content.split(/\s+/).length : 0),
          ...output,
        }

      case 'outbound_copywriter':
        // Outbound copywriter creates content (emails)
        return {
          title: output.title || output.subject || 'Outbound Email',
          content: output.content || output.body || output.text || JSON.stringify(output),
          content_type: 'email',
          word_count: output.word_count || (output.content ? output.content.split(/\s+/).length : 0),
          ...output,
        }

      case 'campaign_setup':
        // Campaign setup creates campaigns
        return {
          name: output.name || output.campaign_name || 'Campaign',
          status: output.status || 'draft',
          type: output.type || output.campaign_type || 'email',
          target_lead_ids: output.target_lead_ids || [],
          content_ids: output.content_ids || [],
          metrics: output.metrics || {},
          ...output,
        }

      default:
        // Default: try to extract common fields
        return {
          ...output,
          ...input,
        }
    }
  } catch (error) {
    console.error('Error transforming result to resource data:', error)
    return {
      raw_output: outputData,
      raw_input: inputData,
    }
  }
}

/**
 * Create resources from batch results
 * Called after batch completion
 */
export async function createResourcesFromBatch(batchId: string): Promise<void> {
  try {
    // Get batch with agent_id
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, user_id, agent_id')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      logError('Error fetching batch for resource creation', batchError)
      return
    }

    if (!batch.agent_id) {
      // No agent_id means this is a legacy bulk agent batch - skip resource creation
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RESOURCES] Batch ${batchId} has no agent_id, skipping resource creation`)
      }
      return
    }

    const resourceType = getResourceTypeFromAgent(batch.agent_id)
    if (!resourceType) {
      // Agent doesn't create resources (e.g., analytics agents)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RESOURCES] Agent ${batch.agent_id} doesn't create resources, skipping`)
      }
      return
    }

    // Get successful batch results
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('batch_results')
      .select('row_index, input_data, output_data, status')
      .eq('batch_id', batchId)
      .eq('status', 'success')

    if (resultsError) {
      logError('Error fetching batch results for resource creation', resultsError)
      return
    }

    if (!results || results.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RESOURCES] No successful results for batch ${batchId}`)
      }
      return
    }

    // Transform results to resources
    const resourcesToCreate: ResourceCreate[] = results
      .map((result) => {
        const resourceData = transformResultToResourceData(
          batch.agent_id,
          result.input_data || '{}',
          result.output_data || ''
        )

        if (!resourceData) {
          return null
        }

        return {
          type: resourceType,
          data: resourceData,
          source_type: 'generated',
          source_name: batch.agent_id,
          batch_id: batchId,
          agent_id: batch.agent_id,
          tags: [`batch_${batchId}`, `row_${result.row_index}`],
        }
      })
      .filter((r): r is ResourceCreate => r !== null)

    if (resourcesToCreate.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RESOURCES] No valid resources to create for batch ${batchId}`)
      }
      return
    }

    // Filter out duplicate resources
    const { uniqueResources, duplicates, stats } = await filterDuplicateResources(
      batch.user_id,
      resourcesToCreate
    )

    if (duplicates.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RESOURCES] Skipped ${duplicates.length} duplicate resources from batch ${batchId}`)
      }
      logError(
        'Duplicate resources skipped',
        new Error(`${duplicates.length} duplicates detected`),
        {
          batchId,
          stats,
          duplicates: duplicates.map(d => ({
            type: d.resource.type,
            batchId: d.resource.batch_id,
            existingId: d.existingId,
          })),
        }
      )
    }

    if (uniqueResources.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RESOURCES] All resources from batch ${batchId} were duplicates, skipping creation`)
      }
      return
    }

    // Create unique resources in bulk
    const { error: insertError } = await supabaseAdmin
      .from('resources')
      .insert(
        uniqueResources.map((r) => ({
          ...r,
          user_id: batch.user_id,
        }))
      )

    if (insertError) {
      logError('Error creating resources from batch', insertError, {
        batchId,
        count: uniqueResources.length,
        skippedDuplicates: duplicates.length,
      })
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[RESOURCES] Created ${uniqueResources.length} unique resources from batch ${batchId}` +
        (duplicates.length > 0 ? ` (skipped ${duplicates.length} duplicates)` : '')
      )
    }
  } catch (error) {
    logError('Error in createResourcesFromBatch', error, { batchId })
  }
}

