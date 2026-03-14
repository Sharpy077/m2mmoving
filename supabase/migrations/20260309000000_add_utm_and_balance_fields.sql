-- Add UTM tracking, final balance, and Stripe fields to leads table

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS final_balance_amount numeric(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS final_invoice_sent boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS final_payment_status text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS final_payment_date timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Update lead_type constraint to include "phone_enquiry"
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'leads'
      AND constraint_name = 'leads_lead_type_check'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_lead_type_check;
  END IF;

  -- Add updated constraint
  ALTER TABLE leads ADD CONSTRAINT leads_lead_type_check
    CHECK (lead_type IN ('instant_quote', 'custom_quote', 'phone_enquiry'));
END $$;

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS leads_lead_source_idx ON leads(lead_source);
CREATE INDEX IF NOT EXISTS leads_utm_campaign_idx ON leads(utm_campaign);
