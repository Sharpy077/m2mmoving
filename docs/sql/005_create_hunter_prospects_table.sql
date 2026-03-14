-- Hunter Agent Prospects and Outreach Tables
-- Run this script to create the tables for the Hunter lead generation agent

-- Prospects table - stores potential leads identified by Hunter
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company information
  company_name TEXT NOT NULL,
  abn TEXT,
  website TEXT,
  industry TEXT,
  employee_count TEXT,
  estimated_revenue TEXT,
  headquarters TEXT,
  linkedin_url TEXT,
  
  -- Primary contact
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  
  -- Lead source and tracking
  source TEXT NOT NULL, -- 'real_estate_listing', 'linkedin', 'website_visit', 'referral', 'manual'
  source_detail TEXT, -- URL or specific source identifier
  source_listing_id TEXT, -- External listing ID if from real estate
  
  -- Scoring and qualification
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  qualified BOOLEAN DEFAULT FALSE,
  qualification_date TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'enriched', 'qualified', 'contacted', 'engaged', 
    'meeting_scheduled', 'proposal_sent', 'converted', 'lost', 'nurture'
  )),
  
  -- Intent signals (array of signal objects)
  signals JSONB DEFAULT '[]',
  
  -- Enriched data from external sources
  enriched_data JSONB DEFAULT '{}',
  enriched_at TIMESTAMP WITH TIME ZONE,
  
  -- Decision makers (array of contact objects)
  decision_makers JSONB DEFAULT '[]',
  
  -- Outreach tracking
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_action TEXT,
  follow_up_notes TEXT,
  
  -- Sequence tracking
  current_sequence TEXT,
  current_sequence_step INTEGER DEFAULT 0,
  sequence_started_at TIMESTAMP WITH TIME ZONE,
  
  -- Conversion tracking
  converted_lead_id UUID REFERENCES leads(id),
  conversion_date TIMESTAMP WITH TIME ZONE,
  lost_reason TEXT,
  
  -- Assignment
  assigned_agent TEXT DEFAULT 'HUNTER_LG',
  
  -- Notes
  internal_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outreach history table - tracks all outreach attempts
CREATE TABLE IF NOT EXISTS outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  
  -- Outreach details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'call', 'sms')),
  outreach_type TEXT NOT NULL, -- 'initial_outreach', 'follow_up_1', 'connection_request', etc.
  template_id TEXT,
  sequence_name TEXT,
  sequence_step INTEGER,
  
  -- Content
  subject TEXT,
  message_content TEXT,
  personalization_data JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'scheduled', 'sent', 'delivered', 'opened', 'clicked', 
    'replied', 'bounced', 'failed', 'cancelled'
  )),
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Response
  response_content TEXT,
  response_sentiment TEXT, -- 'positive', 'neutral', 'negative'
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- External IDs
  external_message_id TEXT, -- From email provider or LinkedIn
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent signals table - stores detected buying signals
CREATE TABLE IF NOT EXISTS intent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  
  -- Signal details
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'commercial_lease_listing', 'lease_expiration', 'hiring_surge',
    'funding_announcement', 'office_renovation', 'expansion_news',
    'competitor_mention', 'linkedin_job_post', 'website_visit', 'content_download'
  )),
  
  -- Confidence and timing
  confidence INTEGER DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  timing TEXT CHECK (timing IN ('immediate', 'near_term', 'future', 'unknown')),
  
  -- Source
  source TEXT NOT NULL,
  source_url TEXT,
  
  -- Company (if prospect not yet created)
  company_name TEXT,
  company_data JSONB DEFAULT '{}',
  
  -- Signal details
  details JSONB DEFAULT '{}',
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email templates table - stores outreach templates
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'initial', 'follow_up', 'case_study', 'closing'
  
  -- Content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Personalization fields
  required_fields TEXT[] DEFAULT '{}',
  optional_fields TEXT[] DEFAULT '{}',
  
  -- Performance tracking
  send_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (id, name, category, subject, body, required_fields) VALUES
(
  'initial_outreach',
  'Initial Outreach',
  'initial',
  'Quick question about {companyName}''s upcoming move',
  E'Hi {firstName},\n\nI noticed {companyName} might be relocating soon - congratulations on the growth!\n\nAt M&M Commercial Moving, we specialize in making business relocations seamless. Our tech-powered approach means zero downtime and real-time tracking of every piece of equipment.\n\nWould it be helpful if I sent over a quick guide on "5 Things Most Companies Forget When Moving Offices"?\n\nBest,\nHunter\nM&M Commercial Moving',
  ARRAY['firstName', 'companyName']
),
(
  'follow_up_1',
  'Follow Up 1 - Case Study',
  'follow_up',
  'Re: {companyName}''s office move',
  E'Hi {firstName},\n\nJust following up on my last note. I know office moves can be stressful - we recently helped TechCorp relocate 150 employees over a single weekend with zero business interruption.\n\nWould a 15-minute call be useful to discuss your timeline?\n\nBest,\nHunter',
  ARRAY['firstName', 'companyName']
),
(
  'follow_up_2',
  'Follow Up 2 - Pain Points',
  'follow_up',
  'The hidden costs of office moves',
  E'Hi {firstName},\n\nDid you know the average office move costs companies 3-5 days of productivity? Our clients typically see zero downtime.\n\nHappy to share how we achieved this for {industry} companies like yours.\n\nBest,\nHunter',
  ARRAY['firstName', 'industry']
),
(
  'closing_loop',
  'Closing the Loop',
  'closing',
  'Closing the loop on M&M',
  E'Hi {firstName},\n\nI''ve reached out a few times about helping {companyName} with your upcoming move. I don''t want to be a pest, so this will be my last note.\n\nIf timing isn''t right now, no worries at all. Feel free to reach out whenever you''re ready - I''m here to help.\n\nWishing you all the best,\nHunter',
  ARRAY['firstName', 'companyName']
)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source);
CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON prospects(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_prospects_company_name ON prospects(company_name);
CREATE INDEX IF NOT EXISTS idx_prospects_contact_email ON prospects(contact_email);

CREATE INDEX IF NOT EXISTS idx_outreach_prospect_id ON outreach_history(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_history(status);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreach_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_channel ON outreach_history(channel);

CREATE INDEX IF NOT EXISTS idx_signals_prospect_id ON intent_signals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON intent_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_processed ON intent_signals(processed);
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON intent_signals(detected_at DESC);

-- Enable RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prospects
CREATE POLICY "Authenticated users can read prospects"
  ON prospects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to prospects"
  ON prospects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert prospects"
  ON prospects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prospects"
  ON prospects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for outreach_history
CREATE POLICY "Authenticated users can read outreach_history"
  ON outreach_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to outreach_history"
  ON outreach_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert outreach_history"
  ON outreach_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for intent_signals
CREATE POLICY "Authenticated users can read intent_signals"
  ON intent_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to intent_signals"
  ON intent_signals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert intent_signals"
  ON intent_signals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for email_templates
CREATE POLICY "Anyone can read email_templates"
  ON email_templates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to email_templates"
  ON email_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_outreach_history_updated_at ON outreach_history;
CREATE TRIGGER update_outreach_history_updated_at
  BEFORE UPDATE ON outreach_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
