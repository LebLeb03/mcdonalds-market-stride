
CREATE OR REPLACE FUNCTION public.admin_create_store(
  _store_name text,
  _store_number text,
  _city text DEFAULT NULL,
  _province text DEFAULT NULL
) RETURNS TABLE(id uuid, invitation_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m uuid; code text; new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'market_admin') THEN
    RAISE EXCEPTION 'Only market administrators can create restaurants';
  END IF;
  IF COALESCE(btrim(_store_name),'') = '' OR COALESCE(btrim(_store_number),'') = '' THEN
    RAISE EXCEPTION 'Restaurant name and number are required';
  END IF;

  SELECT market_id INTO m FROM public.profiles WHERE user_id = auth.uid();
  IF m IS NULL THEN SELECT mk.id INTO m FROM public.markets mk ORDER BY mk.created_at LIMIT 1; END IF;
  IF m IS NULL THEN RAISE EXCEPTION 'No market found'; END IF;

  LOOP
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.invitation_code = code);
  END LOOP;

  INSERT INTO public.stores (market_id, store_name, store_number, city, province, invitation_code, is_active)
  VALUES (m, btrim(_store_name), btrim(_store_number), NULLIF(btrim(_city),''), NULLIF(btrim(_province),''), code, true)
  RETURNING stores.id INTO new_id;

  id := new_id; invitation_code := code; RETURN NEXT;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_store(_store_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'market_admin') THEN
    RAISE EXCEPTION 'Only market administrators can delete restaurants';
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  DELETE FROM public.manager_store_assignments WHERE store_id = _store_id;
  DELETE FROM public.challenge_stores WHERE store_id = _store_id;
  DELETE FROM public.store_achievements WHERE store_id = _store_id;
  UPDATE public.challenge_participants SET store_id = NULL WHERE store_id = _store_id;
  UPDATE public.step_entries SET store_id = NULL WHERE store_id = _store_id;
  UPDATE public.user_achievements SET store_id = NULL WHERE store_id = _store_id;
  UPDATE public.announcements SET store_id = NULL WHERE store_id = _store_id;
  UPDATE public.audit_logs SET store_id = NULL WHERE store_id = _store_id;
  UPDATE public.profiles SET store_id = NULL WHERE store_id = _store_id;
  DELETE FROM public.stores WHERE id = _store_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END; $$;

REVOKE ALL ON FUNCTION public.admin_create_store(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_store(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_store(uuid) TO authenticated;
