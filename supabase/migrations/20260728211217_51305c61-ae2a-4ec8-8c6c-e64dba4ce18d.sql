
-- 1) Profile role escalation: (re)attach protective triggers
DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

DROP TRIGGER IF EXISTS handle_new_user_trg ON auth.users;

DROP TRIGGER IF EXISTS validate_step_entry_trg ON public.step_entries;
CREATE TRIGGER validate_step_entry_trg
BEFORE INSERT OR UPDATE ON public.step_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_step_entry();

DROP TRIGGER IF EXISTS audit_step_approval_trg ON public.step_entries;
CREATE TRIGGER audit_step_approval_trg
BEFORE UPDATE ON public.step_entries
FOR EACH ROW EXECUTE FUNCTION public.audit_step_approval();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- also block self-service role/store changes at the policy level
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND store_id IS NOT DISTINCT FROM (SELECT p.store_id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND market_id IS NOT DISTINCT FROM (SELECT p.market_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 2) stores.invitation_code column-level exposure
REVOKE SELECT ON public.stores FROM anon, authenticated;
GRANT SELECT (id, market_id, store_name, store_number, city, province, store_image_url, is_active, created_at)
  ON public.stores TO authenticated;

-- 3) challenge_participants: self, same store, or managers
DROP POLICY IF EXISTS cp_read ON public.challenge_participants;
CREATE POLICY cp_read ON public.challenge_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (store_id IS NOT NULL AND store_id = public.current_store_id())
  OR public.is_manager()
);

-- 4) manager_store_assignments: self or managers
DROP POLICY IF EXISTS msa_read ON public.manager_store_assignments;
CREATE POLICY msa_read ON public.manager_store_assignments
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_manager());

-- 5) reactions: only sender/recipient
DROP POLICY IF EXISTS reactions_read ON public.reactions;
CREATE POLICY reactions_read ON public.reactions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR target_user_id = auth.uid());

-- 6) user_achievements: self, same store, or managers
DROP POLICY IF EXISTS ua_read ON public.user_achievements;
CREATE POLICY ua_read ON public.user_achievements
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (store_id IS NOT NULL AND store_id = public.current_store_id())
  OR public.is_manager()
);

-- 7) SECURITY DEFINER functions callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_manager() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_store(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_store_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_market_id() FROM PUBLIC, anon, authenticated;
-- intentionally callable by signed-in users (app RPCs with in-function checks)
GRANT EXECUTE ON FUNCTION public.get_store_invitation_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_store_with_code(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_access(uuid, public.app_role, uuid) TO authenticated;
