-- Add follow-up tracking and review request fields to leads table

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_follow_up_sent_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_requested boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- Indexes for cron queries
CREATE INDEX IF NOT EXISTS leads_follow_up_idx ON leads(status, created_at, last_follow_up_sent_at);
CREATE INDEX IF NOT EXISTS leads_review_requested_idx ON leads(status, review_requested, updated_at);
