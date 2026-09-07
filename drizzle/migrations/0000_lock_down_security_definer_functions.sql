-- Trigger-only functions: no client should call them directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.practice_feedback_set_passed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_certificate_number() FROM PUBLIC, anon, authenticated;

-- Signed-in only helpers: never anonymous
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.find_student_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_student_by_email(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated, service_role;