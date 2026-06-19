-- Expenses / Control de Gastos table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'insumos',
  supplier TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'efectivo',
  photo_url TEXT,
  ocr_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated users can read all expenses, insert/update their own
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read expenses" ON expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert expenses" ON expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update expenses" ON expenses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete expenses" ON expenses
  FOR DELETE TO authenticated USING (true);

-- Storage bucket for receipt photos
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload receipts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can view receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');
