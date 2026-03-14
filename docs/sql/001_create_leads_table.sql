-- Create leads table for storing quote requests and custom quote submissions
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lead Type
  lead_type TEXT NOT NULL CHECK (lead_type IN ('instant_quote', 'custom_quote')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  
  -- Contact Information
  contact_name TEXT,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Move Details
  move_type TEXT,
  origin_suburb TEXT,
  destination_suburb TEXT,
  distance_km INTEGER,
  square_meters INTEGER,
  
  -- Quote Details (for instant quotes)
  estimated_total DECIMAL(10, 2),
  additional_services TEXT[], -- Array of service IDs
  
  -- Custom Quote Details
  industry_type TEXT,
  employee_count TEXT,
  current_location TEXT,
  new_location TEXT,
  target_move_date DATE,
  special_requirements TEXT[], -- Array of requirement IDs
  project_description TEXT,
  preferred_contact_time TEXT,
  
  -- Internal Notes
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_lead_type ON public.leads(lead_type);

-- Enable RLS but allow public inserts (for form submissions)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (public form submissions)
CREATE POLICY "Allow public lead submissions" ON public.leads
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all leads (for admin dashboard)
CREATE POLICY "Allow authenticated read" ON public.leads
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to update leads
CREATE POLICY "Allow authenticated update" ON public.leads
  FOR UPDATE
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
