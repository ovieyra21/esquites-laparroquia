-- Fix folio column: POS generates text folios like "LP-DEV-0001"
-- If it's currently INTEGER, convert to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'folio' AND data_type = 'integer'
  ) THEN
    ALTER TABLE sales ALTER COLUMN folio TYPE TEXT;
  END IF;
END $$;
