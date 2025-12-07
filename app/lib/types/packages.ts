/**
 * Package types and interfaces
 * Admin packages and client assignments
 */

export interface AgentConfig {
  agent_id: string
  config: Record<string, unknown>
  schedule?: string
}

export interface AdminPackage {
  id: string
  agency_user_id: string
  name: string
  description?: string
  agent_configs: AgentConfig[]
  monthly_cost: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientPackageAssignment {
  id: string
  client_user_id: string
  package_id: string
  status: 'active' | 'paused'
  included_self_service_credits: number
  used_self_service_credits: number
  rolled_over_credits: number
  billing_period_start: string
  assigned_at: string
  updated_at: string
}

export interface PackageRun {
  id: string
  client_user_id: string
  package_id: string
  agent_id: string
  batch_id?: string
  config: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface AdminPackageCreate {
  name: string
  description?: string
  agent_configs: AgentConfig[]
  monthly_cost: number
}

export interface AdminPackageUpdate {
  name?: string
  description?: string
  agent_configs?: AgentConfig[]
  monthly_cost?: number
  is_active?: boolean
}

