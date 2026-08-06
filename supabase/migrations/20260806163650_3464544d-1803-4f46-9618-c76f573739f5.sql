CREATE TYPE public.app_role AS ENUM ('guest','creator','brand','agency','admin');
CREATE TYPE public.platform AS ENUM ('instagram','tiktok');
CREATE TYPE public.plan_tier AS ENUM ('free','creator','creator_pro','agency','enterprise');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT,
  biography TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  followers BIGINT NOT NULL DEFAULT 0,
  following BIGINT NOT NULL DEFAULT 0,
  posts_count BIGINT NOT NULL DEFAULT 0,
  avg_likes NUMERIC NOT NULL DEFAULT 0,
  avg_comments NUMERIC NOT NULL DEFAULT 0,
  avg_views NUMERIC NOT NULL DEFAULT 0,
  engagement_rate NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  country TEXT,
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw JSONB,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, username)
);
GRANT SELECT ON public.creators TO anon, authenticated;
GRANT ALL ON public.creators TO service_role;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators are public" ON public.creators FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER creators_updated BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.creator_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  caption TEXT,
  url TEXT,
  thumbnail_url TEXT,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  views BIGINT NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, external_id)
);
GRANT SELECT ON public.creator_posts TO anon, authenticated;
GRANT ALL ON public.creator_posts TO service_role;
ALTER TABLE public.creator_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator posts are public" ON public.creator_posts FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  brand_score NUMERIC NOT NULL DEFAULT 0,
  engagement_score NUMERIC NOT NULL DEFAULT 0,
  accessibility_score NUMERIC NOT NULL DEFAULT 0,
  growth_score NUMERIC NOT NULL DEFAULT 0,
  summaries JSONB NOT NULL DEFAULT '{}'::jsonb,
  premium JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports are public" ON public.reports FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX reports_creator_idx ON public.reports (creator_id, created_at DESC);

CREATE TABLE public.benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.platform NOT NULL,
  category TEXT,
  country TEXT,
  follower_bucket TEXT,
  sample_size INTEGER NOT NULL DEFAULT 0,
  avg_engagement_rate NUMERIC NOT NULL DEFAULT 0,
  p75_engagement_rate NUMERIC NOT NULL DEFAULT 0,
  p90_engagement_rate NUMERIC NOT NULL DEFAULT 0,
  avg_overall_score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benchmarks TO anon, authenticated;
GRANT ALL ON public.benchmarks TO service_role;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benchmarks are public" ON public.benchmarks FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.saved_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_creators TO authenticated;
GRANT ALL ON public.saved_creators TO service_role;
ALTER TABLE public.saved_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved creators" ON public.saved_creators FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.platform NOT NULL,
  username TEXT NOT NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own search history" ON public.search_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);