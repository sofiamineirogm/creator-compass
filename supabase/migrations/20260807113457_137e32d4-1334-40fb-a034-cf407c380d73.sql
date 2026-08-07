-- ============ enums ============
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'brand';

CREATE TYPE public.campaign_status AS ENUM ('draft','open','closed','completed','archived');
CREATE TYPE public.application_status AS ENUM ('applied','shortlisted','negotiation','accepted','rejected','completed','withdrawn');
CREATE TYPE public.payment_model AS ENUM ('fixed','per_deliverable','per_post','gifted','commission','hybrid');
CREATE TYPE public.campaign_location_type AS ENUM ('remote','in_person','hybrid');
CREATE TYPE public.cache_fetch_status AS ENUM ('pending','success','error');

-- ============ creator marketplace profiles ============
CREATE TABLE public.creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  handle text UNIQUE,
  avatar_url text,
  headline text,
  bio text,
  location text,
  languages text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  instagram_username text,
  tiktok_username text,
  portfolio jsonb NOT NULL DEFAULT '[]'::jsonb,
  past_collaborations jsonb NOT NULL DEFAULT '[]'::jsonb,
  starting_price numeric NOT NULL DEFAULT 0,
  max_price numeric,
  currency text NOT NULL DEFAULT 'USD',
  availability text NOT NULL DEFAULT 'open',
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  is_boosted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_profiles TO authenticated;
GRANT SELECT ON public.creator_profiles TO anon;
GRANT ALL ON public.creator_profiles TO service_role;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published creator profiles are viewable" ON public.creator_profiles FOR SELECT USING (is_published OR auth.uid() = user_id);
CREATE POLICY "creators manage own profile" ON public.creator_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER creator_profiles_updated BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ brand profiles ============
CREATE TABLE public.brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  logo_url text,
  description text,
  website text,
  industry text,
  location text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_profiles TO authenticated;
GRANT SELECT ON public.brand_profiles TO anon;
GRANT ALL ON public.brand_profiles TO service_role;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand profiles are public" ON public.brand_profiles FOR SELECT USING (true);
CREATE POLICY "brands manage own profile" ON public.brand_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER brand_profiles_updated BEFORE UPDATE ON public.brand_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ campaigns ============
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_profile_id uuid REFERENCES public.brand_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  objectives text[] NOT NULL DEFAULT '{}',
  target_audience text,
  expected_content text,
  category text,
  platforms text[] NOT NULL DEFAULT '{}',
  deliverables text[] NOT NULL DEFAULT '{}',
  budget_min numeric NOT NULL DEFAULT 0,
  budget_max numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_model public.payment_model NOT NULL DEFAULT 'fixed',
  location text,
  location_type public.campaign_location_type NOT NULL DEFAULT 'remote',
  languages text[] NOT NULL DEFAULT '{}',
  min_followers bigint NOT NULL DEFAULT 0,
  max_followers bigint,
  min_engagement_rate numeric NOT NULL DEFAULT 0,
  creator_categories text[] NOT NULL DEFAULT '{}',
  audience_requirements text,
  application_deadline timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  creators_needed integer NOT NULL DEFAULT 1,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  applicants_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_status_idx ON public.campaigns (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT ON public.campaigns TO anon;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open campaigns are viewable" ON public.campaigns FOR SELECT USING (status <> 'draft' OR auth.uid() = brand_user_id);
CREATE POLICY "brands manage own campaigns" ON public.campaigns FOR ALL TO authenticated USING (auth.uid() = brand_user_id) WITH CHECK (auth.uid() = brand_user_id);
CREATE TRIGGER campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_campaign(_campaign_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = _campaign_id AND c.brand_user_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.owns_campaign(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_campaign(uuid, uuid) TO authenticated, service_role;

-- ============ applications ============
CREATE TABLE public.campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  cover_message text NOT NULL DEFAULT '',
  proposed_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  availability text,
  portfolio_examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.application_status NOT NULL DEFAULT 'applied',
  brand_note text,
  is_invitation boolean NOT NULL DEFAULT false,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_applications TO authenticated;
GRANT ALL ON public.campaign_applications TO service_role;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators read own applications" ON public.campaign_applications FOR SELECT TO authenticated USING (auth.uid() = creator_user_id OR public.owns_campaign(campaign_id, auth.uid()));
CREATE POLICY "creators create own applications" ON public.campaign_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "creators update own applications" ON public.campaign_applications FOR UPDATE TO authenticated USING (auth.uid() = creator_user_id) WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "brands update applications to their campaigns" ON public.campaign_applications FOR UPDATE TO authenticated USING (public.owns_campaign(campaign_id, auth.uid())) WITH CHECK (public.owns_campaign(campaign_id, auth.uid()));
CREATE POLICY "brands invite creators" ON public.campaign_applications FOR INSERT TO authenticated WITH CHECK (public.owns_campaign(campaign_id, auth.uid()) AND is_invitation);
CREATE POLICY "creators delete own applications" ON public.campaign_applications FOR DELETE TO authenticated USING (auth.uid() = creator_user_id);
CREATE TRIGGER campaign_applications_updated BEFORE UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_applicants_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.campaigns SET applicants_count = applicants_count + 1 WHERE id = NEW.campaign_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.campaigns SET applicants_count = GREATEST(applicants_count - 1, 0) WHERE id = OLD.campaign_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER campaign_applications_count AFTER INSERT OR DELETE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION public.sync_applicants_count();

-- ============ saved campaigns ============
CREATE TABLE public.saved_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_campaigns TO authenticated;
GRANT ALL ON public.saved_campaigns TO service_role;
ALTER TABLE public.saved_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved campaigns" ON public.saved_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ conversations ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.campaign_applications(id) ON DELETE SET NULL,
  brand_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, brand_user_id, creator_user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (brand_user_id, creator_user_id));
CREATE POLICY "participants create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (brand_user_id, creator_user_id));
CREATE POLICY "participants update conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IN (brand_user_id, creator_user_id)) WITH CHECK (auth.uid() IN (brand_user_id, creator_user_id));
CREATE TRIGGER conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.in_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = _conversation_id AND _user_id IN (c.brand_user_id, c.creator_user_id))
$$;
REVOKE ALL ON FUNCTION public.in_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.in_conversation(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated USING (public.in_conversation(conversation_id, auth.uid()));
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_user_id AND public.in_conversation(conversation_id, auth.uid()));
CREATE POLICY "participants mark messages read" ON public.messages FOR UPDATE TO authenticated USING (public.in_conversation(conversation_id, auth.uid())) WITH CHECK (public.in_conversation(conversation_id, auth.uid()));

-- ============ social profile cache (server-only) ============
CREATE TABLE public.social_profile_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform NOT NULL,
  username text NOT NULL,
  profile_url text,
  profile_data jsonb,
  analytics_data jsonb,
  fetch_status public.cache_fetch_status NOT NULL DEFAULT 'pending',
  fetch_error text,
  last_fetched_at timestamptz,
  expires_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, username)
);
GRANT ALL ON public.social_profile_cache TO service_role;
ALTER TABLE public.social_profile_cache ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER social_profile_cache_updated BEFORE UPDATE ON public.social_profile_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();