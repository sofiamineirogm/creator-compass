CREATE TYPE public.social_connection_type AS ENUM ('public_handle', 'oauth');

CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  platform public.platform NOT NULL,
  handle text NOT NULL,
  platform_user_id text,
  profile_url text,
  connection_type public.social_connection_type NOT NULL DEFAULT 'public_handle',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_profile_id, platform)
);

CREATE INDEX social_accounts_profile_idx ON public.social_accounts(creator_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_accounts TO authenticated;
GRANT SELECT ON public.social_accounts TO anon;
GRANT ALL ON public.social_accounts TO service_role;

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_creator_profile(_profile_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.creator_profiles p WHERE p.id = _profile_id AND p.user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION public.owns_creator_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_creator_profile(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "creators manage own social accounts"
  ON public.social_accounts FOR ALL TO authenticated
  USING (public.owns_creator_profile(creator_profile_id, auth.uid()))
  WITH CHECK (public.owns_creator_profile(creator_profile_id, auth.uid()));

CREATE POLICY "published creator social accounts are viewable"
  ON public.social_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.creator_profiles p WHERE p.id = creator_profile_id AND p.is_published));

CREATE TRIGGER social_accounts_updated BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();