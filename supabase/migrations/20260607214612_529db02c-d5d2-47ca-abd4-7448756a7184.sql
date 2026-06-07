
-- Revoke from PUBLIC (default grantee) for all SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Drop avatar SELECT policy entirely; public bucket URLs still serve via CDN
DROP POLICY IF EXISTS "Authenticated can read avatars" ON storage.objects;
