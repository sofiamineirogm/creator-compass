REVOKE ALL ON FUNCTION public.sync_applicants_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_applicants_count() TO service_role;