-- Storage RLS Policies for context-files bucket
-- NOTE: The 'context-files' bucket should be created first (via script or Dashboard)
-- Run: node scripts/setup-storage-bucket.js (or create manually in Dashboard)

-- Drop policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Policy 1: Users can upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: SELECT policy covers both reading and listing files

