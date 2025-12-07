/**
 * TypeScript types for scheduled runs feature
 */

export type ScheduleAction = 'test' | 'run'
export type ScheduleStatus = 'active' | 'paused' | 'deleted'
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed'

export interface ScheduleConfig {
  prompt: string
  outputFields: Array<{
    name: string
    type?: string
  }>
  selectedTools?: string[]
  selectedInputColumns?: string[]
  model?: string
  temperature?: number
  maxTokens?: number
  [key: string]: unknown // Allow additional config
}

export interface CSVDataSource {
  // One of these will be populated
  csvData?: {
    columns: string[]
    rows: Array<Record<string, unknown>>
    filename?: string
  }
  csvFilePath?: string // Reference to context file
  csvUrl?: string // Google Sheets URL
  csvFilename?: string // Original filename for reference
}

export interface ScheduledRun {
  id: string
  user_id: string
  agent_type: string
  name: string
  description?: string
  cron_expression: string
  timezone: string
  action: ScheduleAction
  config: ScheduleConfig
  csv_data?: CSVDataSource['csvData']
  csv_file_path?: string
  csv_url?: string
  csv_filename?: string
  status: ScheduleStatus
  is_enabled: boolean
  last_run_at?: string
  last_run_status?: ExecutionStatus
  last_run_batch_id?: string
  next_run_at: string
  run_count: number
  error_count: number
  last_error_message?: string
  created_at: string
  updated_at: string
}

export interface ScheduledRunExecution {
  id: string
  scheduled_run_id: string
  batch_id?: string
  status: ExecutionStatus
  started_at: string
  completed_at?: string
  error_message?: string
  input_tokens?: number
  output_tokens?: number
  rows_processed?: number
  created_at: string
}

export interface CreateScheduleInput {
  name: string
  description?: string
  cron_expression: string
  timezone?: string
  action: ScheduleAction
  config: ScheduleConfig
  csv_data?: CSVDataSource['csvData']
  csv_file_path?: string
  csv_url?: string
  csv_filename?: string
  agent_type?: string
}

export interface UpdateScheduleInput {
  name?: string
  description?: string
  cron_expression?: string
  timezone?: string
  action?: ScheduleAction
  config?: ScheduleConfig
  csv_data?: CSVDataSource['csvData']
  csv_file_path?: string
  csv_url?: string
  csv_filename?: string
  status?: ScheduleStatus
  is_enabled?: boolean
  next_run_at?: string
}

export interface NextRunPreview {
  schedule_id: string
  next_runs: string[] // Array of ISO date strings
}

