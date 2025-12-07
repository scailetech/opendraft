-- Migration: Add Performance Indexes (Fixed Table Names)
-- Date: 2025-11-19
-- Description: Adds critical indexes to improve query performance across frequently accessed tables
-- Fixed: Updated to use correct table names (batch_results, scheduled_runs, scheduled_run_executions, user_api_keys)

-- Batch processing performance indexes
CREATE INDEX IF NOT EXISTS idx_batches_user_id_status
ON batches(user_id, status);

CREATE INDEX IF NOT EXISTS idx_batches_created_at_desc
ON batches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batches_updated_at
ON batches(updated_at DESC);

-- Batch results performance (was batch_items)
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_id_status
ON batch_results(batch_id, status);

CREATE INDEX IF NOT EXISTS idx_batch_results_status_only
ON batch_results(status);

-- Agent definitions performance
CREATE INDEX IF NOT EXISTS idx_agent_definitions_is_active
ON agent_definitions(enabled) WHERE enabled = true;

-- Scheduled runs performance (was schedules)
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_user_id_is_enabled
ON scheduled_runs(user_id, is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_runs_next_run_at
ON scheduled_runs(next_run_at) WHERE is_enabled = true;

-- Scheduled run executions performance (was schedule_runs)
CREATE INDEX IF NOT EXISTS idx_scheduled_run_executions_scheduled_run_id_status
ON scheduled_run_executions(scheduled_run_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_run_executions_started_at
ON scheduled_run_executions(started_at DESC);

-- Business contexts updated_at index (for caching)
CREATE INDEX IF NOT EXISTS idx_business_contexts_updated_at_desc
ON business_contexts(updated_at DESC);

-- User API keys performance (was api_keys)
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id_active
ON user_api_keys(user_id) WHERE revoked_at IS NULL;

-- Comments for documentation
COMMENT ON INDEX idx_batches_user_id_status IS 'Compound index for user batch queries with status filtering';
COMMENT ON INDEX idx_batches_created_at_desc IS 'Index for sorting batches by creation time';
COMMENT ON INDEX idx_batch_results_batch_id_status IS 'Compound index for batch result status queries';
COMMENT ON INDEX idx_scheduled_runs_next_run_at IS 'Partial index for enabled scheduled runs ordered by next run time';
COMMENT ON INDEX idx_business_contexts_updated_at_desc IS 'Index for cache invalidation queries';
COMMENT ON INDEX idx_user_api_keys_user_id_active IS 'Index for active API keys by user';
