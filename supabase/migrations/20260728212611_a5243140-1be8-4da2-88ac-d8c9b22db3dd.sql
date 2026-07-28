GRANT EXECUTE ON FUNCTION public.current_market_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_invitation_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_store_with_code(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_access(uuid, public.app_role, uuid) TO authenticated;