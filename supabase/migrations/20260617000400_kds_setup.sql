
-- Add KDS status to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS kds_status TEXT DEFAULT 'pendiente';
-- pendiete, preparando, listo, entregado

-- Enable realtime for sales table
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
