-- ============================================================================
-- NEXUS AGENT OPERATIONS TABLES
-- Scheduling, routing, crew management, and day-of coordination
-- ============================================================================

-- Crews table
CREATE TABLE IF NOT EXISTS crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  
  -- Members (references to staff, stored as JSONB for flexibility)
  members JSONB DEFAULT '[]', -- [{id, name, role, phone}]
  crew_lead_id UUID,
  crew_lead_name TEXT,
  
  -- Skills and capabilities
  skills JSONB DEFAULT '[]', -- ['heavy_lifting', 'piano', 'antiques']
  max_sqm INTEGER DEFAULT 100,
  vehicle_certified JSONB DEFAULT '[]', -- ['truck_small', 'truck_large']
  
  -- Status
  status TEXT DEFAULT 'available', -- available, on_job, off_duty, unavailable
  current_job_id UUID,
  
  -- Schedule
  working_days JSONB DEFAULT '[1,2,3,4,5]', -- Mon-Fri
  shift_start TIME DEFAULT '07:00',
  shift_end TIME DEFAULT '17:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  
  -- Customer info (denormalized for quick access)
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Job details
  job_type TEXT NOT NULL, -- office, warehouse, retail, industrial
  origin_address TEXT NOT NULL,
  origin_suburb TEXT,
  destination_address TEXT NOT NULL,
  destination_suburb TEXT,
  estimated_sqm INTEGER,
  special_requirements JSONB DEFAULT '[]',
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  start_time TIME DEFAULT '08:00',
  estimated_duration_hours NUMERIC(4,1) DEFAULT 4,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Assignments
  assigned_crew_id UUID REFERENCES crews(id),
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  
  -- Priority
  priority TEXT DEFAULT 'standard', -- standard, priority, vip
  
  -- Status
  status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Day-of tracking
  crew_departed_at TIMESTAMPTZ,
  crew_arrived_at TIMESTAMPTZ,
  loading_started_at TIMESTAMPTZ,
  loading_completed_at TIMESTAMPTZ,
  unloading_started_at TIMESTAMPTZ,
  unloading_completed_at TIMESTAMPTZ,
  
  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  completion_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route optimizations
CREATE TABLE IF NOT EXISTS route_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_date DATE NOT NULL,
  crew_id UUID REFERENCES crews(id),
  
  -- Route details
  stops JSONB NOT NULL, -- [{job_id, order, address, eta, duration}]
  total_distance_km NUMERIC(6,1),
  total_duration_minutes INTEGER,
  
  -- Optimization metrics
  distance_saved_km NUMERIC(6,1),
  time_saved_minutes INTEGER,
  
  -- Traffic considerations
  traffic_data_used BOOLEAN DEFAULT false,
  optimization_algorithm TEXT DEFAULT 'greedy',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Day-of updates sent to customers
CREATE TABLE IF NOT EXISTS customer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scheduled_jobs(id),
  
  update_type TEXT NOT NULL, -- confirmation, reminder, eta, started, progress, delayed, completed
  channel TEXT NOT NULL, -- sms, email, both
  
  message TEXT NOT NULL,
  
  -- Delivery status
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  
  -- For ETA updates
  eta_time TIMESTAMPTZ,
  eta_window_minutes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contingency events
CREATE TABLE IF NOT EXISTS contingency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scheduled_jobs(id),
  
  event_type TEXT NOT NULL, -- weather, traffic, crew_sick, vehicle_breakdown, customer_delay
  severity TEXT NOT NULL, -- minor, moderate, major
  
  description TEXT,
  
  -- Impact
  delay_minutes INTEGER,
  jobs_affected JSONB DEFAULT '[]',
  
  -- Resolution
  resolution_action TEXT, -- reschedule, backup_crew, backup_vehicle, delay_notification
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, resolved, escalated
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capacity planning
CREATE TABLE IF NOT EXISTS capacity_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  
  -- Capacity
  total_crew_hours INTEGER DEFAULT 40, -- e.g., 5 crews x 8 hours
  booked_crew_hours INTEGER DEFAULT 0,
  available_crew_hours INTEGER GENERATED ALWAYS AS (total_crew_hours - booked_crew_hours) STORED,
  
  -- Vehicle capacity
  trucks_available INTEGER DEFAULT 5,
  trucks_booked INTEGER DEFAULT 0,
  vans_available INTEGER DEFAULT 3,
  vans_booked INTEGER DEFAULT 0,
  
  -- Status
  is_blocked BOOLEAN DEFAULT false, -- holiday, maintenance day
  block_reason TEXT,
  
  -- Jobs scheduled
  jobs_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(slot_date)
);

-- RLS Policies
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contingency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_slots ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to crews" ON crews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to scheduled_jobs" ON scheduled_jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to route_optimizations" ON route_optimizations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to customer_updates" ON customer_updates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to contingency_events" ON contingency_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to capacity_slots" ON capacity_slots FOR ALL USING (auth.role() = 'service_role');

-- Authenticated read access
CREATE POLICY "Authenticated read crews" ON crews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read scheduled_jobs" ON scheduled_jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read route_optimizations" ON route_optimizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read customer_updates" ON customer_updates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read contingency_events" ON contingency_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read capacity_slots" ON capacity_slots FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_date ON scheduled_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_crew ON scheduled_jobs(assigned_crew_id);
CREATE INDEX IF NOT EXISTS idx_capacity_slots_date ON capacity_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_contingency_events_status ON contingency_events(status);
CREATE INDEX IF NOT EXISTS idx_crews_status ON crews(status);
