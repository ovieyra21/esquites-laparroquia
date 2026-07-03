ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS print_mode text NOT NULL DEFAULT 'proxy',
  ADD COLUMN IF NOT EXISTS proxy_url text NOT NULL DEFAULT 'http://localhost:3128';