-- Migration: Set defaults for existing users and prepare for GTM classification
-- Date: 2025-01-16
-- Description: Sets default GTM values for existing users who don't have GTM profile set

-- Set defaults for existing users who have business_context but no GTM profile
UPDATE business_contexts
SET 
  gtm_playbook = 'sales_led',
  product_type = 'sales_marketing',
  gtm_playbook_ai_suggested = false,
  product_type_ai_suggested = false,
  migration_banner_shown = false
WHERE 
  (gtm_playbook IS NULL OR product_type IS NULL)
  AND (icp IS NOT NULL OR products IS NOT NULL OR countries IS NOT NULL);

-- For users with no business_context at all, they'll get defaults when they first create one
-- No action needed here

-- Add comment
COMMENT ON COLUMN business_contexts.migration_banner_shown IS 
  'Set to true after user has seen the migration banner prompting them to set GTM profile';


