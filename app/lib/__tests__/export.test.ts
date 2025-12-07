import { describe, it, expect } from 'vitest'
import { exportToCSV, exportToJSON, formatForEmail } from '@/lib/export'

describe('Export Functions', () => {
  const mockResults = [
    { id: '1', input: 'Test', output: 'Result', status: 'success' as const },
    { id: '2', input: 'Jane', output: 'Result2', status: 'success' as const },
  ]

  // Helper to strip BOM for testing
  const stripBOM = (str: string) => str.replace(/^\uFEFF/, '')

  describe('exportToCSV', () => {
    it('exports results to CSV format with BOM for spreadsheet compatibility', () => {
      const csv = exportToCSV(mockResults)
      // Should start with UTF-8 BOM
      expect(csv.charCodeAt(0)).toBe(0xFEFF)
      // Fields are quoted for compatibility
      expect(csv).toContain('"id"')
      expect(csv).toContain('"Test"')
    })

    it('accepts metadata parameter without including in CSV output', () => {
      // Metadata is used for filename, not included in CSV body
      const csv = stripBOM(exportToCSV(mockResults, { batchId: 'batch-123', timestamp: '2024-01-01' }))
      // CSV should still be valid and contain data
      expect(csv).toContain('"id"')
      expect(csv).toContain('"Test"')
    })

    it('escapes special characters in CSV', () => {
      const resultsWithSpecial = [
        {
          id: '1',
          input: 'Quote"Test',
          output: 'Comma,Value',
          status: 'success' as const,
        },
      ]
      const csv = stripBOM(exportToCSV(resultsWithSpecial))
      expect(csv).toContain('"Quote""Test"')
      expect(csv).toContain('"Comma,Value"')
    })

    it('handles empty results array', () => {
      const csv = exportToCSV([])
      expect(csv).toBe('')
    })

    it('handles large exports (1000+ rows)', () => {
      const largeResults = Array(1000)
        .fill(0)
        .map((_, i) => ({
          id: String(i),
          input: `Input${i}`,
          output: `Output${i}`,
          status: 'success' as const,
        }))
      const csv = stripBOM(exportToCSV(largeResults))
      const lines = csv.split('\n')
      expect(lines.length).toBeGreaterThan(1000)
    })

    it('preserves newlines in quoted fields', () => {
      const resultsWithNewlines = [
        {
          id: '1',
          input: 'Line1\nLine2',
          output: 'Result',
          status: 'success' as const,
        },
      ]
      const csv = stripBOM(exportToCSV(resultsWithNewlines))
      expect(csv).toContain('"Line1\nLine2"')
    })
  })

  describe('exportToJSON', () => {
    it('exports results to JSON format', () => {
      const json = exportToJSON(mockResults)
      expect(json).toContain('"id"')
      expect(json).toContain('"Test"')
      expect(json).toContain('"Result"')
      // Verify it's valid JSON
      const parsed = JSON.parse(json)
      expect(parsed.results[0].id).toBe('1')
    })

    it('includes metadata in JSON when provided', () => {
      const json = exportToJSON(mockResults, { batchId: 'batch-123' })
      const parsed = JSON.parse(json)
      expect(parsed.metadata).toBeDefined()
      expect(parsed.metadata.batchId).toBe('batch-123')
    })

    it('parses valid JSON output', () => {
      const json = exportToJSON(mockResults)
      const parsed = JSON.parse(json)
      expect(parsed).toHaveProperty('results')
      expect(Array.isArray(parsed.results)).toBe(true)
      expect(parsed.results).toHaveLength(2)
    })

    it('handles empty results array', () => {
      const json = exportToJSON([])
      const parsed = JSON.parse(json)
      expect(parsed.results).toEqual([])
    })

    it('handles special characters without escaping issues', () => {
      const resultsWithSpecial = [
        {
          id: '1',
          input: 'Quote"Test',
          output: 'Comma,Value',
          status: 'success' as const,
        },
      ]
      const json = exportToJSON(resultsWithSpecial)
      const parsed = JSON.parse(json)
      expect(parsed.results[0].input).toBe('Quote"Test')
    })
  })

  describe('formatForEmail', () => {
    it('formats results for email body', () => {
      const email = formatForEmail(mockResults)
      expect(email).toContain('Test')
      expect(email).toContain('Result')
      expect(email).toContain('success')
    })

    it('includes summary statistics', () => {
      const email = formatForEmail(mockResults)
      expect(email).toContain('2')
      expect(email.toLowerCase()).toContain('results')
    })

    it('formats results as HTML table', () => {
      const email = formatForEmail(mockResults)
      expect(email).toContain('<table')
      expect(email).toContain('</table>')
      expect(email).toContain('<tr>')
    })
  })
})






