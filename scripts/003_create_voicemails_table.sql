-- Create voicemails table for storing call recordings
CREATE TABLE IF NOT EXISTS voicemails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_number TEXT NOT NULL,
  recording_url TEXT,
  recording_sid TEXT UNIQUE,
  duration INTEGER DEFAULT 0,
  transcription TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'listened', 'followed_up', 'archived')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_voicemails_status ON voicemails(status);
CREATE INDEX IF NOT EXISTS idx_voicemails_created_at ON voicemails(created_at DESC);

-- Enable RLS
ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;

-- Policy to allow server-side inserts (from webhook)
CREATE POLICY "Allow insert from webhook" ON voicemails
  FOR INSERT
  WITH CHECK (true);

-- Policy to allow reading all voicemails (for admin)
CREATE POLICY "Allow read all voicemails" ON voicemails
  FOR SELECT
  USING (true);

-- Policy to allow updates (for admin)
CREATE POLICY "Allow update voicemails" ON voicemails
  FOR UPDATE
  USING (true);
