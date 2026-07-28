CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.bypass_profile_guard', true) = 'on' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'market_admin') THEN RETURN NEW; END IF;
  IF NEW.user_id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.store_id IS DISTINCT FROM OLD.store_id
       OR NEW.market_id IS DISTINCT FROM OLD.market_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'You cannot change your own role, restaurant or market';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.join_store_with_code(_code text, _full_name text DEFAULT NULL::text, _job_title text DEFAULT NULL::text)
RETURNS TABLE(store_id uuid, store_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE s record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, market_id, stores.store_name INTO s
  FROM public.stores
  WHERE upper(invitation_code) = upper(btrim(_code)) AND is_active
  LIMIT 1;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Invalid store code'; END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles p SET
    store_id = s.id,
    market_id = s.market_id,
    role = 'crew',
    full_name = COALESCE(NULLIF(btrim(_full_name), ''), p.full_name),
    job_title = COALESCE(NULLIF(btrim(_job_title), ''), p.job_title),
    participates_in_challenges = true
  WHERE p.user_id = auth.uid();

  DELETE FROM public.user_roles WHERE user_id = auth.uid() AND role <> 'crew';
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'crew') ON CONFLICT DO NOTHING;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  store_id := s.id; store_name := s.store_name; RETURN NEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_set_member_access(_user_id uuid, _role app_role, _store_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE m uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'market_admin') THEN
    RAISE EXCEPTION 'Only market administrators can change access';
  END IF;

  SELECT market_id INTO m FROM public.stores WHERE id = _store_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles p
     SET role = _role,
         store_id = COALESCE(_store_id, p.store_id),
         market_id = COALESCE(m, p.market_id)
   WHERE p.user_id = _user_id;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT DO NOTHING;

  DELETE FROM public.manager_store_assignments WHERE user_id = _user_id;
  IF _role IN ('manager','general_manager') AND _store_id IS NOT NULL THEN
    INSERT INTO public.manager_store_assignments (user_id, store_id)
      VALUES (_user_id, _store_id) ON CONFLICT DO NOTHING;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END; $function$;