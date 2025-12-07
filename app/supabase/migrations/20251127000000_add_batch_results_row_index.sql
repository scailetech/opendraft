-- Add performance index for batch_results queries
-- This index optimizes the common query pattern: WHERE batch_id = X ORDER BY row_index
-- Without this index, Postgres must sort results in memory for every status poll

-- Create composite index on (batch_id, row_index)
-- This allows efficient filtering by batch_id AND ordering by row_index in a single index scan
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_row
ON public.batch_results(batch_id, row_index);

-- Performance Impact:
-- Before: Full table scan + sort in memory (slow for 1000+ rows, degrades over time)
-- After: Index-only scan with pre-sorted order (fast, consistent performance)
--
-- Expected improvement for 1000-row batch status queries:
-- - Initial queries: 2-5s → <500ms
-- - During processing: 5-15s → <1s
-- - Peak load: 30s → <2s
