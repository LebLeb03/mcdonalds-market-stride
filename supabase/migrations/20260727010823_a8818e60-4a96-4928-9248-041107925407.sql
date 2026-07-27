CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'market_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'market_admin'));

CREATE OR REPLACE FUNCTION public.admin_set_member_access(
  _user_id uuid,
  _role app_role,
  _store_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'market_admin') THEN
    RAISE EXCEPTION 'Only market administrators can change access';
  END IF;

  SELECT market_id INTO m FROM public.stores WHERE id = _store_id;

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
END; $$;

REVOKE ALL ON FUNCTION public.admin_set_member_access(uuid, app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_member_access(uuid, app_role, uuid) TO authenticated;