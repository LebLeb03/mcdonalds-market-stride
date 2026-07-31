CREATE OR REPLACE FUNCTION public.admin_set_store_code(_store_id uuid, _code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE c text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'market_admin') THEN
    RAISE EXCEPTION 'Only market administrators can change join codes';
  END IF;
  c := upper(btrim(_code));
  IF c !~ '^[A-Z0-9]{4,12}$' THEN
    RAISE EXCEPTION 'Code must be 4-12 letters or numbers';
  END IF;
  IF EXISTS (SELECT 1 FROM public.stores s WHERE upper(s.invitation_code) = c AND s.id <> _store_id) THEN
    RAISE EXCEPTION 'That code is already used by another restaurant';
  END IF;
  UPDATE public.stores SET invitation_code = c WHERE id = _store_id;
  RETURN c;
END; $$;

REVOKE ALL ON FUNCTION public.admin_set_store_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_store_code(uuid, text) TO authenticated;