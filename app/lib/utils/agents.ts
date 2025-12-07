/**
 * Agent utility functions
 * Helpers for agent operations and formatting
 */

import { AgentDefinition } from '@/lib/types/agents'

export function getAgentById(agents: AgentDefinition[], agentId: string): AgentDefinition | undefined {
  return agents.find(agent => agent.id === agentId)
}

export function formatInputType(inputType: string | null): string {
  if (!inputType) return 'None'
  
  switch (inputType) {
    case 'csv':
      return 'CSV File'
    case 'leads':
      return 'Leads'
    case 'keywords':
      return 'Keywords'
    case 'none':
      return 'None'
    default:
      return inputType
  }
}

export function formatOutputType(outputType: string | null): string {
  if (!outputType) return 'None'
  
  switch (outputType) {
    case 'leads':
      return 'Leads'
    case 'keywords':
      return 'Keywords'
    case 'content':
      return 'Content'
    case 'analytics':
      return 'Analytics'
    case 'campaign':
      return 'Campaign'
    default:
      return outputType
  }
}

export function validateAgentConfig(
  agent: AgentDefinition,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Basic validation: config must exist
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be a valid object')
    return { valid: false, errors }
  }

  // If agent has a config_schema, validate against it
  if (agent.config_schema && typeof agent.config_schema === 'object') {
    const schema = agent.config_schema as Record<string, unknown>

    // Validate required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in config)) {
          errors.push(`Missing required field: ${requiredField}`)
        }
      }
    }

    // Validate properties against schema
    if (schema.properties && typeof schema.properties === 'object') {
      const properties = schema.properties as Record<string, unknown>

      for (const [fieldName, fieldValue] of Object.entries(config)) {
        const fieldSchema = properties[fieldName] as Record<string, unknown> | undefined

        if (fieldSchema) {
          const fieldType = fieldSchema.type

          // Type validation
          if (fieldType) {
            const valueType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue
            if (valueType !== fieldType && !(fieldType === 'null' && fieldValue === null)) {
              errors.push(`Field '${fieldName}' must be of type ${fieldType}, got ${valueType}`)
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function getAgentCategoryLabel(category: string | null): string {
  if (!category) return 'Other'
  
  switch (category) {
    case 'data':
      return 'Data'
    case 'content':
      return 'Content'
    case 'analytics':
      return 'Analytics'
    case 'automation':
      return 'Automation'
    default:
      return category
  }
}

