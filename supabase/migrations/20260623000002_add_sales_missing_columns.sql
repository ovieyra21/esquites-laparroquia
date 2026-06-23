-- Add missing columns to sales table needed by corte, historial, and cancel features
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completada';
