/**
 * Agent Definition types
 * Database-driven agent definitions (replaces mock data)
 * 
 * Note: Database uses 'category' field, not 'type'
 * Categories: 'data', 'content', 'analytics', 'automation'
 */

export type AgentCategory = 'data' | 'content' | 'analytics' | 'automation'
export type AgentInputType = 'csv' | 'leads' | 'keywords' | 'campaign' | 'none'
export type AgentOutputType = 'leads' | 'keywords' | 'content' | 'analytics' | 'campaign'

export interface AgentDefinition {
  id: string
  name: string
  description: string | null
  icon: string | null
  category: AgentCategory
  modal_endpoint: string
  input_type: AgentInputType
  output_type: AgentOutputType
  can_schedule: boolean
  default_schedule: string | null
  config_schema: Record<string, unknown> | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface AgentDefinitionInput {
  id: string
  name: string
  description?: string
  icon?: string
  category: AgentCategory
  modal_endpoint: string
  input_type: AgentInputType
  output_type: AgentOutputType
  can_schedule?: boolean
  default_schedule?: string
  config_schema?: Record<string, unknown>
  enabled?: boolean
}


