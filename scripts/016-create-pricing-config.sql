-- Create pricing_config table for distance-based pricing
CREATE TABLE IF NOT EXISTS pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  -- Base pricing
  base_fee numeric NOT NULL DEFAULT 150.00,
  base_distance_km numeric NOT NULL DEFAULT 20.00,
  -- Per-km rates
  per_km_rate numeric NOT NULL DEFAULT 3.50,
  per_km_rate_long_distance numeric DEFAULT 3.00, -- Rate for distances > 100km
  long_distance_threshold_km numeric DEFAULT 100.00,
  -- Minimum charges
  minimum_charge numeric NOT NULL DEFAULT 250.00,
  -- Time-based multipliers
  weekend_multiplier numeric DEFAULT 1.15,
  public_holiday_multiplier numeric DEFAULT 1.50,
  after_hours_multiplier numeric DEFAULT 1.25,
  -- Size-based rates
  per_sqm_rate numeric DEFAULT 5.00,
  -- Additional services
  stairs_per_flight numeric DEFAULT 50.00,
  piano_fee numeric DEFAULT 200.00,
  pool_table_fee numeric DEFAULT 300.00,
  heavy_item_fee numeric DEFAULT 75.00,
  packing_per_hour numeric DEFAULT 65.00,
  -- Deposit
  deposit_percentage numeric DEFAULT 20.00,
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp with time zone DEFAULT now(),
  effective_until timestamp with time zone,
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read pricing_config"
  ON pricing_config FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role full access to pricing_config"
  ON pricing_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default pricing configuration
INSERT INTO pricing_config (name, description)
VALUES (
  'standard',
  'Standard commercial moving pricing configuration'
) ON CONFLICT (name) DO NOTHING;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_pricing_config_active ON pricing_config (is_active, effective_from);
