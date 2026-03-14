-- Support Tickets Table for Sentinel Agent
-- This table stores customer support tickets created by the Sentinel agent

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  
  -- Customer information
  customer_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Ticket details
  category TEXT NOT NULL CHECK (category IN ('inquiry', 'booking', 'complaint', 'damage', 'refund', 'billing', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Related booking
  booking_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Assignment
  assigned_agent TEXT DEFAULT 'SENTINEL_CS',
  escalated_to TEXT,
  escalation_reason TEXT,
  
  -- Resolution
  resolution TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('resolved', 'refunded', 'compensated', 'escalated', 'no_action', 'duplicate')),
  
  -- Follow-up
  follow_up_date TIMESTAMPTZ,
  follow_up_channel TEXT CHECK (follow_up_channel IN ('email', 'phone', 'sms')),
  follow_up_notes TEXT,
  
  -- CSAT
  csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 5),
  csat_feedback TEXT,
  
  -- Compensation tracking
  compensation_type TEXT CHECK (compensation_type IN ('discount', 'refund', 'credit', 'service', 'none')),
  compensation_amount NUMERIC(10,2) DEFAULT 0,
  compensation_approved BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  conversation_id TEXT,
  tags TEXT[],
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Create ticket_messages table for conversation history
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_name TEXT,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_users table for role-based access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'agent', 'manager', 'admin')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_booking_id ON support_tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Service role full access to support_tickets" ON support_tickets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read support_tickets" ON support_tickets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create support_tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Authenticated users can update support_tickets" ON support_tickets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for ticket_messages
CREATE POLICY "Service role full access to ticket_messages" ON ticket_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read ticket_messages" ON ticket_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can create ticket_messages" ON ticket_messages
  FOR INSERT WITH CHECK (true);

-- RLS Policies for admin_users
CREATE POLICY "Service role full access to admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own admin record" ON admin_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid() 
      AND au.role IN ('admin', 'manager')
    )
  );

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(NEXTVAL('ticket_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- Create trigger for auto-generating ticket numbers
DROP TRIGGER IF EXISTS set_ticket_number ON support_tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();
