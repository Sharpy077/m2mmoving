-- Migration: Add automation tables for Phases 2-5
-- Campaign engine, pipeline management, customer service, operations

-- =============================================================================
-- PHASE 2: Lead enhancements + Campaign Engine
-- =============================================================================

-- UTM tracking and lead scoring on leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMPTZ;

-- Phase 3: Pipeline and pricing columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS payment_plan VARCHAR(20) DEFAULT 'standard';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deal_stage VARCHAR(50);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS days_in_stage INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS win_loss_reason VARCHAR(255);

-- Email/SMS sequence system
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'both')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  subject VARCHAR(500),
  body_html TEXT,
  body_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_number)
);

CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  next_send_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(lead_id, sequence_id)
);

CREATE TABLE IF NOT EXISTS public.sequence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.sequence_enrollments(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing content table for Aurora
CREATE TABLE IF NOT EXISTS public.marketing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('blog_post', 'social_post', 'email_template', 'newsletter', 'ad_copy')),
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform VARCHAR(100),
  agent_codename VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PHASE 3: Sales Pipeline
-- =============================================================================

-- Pricing decisions for Prism agent
CREATE TABLE IF NOT EXISTS public.pricing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  base_price DECIMAL(10, 2) NOT NULL,
  adjusted_price DECIMAL(10, 2) NOT NULL,
  adjustment_reason TEXT,
  demand_factor DECIMAL(4, 2) DEFAULT 1.00,
  competitor_factor DECIMAL(4, 2) DEFAULT 1.00,
  season_factor DECIMAL(4, 2) DEFAULT 1.00,
  agent_codename VARCHAR(50) DEFAULT 'PRISM_PRICE',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment installments
CREATE TABLE IF NOT EXISTS public.payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, installment_number)
);

-- =============================================================================
-- PHASE 4: Customer Service
-- =============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  auth_user_id UUID,
  nps_score INTEGER,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'churned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support tickets for Sentinel
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  lead_id UUID,
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('booking', 'billing', 'damage', 'complaint', 'general', 'reschedule', 'cancellation')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to VARCHAR(100),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  agent_codename VARCHAR(50) DEFAULT 'SENTINEL_CS',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback collection
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  lead_id UUID,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  feedback_text TEXT,
  feedback_type VARCHAR(50) DEFAULT 'post_move' CHECK (feedback_type IN ('post_move', 'mid_move', 'service', 'general')),
  review_requested BOOLEAN DEFAULT false,
  review_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Move reminders
CREATE TABLE IF NOT EXISTS public.move_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('booking_confirmation', 'week_before', 'day_before', 'day_of', 'post_move_feedback', 'post_move_review', 'quote_expiring')),
  channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'both')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PHASE 5: Operations & Intelligence
-- =============================================================================

-- Crews for Nexus
CREATE TABLE IF NOT EXISTS public.crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'on_break', 'off_duty')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('driver', 'mover', 'lead', 'supervisor')),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jobs for scheduling
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  crew_id UUID REFERENCES public.crews(id),
  vehicle_ids JSONB DEFAULT '[]',
  scheduled_date DATE NOT NULL,
  start_time TIME,
  estimated_duration_hours DECIMAL(4, 1),
  origin_address TEXT,
  destination_address TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent insights for Oracle
CREATE TABLE IF NOT EXISTS public.agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_codename VARCHAR(50) NOT NULL,
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('trend', 'anomaly', 'recommendation', 'forecast', 'win_loss_analysis')),
  title VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'positive')),
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_send ON public.sequence_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead ON public.sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_events_enrollment ON public.sequence_events(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_deal_stage ON public.leads(deal_stage);
CREATE INDEX IF NOT EXISTS idx_leads_quote_expires ON public.leads(quote_expires_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON public.jobs(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_move_reminders_scheduled ON public.move_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_insights_type ON public.agent_insights(insight_type, created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON public.marketing_content(status, content_type);
