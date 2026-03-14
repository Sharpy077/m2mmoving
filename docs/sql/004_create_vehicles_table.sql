-- Create vehicles table for fleet management
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  registration VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'truck',
  capacity_sqm INTEGER DEFAULT 20,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  gps_device_id VARCHAR(100),
  gps_last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add vehicle assignment to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deployment_status VARCHAR(20) DEFAULT 'pending';

-- Insert the first vehicle
INSERT INTO vehicles (name, registration, vehicle_type, capacity_sqm, status)
VALUES ('Vehicle 01', 'ABC-123', 'truck', 30, 'available');

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Allow public read access for stats
CREATE POLICY "Allow public read access to vehicles" ON vehicles
  FOR SELECT USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_deployment_status ON leads(deployment_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_vehicle ON leads(assigned_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
