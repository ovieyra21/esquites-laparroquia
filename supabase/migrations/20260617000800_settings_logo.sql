-- Agregar soporte para logo en tickets
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_data TEXT, -- Almacena el bitmap procesado (JSON stringificado)
  ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT false;
