-- Migration: Add RLS policies for API Keys and Usage tables
-- Enables users to manage their own API keys and view their usage

-- Enable RLS on user_api_keys table
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own API keys
CREATE POLICY "Users can create their own API keys"
ON user_api_keys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own API keys
CREATE POLICY "Users can view their own API keys"
ON user_api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own API keys (for revocation)
CREATE POLICY "Users can update their own API keys"
ON user_api_keys FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
ON user_api_keys FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on user_usage table
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage stats
CREATE POLICY "Users can view their own usage"
ON user_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage record
CREATE POLICY "Users can create their own usage record"
ON user_usage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own usage stats
CREATE POLICY "Users can update their own usage"
ON user_usage FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON POLICY "Users can create their own API keys" ON user_api_keys IS 'Allows authenticated users to generate API keys for themselves';
COMMENT ON POLICY "Users can view their own API keys" ON user_api_keys IS 'Allows users to list their own API keys only';
COMMENT ON POLICY "Users can update their own API keys" ON user_api_keys IS 'Allows users to revoke (update revoked_at) their own API keys';
COMMENT ON POLICY "Users can view their own usage" ON user_usage IS 'Allows users to view their own usage statistics';
COMMENT ON POLICY "Users can update their own usage" ON user_usage IS 'Allows usage tracking system to update user stats';
