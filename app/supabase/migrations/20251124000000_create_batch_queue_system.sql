-- Batch Queue System for Rate Limiting & Concurrent User Management
-- Tracks batches waiting to be processed and API rate limit usage

-- Table: batch_queue
-- Purpose: Queue system for batches waiting to be processed
CREATE TABLE IF NOT EXISTS batch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE REFERENCES batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Queue position and timestamps
  queue_position INT NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  row_count INT NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0, -- Higher = process sooner
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_queue_timing CHECK (
    (status = 'pending' AND started_at IS NULL AND completed_at IS NULL) OR
    (status = 'processing' AND started_at IS NOT NULL AND completed_at IS NULL) OR
    (status IN ('completed', 'failed', 'cancelled') AND completed_at IS NOT NULL)
  )
);

-- Table: rate_limits
-- Purpose: Track token usage to enforce API limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time window tracking (minute-based)
  minute_window TIMESTAMPTZ NOT NULL,

  -- Token usage
  tokens_used INT NOT NULL DEFAULT 0,
  requests_made INT NOT NULL DEFAULT 0,

  -- Limits (based on your API tier)
  tokens_limit INT NOT NULL DEFAULT 20000000, -- 20M tokens per minute
  requests_limit INT NOT NULL DEFAULT 20000, -- 20k requests per minute

  -- Status
  is_limited BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, minute_window)
);

-- Table: queue_metrics
-- Purpose: Track queue performance and stats
CREATE TABLE IF NOT EXISTS queue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time window
  hour_window TIMESTAMPTZ NOT NULL,

  -- Metrics
  batches_queued INT NOT NULL DEFAULT 0,
  batches_processed INT NOT NULL DEFAULT 0,
  batches_failed INT NOT NULL DEFAULT 0,
  avg_wait_time_seconds INT NOT NULL DEFAULT 0,
  avg_processing_time_seconds INT NOT NULL DEFAULT 0,

  -- Token metrics
  total_tokens_used INT NOT NULL DEFAULT 0,
  peak_concurrent_batches INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(hour_window)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_queue_user_status ON batch_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_queue_status_position ON batch_queue(status, queue_position);
CREATE INDEX IF NOT EXISTS idx_batch_queue_queued_at ON batch_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window ON rate_limits(user_id, minute_window);
CREATE INDEX IF NOT EXISTS idx_rate_limits_limited ON rate_limits(is_limited);
CREATE INDEX IF NOT EXISTS idx_queue_metrics_window ON queue_metrics(hour_window);

-- Enable RLS for batch_queue
ALTER TABLE batch_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own queue entries
CREATE POLICY "Users can view own queue entries"
  ON batch_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue entries"
  ON batch_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entries"
  ON batch_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS for rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can access rate_limits (needed for tracking)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- Enable RLS for queue_metrics
ALTER TABLE queue_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view queue metrics"
  ON queue_metrics FOR SELECT
  USING (TRUE);
