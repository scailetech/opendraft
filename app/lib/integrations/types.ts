/**
 * Integration types and interfaces
 */

export type IntegrationProvider = 'hubspot' | 'instantly' | 'phantombuster'

export interface Integration {
  id: string
  userId: string
  provider: IntegrationProvider
  connected: boolean
  connectedAt: string | null
  lastSyncedAt: string | null
  syncEnabled: boolean
  metadata: Record<string, unknown>
}

export interface IntegrationSync {
  id: string
  userId: string
  integrationId: string
  provider: IntegrationProvider
  syncType: 'read' | 'write' | 'full'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  recordsSynced: number
  recordsTotal: number
  errorMessage: string | null
  metadata: Record<string, unknown>
  startedAt: string
  completedAt: string | null
}

export interface IntegrationData {
  id: string
  userId: string
  integrationId: string
  provider: IntegrationProvider
  externalId: string
  dataType: string
  data: Record<string, unknown>
  syncedAt: string
  updatedAt: string
}

export interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    company?: string
    phone?: string
    [key: string]: unknown
  }
}

export interface HubSpotCompany {
  id: string
  properties: {
    name?: string
    domain?: string
    industry?: string
    [key: string]: unknown
  }
}

