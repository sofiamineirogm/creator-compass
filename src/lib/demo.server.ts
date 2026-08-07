/**
 * Demo environment provisioning. Server-only.
 * Creates deterministic test users in Supabase Auth, assigns roles + plans,
 * and seeds a realistic marketplace world. Everything here is gated by
 * DEMO_MODE and never runs when the flag is off.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Role } from "./entitlements";

type Row = Record<string, any>;
type Db = SupabaseClient<any, any, any>;

export interface DemoAccountSpec {
  key: string;
  label: string;
  email: string;
  password: string;
  displayName: string;
  role: Role;
  plan: Plan;
}

/** Clearly identifiable demo social handle — never a real creator account. */
export const DEMO_INSTAGRAM_HANDLE = "ato.gastro";

/** Passwords live server-side only — they are never bundled into the client. */
export const DEMO_ACCOUNTS: DemoAccountSpec[] = [
  {
    key: "free_creator",
    label: "Free Creator",
    email: "demo.creator@creatoriq.test",
    password: "DemoCreator123!",
    displayName: "Demo Free Creator",
    role: "creator",
    plan: "free",
  },
  {
    key: "pro_creator",
    label: "Pro Creator",
    email: "demo.pro@creatoriq.test",
    password: "DemoPro123!",
    displayName: "Demo Pro Creator",
    role: "creator",
    plan: "creator_pro",
  },
  {
    key: "brand",
    label: "Brand",
    email: "demo.brand@creatoriq.test",
    password: "DemoBrand123!",
    displayName: "Demo Brand",
    role: "brand",
    plan: "brand",
  },
  {
    key: "agency",
    label: "Agency",
    email: "demo.agency@creatoriq.test",
    password: "DemoAgency123!",
    displayName: "Demo Agency",
    role: "agency",
    plan: "agency",
  },
];

export function demoEnabled(): boolean {
  return (
    String(process.env["DEMO_MODE"] ?? process.env["VITE_DEMO_MODE"] ?? "").toLowerCase() === "true"
  );
}

export function assertDemoEnabled(): void {
  if (!demoEnabled()) throw new Error("Demo mode is disabled.");
}

async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

async function findUserByEmail(service: Db, email: string): Promise<Row | null> {
  // Auth Admin listUsers is paginated; demo projects stay small, scan a few pages.
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await (service as any).auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = (data?.users ?? []) as Row[];
    const hit = users.find((u) => String(u["email"] ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < 200) return null;
  }
  return null;
}

async function ensureUser(service: Db, spec: DemoAccountSpec): Promise<string> {
  const existing = await findUserByEmail(service, spec.email);
  if (existing) {
    // Keep the known password valid without touching anything else.
    await (service as any).auth.admin.updateUserById(existing["id"], {
      password: spec.password,
      email_confirm: true,
    });
    return existing["id"] as string;
  }

  const { data, error } = await (service as any).auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { display_name: spec.displayName, demo_account: true },
  });
  if (error) throw new Error(error.message);
  return data.user.id as string;
}

async function applyRoleAndPlan(service: Db, userId: string, spec: DemoAccountSpec) {
  await service.from("user_roles").delete().eq("user_id", userId).neq("role", "admin");
  await service.from("user_roles").insert({ user_id: userId, role: spec.role } as never);
  await service.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: spec.plan,
      status: spec.plan === "free" ? "inactive" : "active",
    } as never,
    { onConflict: "user_id" },
  );
  await service.from("profiles").upsert(
    { id: userId, display_name: spec.displayName } as never,
    { onConflict: "id" },
  );
}

export interface DemoAccountStatus {
  key: string;
  label: string;
  email: string;
  role: Role;
  plan: Plan;
  userId: string;
  created: boolean;
}

/** Idempotently creates all demo users with their roles, plans and profiles. */
export async function ensureDemoAccounts(): Promise<DemoAccountStatus[]> {
  assertDemoEnabled();
  const service = await admin();
  const out: DemoAccountStatus[] = [];

  for (const spec of DEMO_ACCOUNTS) {
    const before = await findUserByEmail(service, spec.email);
    const userId = await ensureUser(service, spec);
    await applyRoleAndPlan(service, userId, spec);
    out.push({
      key: spec.key,
      label: spec.label,
      email: spec.email,
      role: spec.role,
      plan: spec.plan,
      userId,
      created: !before,
    });
  }

  await ensureDemoProfiles(service, out);
  return out;
}

async function ensureDemoProfiles(service: Db, accounts: DemoAccountStatus[]) {
  const brand = accounts.find((a) => a.key === "brand");
  const agency = accounts.find((a) => a.key === "agency");
  const creators = accounts.filter((a) => a.role === "creator");

  for (const b of [brand, agency].filter(Boolean) as DemoAccountStatus[]) {
    const { data } = await service
      .from("brand_profiles")
      .select("id")
      .eq("user_id", b.userId)
      .maybeSingle();
    if (!data) {
      await service.from("brand_profiles").insert({
        user_id: b.userId,
        company_name: b.key === "agency" ? "Northlight Agency" : "Aurora Skin Co.",
        description:
          b.key === "agency"
            ? "Independent creator agency managing a roster of 40 lifestyle and fitness talents."
            : "Clean, dermatologist-backed skincare made in small batches.",
        website: b.key === "agency" ? "https://northlight.example" : "https://auroraskin.example",
        industry: b.key === "agency" ? "Agency" : "Beauty",
        location: b.key === "agency" ? "London, UK" : "Austin, TX",
        is_verified: true,
      } as never);
    }
  }

  for (const c of creators) {
    const { data } = await service
      .from("creator_profiles")
      .select("id")
      .eq("user_id", c.userId)
      .maybeSingle();
    if (!data) {
      const pro = c.key === "pro_creator";
      await service.from("creator_profiles").insert({
        user_id: c.userId,
        display_name: pro ? "Maya Okafor" : "Sam Reyes",
        handle: pro ? "mayaokafor" : "samreyes",
        headline: pro ? "Beauty & skincare storyteller" : "Weekend runner sharing honest gear reviews",
        bio: pro
          ? "Long-form skincare reviews with before/after documentation. 6 years of brand work."
          : "Just getting started. Running, coffee and cheap gear that actually works.",
        location: pro ? "Los Angeles, CA" : "Porto, Portugal",
        languages: ["English"],
        categories: pro ? ["Beauty", "Lifestyle"] : ["Fitness"],
        instagram_username: pro ? "mayaokafor" : "samreyes",
        starting_price: pro ? 1200 : 250,
        max_price: pro ? 4500 : 600,
        availability: "open",
        is_verified: pro,
        is_published: true,
        is_boosted: pro,
      } as never);
    }
  }

  // The Pro Creator demo persona ships with a connected (public-handle)
  // Instagram social account so the creator dashboard is populated on login.
  const pro = creators.find((c) => c.key === "pro_creator");
  if (pro) {
    const { data: proProfile } = await service
      .from("creator_profiles")
      .select("id")
      .eq("user_id", pro.userId)
      .maybeSingle();
    const profileId = (proProfile as Row | null)?.["id"];
    if (profileId) {
      const { data: existingAccount } = await service
        .from("social_accounts")
        .select("id")
        .eq("creator_profile_id", profileId)
        .eq("platform", "instagram")
        .maybeSingle();
      // One Instagram account per creator profile: update in place, never duplicate.
      const accountPatch = {
        handle: DEMO_INSTAGRAM_HANDLE,
        profile_url: `https://www.instagram.com/${DEMO_INSTAGRAM_HANDLE}`,
        connection_type: "public_handle",
      };
      if (existingAccount) {
        await service
          .from("social_accounts")
          .update(accountPatch as never)
          .eq("id", (existingAccount as { id: string }).id);
      } else {
        await service.from("social_accounts").insert({
          creator_profile_id: profileId,
          platform: "instagram",
          ...accountPatch,
          connected_at: new Date().toISOString(),
        } as never);
      }
      await service
        .from("creator_profiles")
        .update({ instagram_username: DEMO_INSTAGRAM_HANDLE })
        .eq("id", profileId);
    }
  }
}

/* ------------------------------- sign in ------------------------------ */

/**
 * Signs in a demo account server-side and returns the session tokens so the
 * browser can adopt them. Demo passwords never leave the server otherwise.
 */
export async function demoSignIn(key: string) {
  assertDemoEnabled();
  const spec = DEMO_ACCOUNTS.find((a) => a.key === key);
  if (!spec) throw new Error("Unknown demo account.");

  await ensureDemoAccounts();

  const url = process.env["SUPABASE_URL"]!;
  const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (anonKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${anonKey}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", anonKey);
        return fetch(input as any, { ...init, headers });
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: spec.email,
    password: spec.password,
  });
  if (error || !data.session) throw new Error(error?.message ?? "Demo sign-in failed.");

  return {
    label: spec.label,
    role: spec.role,
    plan: spec.plan,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
}

/* ------------------------------ seed world ---------------------------- */

const DEMO_CAMPAIGNS: Row[] = [
  {
    title: "Spring skincare launch — Reels + Stories",
    description:
      "We are launching a three-step barrier repair routine and need honest, camera-first creators who can show texture and results over two weeks.",
    objectives: ["Product launch", "Awareness"],
    category: "Beauty",
    platforms: ["instagram"],
    deliverables: ["Reel", "Story"],
    budget_min: 800,
    budget_max: 2500,
    payment_model: "per_deliverable",
    location: "United States",
    location_type: "remote",
    min_followers: 10000,
    min_engagement_rate: 2,
    creators_needed: 6,
    status: "open",
  },
  {
    title: "Marathon training series for a running app",
    description:
      "Twelve-week training story arc. We want a creator who is genuinely training and can document the grind.",
    objectives: ["App installs", "Conversions"],
    category: "Fitness",
    platforms: ["instagram", "tiktok"],
    deliverables: ["Reel", "TikTok Video", "Story"],
    budget_min: 1500,
    budget_max: 6000,
    payment_model: "hybrid",
    location: "Remote",
    location_type: "remote",
    min_followers: 25000,
    min_engagement_rate: 3,
    creators_needed: 3,
    status: "open",
  },
  {
    title: "UGC library for a cold brew brand",
    description: "Twenty vertical clips, no posting required. Shot at home, natural light, minimal editing.",
    objectives: ["UGC library"],
    category: "Food",
    platforms: ["tiktok"],
    deliverables: ["UGC"],
    budget_min: 400,
    budget_max: 1200,
    payment_model: "fixed",
    location: "Anywhere",
    location_type: "remote",
    min_followers: 1000,
    min_engagement_rate: 1,
    creators_needed: 10,
    status: "open",
  },
  {
    title: "Berlin sneaker drop — in-person event coverage",
    description:
      "One-night launch event. We need on-the-ground stories, interviews and a recap reel within 48 hours.",
    objectives: ["Event coverage", "Awareness"],
    category: "Fashion",
    platforms: ["instagram"],
    deliverables: ["Story", "Reel"],
    budget_min: 1200,
    budget_max: 3000,
    payment_model: "fixed",
    location: "Berlin, Germany",
    location_type: "in_person",
    min_followers: 50000,
    min_engagement_rate: 2.5,
    creators_needed: 2,
    status: "open",
  },
  {
    title: "Budgeting app: money habits explainer series",
    description: "Educational, non-hyped finance content. Creators must be comfortable talking about real numbers.",
    objectives: ["Conversions", "Awareness"],
    category: "Finance",
    platforms: ["tiktok", "instagram"],
    deliverables: ["TikTok Video", "Carousel"],
    budget_min: 2000,
    budget_max: 8000,
    payment_model: "commission",
    location: "United Kingdom",
    location_type: "remote",
    min_followers: 40000,
    min_engagement_rate: 2,
    creators_needed: 4,
    status: "open",
  },
  {
    title: "Family travel: slow weekend in Lisbon",
    description: "Hotel partnership with a two-night stay covered. Looking for parents who travel with young kids.",
    objectives: ["Awareness"],
    category: "Travel",
    platforms: ["instagram"],
    deliverables: ["Reel", "Post", "Story"],
    budget_min: 900,
    budget_max: 2200,
    payment_model: "hybrid",
    location: "Lisbon, Portugal",
    location_type: "hybrid",
    min_followers: 15000,
    min_engagement_rate: 2.5,
    creators_needed: 2,
    status: "open",
  },
];

/**
 * Seeds demo campaigns (owned by the demo Brand + Agency) plus a few
 * applications and a conversation from the Pro Creator. Idempotent: existing
 * campaigns with the same title are skipped.
 */
export async function seedDemoWorld() {
  assertDemoEnabled();
  const service = await admin();
  const accounts = await ensureDemoAccounts();

  const brand = accounts.find((a) => a.key === "brand")!;
  const agency = accounts.find((a) => a.key === "agency")!;
  const pro = accounts.find((a) => a.key === "pro_creator")!;

  const { data: brandProfile } = await service
    .from("brand_profiles")
    .select("id")
    .eq("user_id", brand.userId)
    .maybeSingle();
  const { data: agencyProfile } = await service
    .from("brand_profiles")
    .select("id")
    .eq("user_id", agency.userId)
    .maybeSingle();

  const titles = DEMO_CAMPAIGNS.map((c) => c["title"] as string);
  const { data: existing } = await service.from("campaigns").select("id, title").in("title", titles);
  const existingTitles = new Set(((existing as Row[]) ?? []).map((r) => r["title"] as string));

  const rows = DEMO_CAMPAIGNS.filter((c) => !existingTitles.has(c["title"] as string)).map((c, i) => {
    const owner = i % 3 === 2 ? agency : brand;
    const profileId =
      owner.key === "agency" ? (agencyProfile as Row | null)?.["id"] : (brandProfile as Row | null)?.["id"];
    return {
      ...c,
      brand_user_id: owner.userId,
      brand_profile_id: profileId ?? null,
      application_deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    };
  });

  let insertedCampaigns = 0;
  if (rows.length) {
    const { error } = await service.from("campaigns").insert(rows as never);
    if (error) throw new Error(error.message);
    insertedCampaigns = rows.length;
  }

  // Applications from the Pro Creator on the first two campaigns.
  const { data: seeded } = await service
    .from("campaigns")
    .select("id, title")
    .in("title", titles)
    .limit(3);
  const { data: proProfile } = await service
    .from("creator_profiles")
    .select("id")
    .eq("user_id", pro.userId)
    .maybeSingle();

  let insertedApplications = 0;
  for (const campaign of ((seeded as Row[]) ?? []).slice(0, 2)) {
    const { data: already } = await service
      .from("campaign_applications")
      .select("id")
      .eq("campaign_id", campaign["id"])
      .eq("creator_user_id", pro.userId)
      .maybeSingle();
    if (already) continue;
    const { error } = await service.from("campaign_applications").insert({
      campaign_id: campaign["id"],
      creator_user_id: pro.userId,
      creator_profile_id: (proProfile as Row | null)?.["id"] ?? null,
      cover_message:
        "I have shot three barrier-repair routines this year and can deliver raw texture footage plus a polished cut. Happy to share performance data from past launches.",
      proposed_price: 1800,
      currency: "USD",
      availability: "Available from next week",
      status: "applied",
    } as never);
    if (!error) insertedApplications += 1;
  }

  return { insertedCampaigns, insertedApplications };
}
