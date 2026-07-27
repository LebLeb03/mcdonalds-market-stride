
-- 1. Manager authority no longer trusts self-editable profiles.role/store_id
CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    public.has_role(auth.uid(), 'market_admin')
    OR EXISTS (SELECT 1 FROM public.manager_store_assignments m WHERE m.user_id = auth.uid() AND m.store_id = _store_id);
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('manager','general_manager','market_admin')
  );
$$;

-- 2. Lock privileged profile columns against self-service edits
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
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
END; $$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- 3. Secure join-by-code flow (always assigns crew)
CREATE OR REPLACE FUNCTION public.join_store_with_code(_code text, _full_name text DEFAULT NULL, _job_title text DEFAULT NULL)
RETURNS TABLE (store_id uuid, store_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, market_id, stores.store_name INTO s
  FROM public.stores
  WHERE upper(invitation_code) = upper(btrim(_code)) AND is_active
  LIMIT 1;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Invalid store code'; END IF;

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

  store_id := s.id; store_name := s.store_name; RETURN NEXT;
END; $$;

-- 4. Invitation codes: managers only
CREATE OR REPLACE FUNCTION public.get_store_invitation_code(_store_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN public.can_manage_store(_store_id)
    THEN (SELECT invitation_code FROM public.stores WHERE id = _store_id)
    ELSE NULL END;
$$;

DROP POLICY IF EXISTS stores_read ON public.stores;
CREATE POLICY stores_read ON public.stores FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.stores FROM authenticated;
GRANT SELECT (id, market_id, store_name, store_number, city, province, store_image_url, is_active, created_at) ON public.stores TO authenticated;

-- 5. Market-scoped reads
DROP POLICY IF EXISTS cp_read ON public.challenge_participants;
CREATE POLICY cp_read ON public.challenge_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.market_id = public.current_market_id())
);

DROP POLICY IF EXISTS challenge_stores_read ON public.challenge_stores;
CREATE POLICY challenge_stores_read ON public.challenge_stores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.market_id = public.current_market_id()));

DROP POLICY IF EXISTS msa_read ON public.manager_store_assignments;
CREATE POLICY msa_read ON public.manager_store_assignments FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.market_id = public.current_market_id())
);

DROP POLICY IF EXISTS reactions_read ON public.reactions;
CREATE POLICY reactions_read ON public.reactions FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR target_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = reactions.user_id AND p.market_id = public.current_market_id())
);

DROP POLICY IF EXISTS sa_read ON public.store_achievements;
CREATE POLICY sa_read ON public.store_achievements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.market_id = public.current_market_id()));

DROP POLICY IF EXISTS ua_read ON public.user_achievements;
CREATE POLICY ua_read ON public.user_achievements FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = user_achievements.user_id AND p.market_id = public.current_market_id())
);

-- 6. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_store(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_store_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_market_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_store_with_code(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_store_invitation_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_market_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_store_with_code(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_invitation_code(uuid) TO authenticated;

-- trigger-only functions must never be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_step_entry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_step_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon, authenticated;
