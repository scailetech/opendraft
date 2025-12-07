import * as z from 'zod'

// Zod schema for Bulk Processor form validation
export const bulkProcessorSchema = z.object({
  // Prompt field - required, with helpful validation messages
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .min(20, 'Prompt should be at least 20 characters for better results')
    .max(5000, 'Prompt is too long (max 5000 characters)'),

  // Output column names - array of unique strings
  outputFields: z
    .array(z.string().min(1, 'Field name cannot be empty'))
    .min(1, 'At least one output field is required')
    .refine(
      (fields) => new Set(fields).size === fields.length,
      'Output field names must be unique'
    ),

  // Webhook URL - optional but must be valid HTTPS if provided
  webhookUrl: z
    .string()
    .optional()
    .refine(
      (url) => {
        if (!url || url.trim() === '') return true // Empty is valid (optional)
        try {
          const parsed = new URL(url)
          return parsed.protocol === 'https:'
        } catch {
          return false
        }
      },
      {
        message: 'Webhook URL must be a valid HTTPS URL (not HTTP)',
      }
    ),

  // Template search query - no validation needed
  templateSearch: z.string().optional(),

  // Template category filter
  templateCategory: z.enum(['all', 'content', 'data', 'analysis']).default('all'),

  // Preview row index for prompt preview
  previewRowIndex: z.number().int().min(0).default(0),
})

export type BulkProcessorFormData = z.infer<typeof bulkProcessorSchema>

// Default values for form
export const bulkProcessorDefaults: BulkProcessorFormData = {
  prompt: 'Write a bio for {{name}} at {{company}}',
  outputFields: ['bio'],
  webhookUrl: '',
  templateSearch: '',
  templateCategory: 'all',
  previewRowIndex: 0,
}
