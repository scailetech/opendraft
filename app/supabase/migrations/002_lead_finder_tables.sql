-- Lead Finder Tables Migration
-- Adds support for AI-powered lead finding with Apollo.io integration

-- Helper function to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Lead searches table (tracks user search prompts and Apollo filters)
CREATE TABLE IF NOT EXISTS public.lead_searches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid(),

  -- Search criteria
  search_prompt TEXT NOT NULL,
  apollo_filters JSONB NOT NULL,

  -- Search results metadata
  total_leads_found INT DEFAULT 0,
  leads_qualified INT DEFAULT 0,
  average_fit_score DECIMAL(5,2),

  -- Processing status
  status TEXT NOT NULL CHECK (status IN (
    'translating',   -- AI translating prompt to filters
    'searching',     -- Searching Apollo
    'enriching',     -- Enriching lead data
    'qualifying',    -- AI qualifying leads
    'completed',     -- All done
    'failed'         -- Error occurred
  )) DEFAULT 'translating',

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Leads table (individual lead records with Apollo + AI data)
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  search_id TEXT NOT NULL REFERENCES public.lead_searches(id) ON DELETE CASCADE,

  -- Apollo person data
  apollo_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  name TEXT NOT NULL,
  email TEXT,
  email_status TEXT CHECK (email_status IN ('verified', 'guessed', 'unavailable')),
  title TEXT,
  linkedin_url TEXT,
  photo_url TEXT,

  -- Contact info
  phone_numbers JSONB DEFAULT '[]'::JSONB,

  -- Location
  city TEXT,
  state TEXT,
  country TEXT,

  -- Organization data
  organization_name TEXT,
  organization_website TEXT,
  organization_industry TEXT,
  organization_size INT,
  organization_funding_stage TEXT,
  organization_technologies JSONB DEFAULT '[]'::JSONB,

  -- Full Apollo response (for reference)
  apollo_data JSONB,

  -- AI qualification results
  fit_score INT CHECK (fit_score BETWEEN 0 AND 100),
  fit_reasoning TEXT,
  outreach_angle TEXT,
  pain_points JSONB DEFAULT '[]'::JSONB,

  -- Lead status
  status TEXT NOT NULL CHECK (status IN (
    'new',           -- Just discovered
    'qualified',     -- AI qualified
    'contacted',     -- Outreach sent
    'responded',     -- They replied
    'converted',     -- Became customer
    'disqualified',  -- Not a good fit
    'unresponsive'   -- No response
  )) DEFAULT 'new',

  -- User notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Lead interactions table (track outreach history)
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),

  -- Interaction details
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email',
    'linkedin',
    'call',
    'meeting',
    'note'
  )),

  subject TEXT,
  message TEXT,
  outcome TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on all tables
ALTER TABLE public.lead_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_searches
CREATE POLICY "Users can see own lead searches"
  ON public.lead_searches FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create lead searches"
  ON public.lead_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead searches"
  ON public.lead_searches FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own lead searches"
  ON public.lead_searches FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for leads
CREATE POLICY "Users can see leads from own searches"
  ON public.leads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lead_searches
    WHERE lead_searches.id = leads.search_id
    AND lead_searches.user_id = auth.uid()
  ) OR auth.role() = 'service_role');

CREATE POLICY "Service role can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR TRUE);

CREATE POLICY "Users can update leads from own searches"
  ON public.leads FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.lead_searches
    WHERE lead_searches.id = leads.search_id
    AND lead_searches.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete leads from own searches"
  ON public.leads FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.lead_searches
    WHERE lead_searches.id = leads.search_id
    AND lead_searches.user_id = auth.uid()
  ));

-- RLS Policies for lead_interactions
CREATE POLICY "Users can see own lead interactions"
  ON public.lead_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create lead interactions"
  ON public.lead_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead interactions"
  ON public.lead_interactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead interactions"
  ON public.lead_interactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_lead_searches_user_id ON public.lead_searches(user_id);
CREATE INDEX idx_lead_searches_status ON public.lead_searches(status);
CREATE INDEX idx_lead_searches_created_at ON public.lead_searches(created_at DESC);

CREATE INDEX idx_leads_search_id ON public.leads(search_id);
CREATE INDEX idx_leads_apollo_id ON public.leads(apollo_id);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_fit_score ON public.leads(fit_score DESC);

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_user_id ON public.lead_interactions(user_id);
CREATE INDEX idx_lead_interactions_created_at ON public.lead_interactions(created_at DESC);

-- Enable Realtime for lead searches and leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_searches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Create triggers for updated_at
CREATE TRIGGER update_lead_searches_updated_at BEFORE UPDATE ON public.lead_searches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for lead search summary
CREATE OR REPLACE VIEW public.lead_search_summary AS
SELECT
  ls.id,
  ls.user_id,
  ls.search_prompt,
  ls.status,
  ls.total_leads_found,
  ls.leads_qualified,
  ls.average_fit_score,
  COUNT(l.id) FILTER (WHERE l.status = 'contacted') as leads_contacted,
  COUNT(l.id) FILTER (WHERE l.status = 'responded') as leads_responded,
  COUNT(l.id) FILTER (WHERE l.status = 'converted') as leads_converted,
  ls.created_at,
  ls.completed_at
FROM public.lead_searches ls
LEFT JOIN public.leads l ON l.search_id = ls.id
GROUP BY ls.id;

-- Grant access to view
GRANT SELECT ON public.lead_search_summary TO authenticated;

-- Success message
SELECT 'Lead Finder tables created successfully!' as status;
