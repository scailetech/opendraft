/**
 * Resource Export Utilities
 * Export resources to CSV or JSON format
 */

// Minimal type definition (resources feature was removed)
type Resource = {
  id: string
  type: 'lead' | 'keyword' | 'content' | 'campaign'
  data: Record<string, unknown>
  source_type: string
  source_name: string
  created_at: string
  updated_at: string
}

/**
 * Convert resources to CSV format
 */
export function resourcesToCSV(resources: Resource[]): string {
  if (resources.length === 0) return ''

  // Get all unique keys from all resources' data objects
  const allKeys = new Set<string>()
  resources.forEach(resource => {
    Object.keys(resource.data || {}).forEach(key => allKeys.add(key))
  })

  // Add metadata columns
  const metadataKeys = ['id', 'type', 'source_type', 'source_name', 'created_at', 'updated_at']
  const csvKeys = [...metadataKeys, ...Array.from(allKeys).sort()]

  // Build CSV header
  const header = csvKeys.map(key => `"${key}"`).join(',')

  // Build CSV rows
  const rows = resources.map(resource => {
    return csvKeys.map(key => {
      let value: string
      
      if (key === 'id') {
        value = resource.id
      } else if (key === 'type') {
        value = resource.type
      } else if (key === 'source_type') {
        value = resource.source_type
      } else if (key === 'source_name') {
        value = resource.source_name
      } else if (key === 'created_at') {
        value = resource.created_at
      } else if (key === 'updated_at') {
        value = resource.updated_at
      } else {
        // Get from data object
        const dataValue = resource.data?.[key]
        if (dataValue === null || dataValue === undefined) {
          value = ''
        } else if (typeof dataValue === 'object') {
          value = JSON.stringify(dataValue)
        } else {
          value = String(dataValue)
        }
      }
      
      // Escape quotes and wrap in quotes
      return `"${value.replace(/"/g, '""')}"`
    }).join(',')
  })

  return [header, ...rows].join('\n')
}

/**
 * Convert resources to JSON format
 */
export function resourcesToJSON(resources: Resource[]): string {
  return JSON.stringify(resources, null, 2)
}

/**
 * Download file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export resources as CSV
 */
export function exportResourcesAsCSV(resources: Resource[], type: string) {
  const csv = resourcesToCSV(resources)
  const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename, 'text/csv')
}

/**
 * Export resources as JSON
 */
export function exportResourcesAsJSON(resources: Resource[], type: string) {
  const json = resourcesToJSON(resources)
  const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.json`
  downloadFile(json, filename, 'application/json')
}


