/**
 * HubSpot integration client
 * Handles reading and writing data to/from HubSpot
 */

import type { HubSpotContact, HubSpotCompany } from './types'

interface HubSpotClientConfig {
  apiKey: string
}

export class HubSpotClient {
  private apiKey: string
  private baseUrl = 'https://api.hubapi.com'

  constructor(config: HubSpotClientConfig) {
    this.apiKey = config.apiKey
  }

  /**
   * Get all contacts from HubSpot
   */
  async getContacts(limit = 100, after?: string): Promise<{
    results: HubSpotContact[]
    paging?: { next?: { after: string } }
  }> {
    const url = new URL(`${this.baseUrl}/crm/v3/objects/contacts`)
    url.searchParams.set('limit', limit.toString())
    if (after) {
      url.searchParams.set('after', after)
    }
    url.searchParams.set('properties', 'firstname,lastname,email,company,phone')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`HubSpot API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all companies from HubSpot
   */
  async getCompanies(limit = 100, after?: string): Promise<{
    results: HubSpotCompany[]
    paging?: { next?: { after: string } }
  }> {
    const url = new URL(`${this.baseUrl}/crm/v3/objects/companies`)
    url.searchParams.set('limit', limit.toString())
    if (after) {
      url.searchParams.set('after', after)
    }
    url.searchParams.set('properties', 'name,domain,industry')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`HubSpot API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update a contact in HubSpot
   */
  async updateContact(contactId: string, properties: Record<string, string>): Promise<HubSpotContact> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`HubSpot API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update a company in HubSpot
   */
  async updateCompany(companyId: string, properties: Record<string, string>): Promise<HubSpotCompany> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/companies/${companyId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`HubSpot API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Batch update contacts
   */
  async batchUpdateContacts(updates: Array<{ id: string; properties: Record<string, string> }>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/batch/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: updates.map(({ id, properties }) => ({ id, properties })),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`HubSpot API error: ${error.message || response.statusText}`)
    }
  }
}

