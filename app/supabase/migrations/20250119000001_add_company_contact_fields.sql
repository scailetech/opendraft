-- Migration: Add Company & Contact Fields to business_contexts
-- Date: 2025-01-19
-- Description: Adds company information and contact fields extracted from website analysis

-- Add company_name field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN company_name TEXT;
  END IF;
END $$;

-- Add company_website field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'company_website'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN company_website TEXT;
  END IF;
END $$;

-- Add contact_email field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- Add contact_phone field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN contact_phone TEXT;
  END IF;
END $$;

-- Add linkedin_url field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN linkedin_url TEXT;
  END IF;
END $$;

-- Add twitter_url field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'twitter_url'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN twitter_url TEXT;
  END IF;
END $$;

-- Add github_url field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'github_url'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN github_url TEXT;
  END IF;
END $$;

-- Add column comments
COMMENT ON COLUMN business_contexts.company_name IS 'Company/brand name extracted from website';
COMMENT ON COLUMN business_contexts.company_website IS 'Full website URL';
COMMENT ON COLUMN business_contexts.contact_email IS 'Primary contact email address';
COMMENT ON COLUMN business_contexts.contact_phone IS 'Primary contact phone number';
COMMENT ON COLUMN business_contexts.linkedin_url IS 'LinkedIn company page URL';
COMMENT ON COLUMN business_contexts.twitter_url IS 'Twitter/X company profile URL';
COMMENT ON COLUMN business_contexts.github_url IS 'GitHub organization/profile URL';

