/**
 * ABOUTME: Shared utility for formatting AI-generated outputs
 * ABOUTME: Strips markdown code blocks and intelligently formats JSON responses
 */

/**
 * Format AI output for display - intelligently handles JSON responses
 *
 * This function:
 * - Strips markdown code blocks (```json ... ``` or ``` ... ```)
 * - Parses JSON and extracts single-key values
 * - Formats multi-key JSON as readable key: value pairs
 * - Handles nested objects intelligently
 * - Falls back to plain text for non-JSON content
 *
 * @param output - Raw AI output string or object
 * @returns Formatted string ready for display
 */
export function formatOutputValue(output: string | object): string {
  if (typeof output === 'string') {
    // Strip markdown code blocks (```json ... ``` or ``` ... ```)
    let cleanOutput = output.trim()
    const codeBlockMatch = cleanOutput.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/m)
    if (codeBlockMatch) {
      cleanOutput = codeBlockMatch[1].trim()
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(cleanOutput)
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed)

        // Single key object - show just the value
        if (keys.length === 1) {
          const value = parsed[keys[0]]
          return typeof value === 'object'
            ? JSON.stringify(value, null, 2)
            : String(value)
        }

        // Multiple keys - show formatted key-value pairs
        return keys
          .map(k => {
            const value = parsed[k]
            return typeof value === 'object'
              ? `${k}: ${JSON.stringify(value)}`
              : `${k}: ${value}`
          })
          .join('\n')
      }
      return String(parsed)
    } catch {
      // Not JSON - return as-is
      return output
    }
  }

  // Already an object
  return typeof output === 'object'
    ? JSON.stringify(output, null, 2)
    : String(output)
}
