-- Create availability/schedule table for managing booking slots
CREATE TABLE IF NOT EXISTS availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  max_bookings INTEGER DEFAULT 3,
  current_bookings INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Create index for quick date lookups
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);

-- Insert default availability for next 60 days (excluding weekends)
INSERT INTO availability (date, is_available, max_bookings)
SELECT 
  generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', INTERVAL '1 day')::DATE AS date,
  EXTRACT(DOW FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', INTERVAL '1 day')) NOT IN (0, 6) AS is_available,
  3 AS max_bookings
ON CONFLICT (date) DO NOTHING;

-- Enable RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Allow public read access to availability
CREATE POLICY "Allow public read availability" ON availability
  FOR SELECT USING (true);

-- Allow authenticated users to update availability
CREATE POLICY "Allow authenticated update availability" ON availability
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert availability
CREATE POLICY "Allow authenticated insert availability" ON availability
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
