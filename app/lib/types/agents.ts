/**
 * Agent types and interfaces
 */

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused'
export type AgentType = 'bulk' | 'aeo-domination' | 'lead-crawling' | 'outbound-campaign' | 'gtm-analytics' | 'market-analytics'

export interface Agent {
  id: string
  type: AgentType
  name: string
  description: string
  status: AgentStatus
  lastRunAt: string | null
  nextRunAt: string | null
  runsCount: number
  successRate: number
  averageExecutionTime: number | null // in seconds
  currentJobId: string | null
  inputSchema: AgentInputSchema
  outputSchema: AgentOutputSchema
  metadata: Record<string, unknown>
}

export interface AgentInputSchema {
  required: string[]
  optional: string[]
  description: string
}

export interface AgentOutputSchema {
  fields: string[]
  description: string
}

export interface AgentRun {
  id: string
  agentId: string
  agentType: AgentType
  status: AgentStatus
  startedAt: string
  completedAt: string | null
  recordsProcessed: number
  recordsTotal: number
  errorMessage: string | null
  metadata: Record<string, unknown>
}

/**
 * Agent Definition from database (agent_definitions table)
 */
export interface AgentDefinition {
  id: string
  name: string
  description: string | null
  icon: string | null
  category: 'data' | 'content' | 'analytics' | 'automation' | null
  modal_endpoint: string
  input_type: 'csv' | 'leads' | 'keywords' | 'campaign' | 'none' | null
  output_type: 'leads' | 'keywords' | 'content' | 'analytics' | 'campaign' | null
  can_schedule: boolean
  default_schedule: string | null
  config_schema: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AgentRunRequest {
  agent_id: string
  input_resource_ids?: string[]
  config?: Record<string, unknown>
  schedule?: {
    cron: string
    enabled: boolean
  }
}

export interface AgentRunResponse {
  batch_id: string
  status: 'queued' | 'running'
}

