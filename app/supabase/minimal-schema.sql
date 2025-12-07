-- Minimal schema for FedeProject
-- Only what we need - no bloat
-- Run this on new Supabase project: thurgehvjqrdmrjayczf

-- 1. Batches table (simplified - only essential columns)
CREATE TABLE IF NOT EXISTS public.batches (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')) DEFAULT 'pending',
  csv_filename TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  processed_rows INT DEFAULT 0,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Batch results table (simplified)
CREATE TABLE IF NOT EXISTS public.batch_results (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  input_data JSONB NOT NULL,
  output_data TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'error')) DEFAULT 'pending',
  error_message TEXT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  model TEXT DEFAULT 'gemini-2.5-flash-lite',
  tools_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for batches
CREATE POLICY "Users can see own batches"
  ON public.batches FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create batches"
  ON public.batches FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can update batches"
  ON public.batches FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- RLS policies for batch_results
CREATE POLICY "Users can see batch results"
  ON public.batch_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.batches
      WHERE batches.id = batch_results.batch_id
      AND (batches.user_id = auth.uid() OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can insert batch results"
  ON public.batch_results FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update batch results"
  ON public.batch_results FOR UPDATE
  USING (auth.role() = 'service_role');

-- Performance indexes
CREATE INDEX idx_batches_user_id ON public.batches(user_id);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_batches_created_at ON public.batches(created_at DESC);
CREATE INDEX idx_batch_results_batch_id ON public.batch_results(batch_id);
CREATE INDEX idx_batch_results_status ON public.batch_results(status);
CREATE INDEX idx_batch_results_row_index ON public.batch_results(batch_id, row_index);
CREATE INDEX idx_batch_results_model ON public.batch_results(model);
CREATE INDEX idx_batch_results_tokens ON public.batch_results(input_tokens, output_tokens);
CREATE INDEX idx_batch_results_tools_used ON public.batch_results USING GIN (tools_used);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_results;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_batch_results_updated_at
  BEFORE UPDATE ON public.batch_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create test user (development only)
-- Same credentials as before: test@bulk.run / Test123456!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '82f459be-bd4c-4bce-8a42-52f8006f2291',
  '00000000-0000-0000-0000-000000000000',
  'test@bulk.run',
  crypt('Test123456!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '{}',
  '{"name": "Test User"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Success
SELECT 'Minimal schema created successfully!' as status;
SELECT 'Test user: test@bulk.run / Test123456!' as credentials;
