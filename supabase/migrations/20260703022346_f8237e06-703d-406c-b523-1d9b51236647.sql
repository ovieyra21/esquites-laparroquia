CREATE OR REPLACE FUNCTION public.get_print_settings()
RETURNS TABLE (
  business_name character varying,
  slogan character varying,
  address text,
  phone character varying,
  footer_message text,
  tax numeric,
  printer_enabled boolean,
  printer_ip text,
  printer_port integer,
  printer_width integer,
  auto_print boolean,
  auto_cut boolean,
  open_drawer boolean,
  show_logo boolean,
  print_mode text,
  proxy_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_name, slogan, address, phone, footer_message, tax,
         printer_enabled, printer_ip, printer_port, printer_width,
         auto_print, auto_cut, open_drawer, show_logo, print_mode, proxy_url
  FROM public.settings
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_print_settings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_print_settings() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_print_settings() TO authenticated;