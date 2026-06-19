-- Migration: Add payment tracking columns to sales table
-- Run this in Supabase SQL Editor

-- Add columns for tracking Mercado Pago / digital payments
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS payment_details jsonb;

COMMENT ON COLUMN sales.payment_id IS 'Mercado Pago payment ID or other gateway reference';
COMMENT ON COLUMN sales.payment_status IS 'Payment status: pending, approved, rejected, etc.';
COMMENT ON COLUMN sales.payment_details IS 'Full payment payload from gateway (method, amount, payer, etc.)';

-- Create index for webhook lookups by payment_id
CREATE INDEX IF NOT EXISTS idx_sales_payment_id ON sales(payment_id);
