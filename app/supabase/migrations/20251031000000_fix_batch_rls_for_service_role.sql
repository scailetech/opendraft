-- Fix RLS policies to allow service role access to batches and batch_results
-- This resolves FK constraint errors when Modal tries to insert results
--
-- ROOT CAUSE: The "System can insert batch results" policy has a WITH CHECK
-- that queries batches table filtered by auth.uid() = user_id, but service_role
-- doesn't have auth.uid() set, so the subquery returns empty and FK check fails.
--
-- FIX: Add service_role bypass to all batch-related policies

-- ============================================================================
-- batches table - Add service role policies
-- ============================================================================

-- Allow service role to select all batches
CREATE POLICY "service_role_select_batches"
ON "public"."batches"
FOR SELECT
TO "service_role"
USING (true);

-- Allow service role to update all batches
CREATE POLICY "service_role_update_batches"
ON "public"."batches"
FOR UPDATE
TO "service_role"
USING (true)
WITH CHECK (true);

-- Allow service role to insert batches (if needed for future features)
CREATE POLICY "service_role_insert_batches"
ON "public"."batches"
FOR INSERT
TO "service_role"
WITH CHECK (true);

-- Allow service role to delete batches (if needed for cleanup)
CREATE POLICY "service_role_delete_batches"
ON "public"."batches"
FOR DELETE
TO "service_role"
USING (true);

-- ============================================================================
-- batch_results table - Add service role policies
-- ============================================================================

-- THIS IS THE CRITICAL FIX - Allow service role to insert results
CREATE POLICY "service_role_insert_batch_results"
ON "public"."batch_results"
FOR INSERT
TO "service_role"
WITH CHECK (true);  -- No FK check issues - service role can insert anything

-- Allow service role to select all results
CREATE POLICY "service_role_select_batch_results"
ON "public"."batch_results"
FOR SELECT
TO "service_role"
USING (true);

-- Allow service role to update results (for retry logic, etc.)
CREATE POLICY "service_role_update_batch_results"
ON "public"."batch_results"
FOR UPDATE
TO "service_role"
USING (true)
WITH CHECK (true);

-- Allow service role to delete results (for cleanup)
CREATE POLICY "service_role_delete_batch_results"
ON "public"."batch_results"
FOR DELETE
TO "service_role"
USING (true);

-- ============================================================================
-- Verification and Comments
-- ============================================================================

COMMENT ON POLICY "service_role_insert_batch_results" ON "public"."batch_results"
IS 'Allows Modal processor (service_role) to insert batch results without FK constraint errors caused by RLS filtering in the original "System can insert batch results" policy';

COMMENT ON POLICY "service_role_select_batches" ON "public"."batches"
IS 'Allows Modal processor (service_role) to read batches created by users';

COMMENT ON POLICY "service_role_update_batches" ON "public"."batches"
IS 'Allows Modal processor (service_role) to update batch status';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- 1. USER ISOLATION PRESERVED:
--    - User policies ("Users can see own batches", etc.) remain unchanged
--    - Users still cannot see other users' batches
--    - Service role bypasses RLS as intended by design
--
-- 2. WHY THIS FIXES THE FK ERROR:
--    - Before: INSERT INTO batch_results checks if batch exists via subquery
--    - Subquery: SELECT id FROM batches WHERE user_id = auth.uid()
--    - Problem: auth.uid() is NULL for service_role, so subquery returns empty
--    - Result: FK constraint fails even though batch exists
--    - After: service_role has direct INSERT permission, no subquery needed
--
-- 3. SECURITY:
--    - Service role key is stored in Supabase secrets and Modal secrets
--    - Only Modal backend has access to service role key
--    - Frontend uses anon key + user JWT (user-level permissions only)
--
-- 4. TESTING:
--    - Run: npx playwright test playwright-tests/test-pending-fix-production-direct.spec.ts
--    - Expected: Batches complete processing, no FK errors in Modal logs
--    - Verify: modal app logs bulk-gpt-processor-mvp --tail 100
