
REVOKE EXECUTE ON FUNCTION public.bump_voice_room_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_inactive_voice_rooms() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pulse_requests() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_partner_checkin_streak(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_beta_key(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_presence() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_beta_key(text) FROM PUBLIC;

-- Re-grant only the user-facing ones
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_checkin_streak(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_beta_key(text) TO anon;
