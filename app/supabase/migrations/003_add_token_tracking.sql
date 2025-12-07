-- Add token tracking columns to batch_results table
-- Provides transparency for AI token consumption and model usage

-- Only add columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batch_results') THEN
    ALTER TABLE public.batch_results
    ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-2.5-flash-lite';
  END IF;
END $$;

-- Add index for analytics queries (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batch_results') THEN
    CREATE INDEX IF NOT EXISTS idx_batch_results_model ON public.batch_results(model);
    CREATE INDEX IF NOT EXISTS idx_batch_results_tokens ON public.batch_results(input_tokens, output_tokens);
  END IF;
END $$;

-- Success message
SELECT 'Token tracking columns added to batch_results!' as status;
