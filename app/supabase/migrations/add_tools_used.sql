-- Add tools_used column to batch_results table
-- This tracks which AI tools (web-search, url-context) were used for each row

-- Add the column (nullable, TEXT[] for array of tool names)
ALTER TABLE public.batch_results 
ADD COLUMN IF NOT EXISTS tools_used TEXT[] DEFAULT '{}';

-- Add an index for querying by tools used
CREATE INDEX IF NOT EXISTS idx_batch_results_tools_used ON public.batch_results USING GIN (tools_used);

-- Success
SELECT 'Added tools_used column to batch_results' as status;




