-- Add payment tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));
