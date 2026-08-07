import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CampaignFilters } from "./marketplace-types";
import type { Viewer } from "./entitlements";
import {
  applyToCampaign as applyToCampaignDb,
  createCampaign as createCampaignDb,
  getMyBrandProfile,
  getMyCreatorProfile,
  getPublicCampaign,
  getPublicCreatorProfile,
  listCampaignApplicants,
  listConversations,
  listMessages,
  listMyApplications,
  listMyCampaigns,
  listPublicCampaigns,
  listSavedCampaigns,
  loadViewer,
  openConversation,
  sendMessage as sendMessageDb,
  setViewerRole,
  toggleSavedCampaign as toggleSavedCampaignDb,
  updateApplicationStatus as updateApplicationStatusDb,
  updateCampaign as updateCampaignDb,
  upsertBrandProfile,
  upsertCreatorProfile,
  withdrawApplication as withdrawApplicationDb,
} from "./marketplace.server";
import { DEMO_PERSONAS } from "./demo";

type Row = Record<string, any>;

/* --------------------------- public reads --------------------------- */

export const getCampaigns = createServerFn({ method: "POST" })
  .inputValidator((input: CampaignFilters) => input ?? {})
  .handler(async ({ data }) => listPublicCampaigns(data));

export const getCampaign = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => getPublicCampaign(data.id));

export const getCreatorProfileByHandle = createServerFn({ method: "POST" })
  .inputValidator((input: { handle: string }) => input)
  .handler(async ({ data }) => getPublicCreatorProfile(data.handle));

/* --------------------------- viewer context -------------------------- */

export const getViewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Viewer> => {
    const email = (context.claims as Row | null)?.["email"] ?? null;
    return loadViewer(context.supabase as never, context.userId, email);
  });

export const getMyProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    creator: await getMyCreatorProfile(context.supabase as never, context.userId),
    brand: await getMyBrandProfile(context.supabase as never, context.userId),
  }));

export const saveCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Row) => input)
  .handler(async ({ data, context }) =>
    upsertCreatorProfile(context.supabase as never, context.userId, data),
  );

export const saveBrandProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Row) => input)
  .handler(async ({ data, context }) =>
    upsertBrandProfile(context.supabase as never, context.userId, data),
  );

/* --------------------------- creator side ---------------------------- */

export const getMyApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMyApplications(context.supabase as never, context.userId));

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Row) => {
    if (!input?.["campaign_id"]) throw new Error("Missing campaign.");
    if (!String(input["cover_message"] ?? "").trim()) throw new Error("Add a short pitch first.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const viewer = await loadViewer(context.supabase as never, context.userId, null);
    const { canApplyToCampaign } = await import("./entitlements");
    if (!canApplyToCampaign(viewer)) throw new Error("Your plan does not allow applying to campaigns.");
    return applyToCampaignDb(context.supabase as never, context.userId, data);
  });

export const withdrawApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) =>
    withdrawApplicationDb(context.supabase as never, context.userId, data.id),
  );

export const getSavedCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listSavedCampaigns(context.supabase as never, context.userId));

export const toggleSavedCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data, context }) =>
    toggleSavedCampaignDb(context.supabase as never, context.userId, data.campaignId),
  );

/* ---------------------------- brand side ----------------------------- */

export const getMyCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMyCampaigns(context.supabase as never, context.userId));

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Row) => {
    if (!String(input?.["title"] ?? "").trim()) throw new Error("Give the campaign a title.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const viewer = await loadViewer(context.supabase as never, context.userId, null);
    const { canCreateCampaign } = await import("./entitlements");
    if (!canCreateCampaign(viewer)) throw new Error("Your plan does not allow publishing campaigns.");
    return createCampaignDb(context.supabase as never, context.userId, data);
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; patch: Row }) => input)
  .handler(async ({ data, context }) =>
    updateCampaignDb(context.supabase as never, context.userId, data.id, data.patch),
  );

export const getCampaignApplicants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data, context }) =>
    listCampaignApplicants(context.supabase as never, data.campaignId),
  );

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string; note?: string }) => input)
  .handler(async ({ data, context }) =>
    updateApplicationStatusDb(context.supabase as never, data.id, data.status, data.note),
  );

/* ----------------------------- messaging ----------------------------- */

export const getConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listConversations(context.supabase as never, context.userId));

export const getMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => input)
  .handler(async ({ data, context }) => listMessages(context.supabase as never, data.conversationId));

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string; body: string }) => {
    if (!input.body.trim()) throw new Error("Message is empty.");
    return input;
  })
  .handler(async ({ data, context }) =>
    sendMessageDb(context.supabase as never, context.userId, data.conversationId, data.body),
  );

export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { creatorUserId?: string; brandUserId?: string; campaignId?: string | null; applicationId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const brandUserId = data.brandUserId ?? context.userId;
    const creatorUserId = data.creatorUserId ?? context.userId;
    return openConversation(
      context.supabase as never,
      brandUserId,
      creatorUserId,
      data.campaignId ?? null,
      data.applicationId ?? null,
    );
  });

/* ------------------------------- demo -------------------------------- */

function demoEnabled(): boolean {
  return String(process.env["DEMO_MODE"] ?? process.env["VITE_DEMO_MODE"] ?? "").toLowerCase() === "true";
}

export const switchDemoPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { persona: string }) => input)
  .handler(async ({ data, context }) => {
    if (!demoEnabled()) throw new Error("Demo mode is disabled.");
    const persona = DEMO_PERSONAS.find((p) => p.key === data.persona);
    if (!persona) throw new Error("Unknown demo persona.");

    await setViewerRole(context.supabase as never, context.userId, persona.role);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: context.userId,
        plan: persona.plan,
        status: persona.plan === "free" ? "inactive" : "active",
      } as never,
      { onConflict: "user_id" },
    );

    return { role: persona.role, plan: persona.plan };
  });

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
    description: "Twelve-week training story arc. We want a creator who is genuinely training and can document the grind.",
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
    description: "One-night launch event. We need on-the-ground stories, interviews and a recap reel within 48 hours.",
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

export const seedDemoCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!demoEnabled()) throw new Error("Demo mode is disabled.");
    const brand = await getMyBrandProfile(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = DEMO_CAMPAIGNS.map((c) => ({
      ...c,
      brand_user_id: context.userId,
      brand_profile_id: brand?.["id"] ?? null,
      application_deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    }));
    const { error } = await supabaseAdmin.from("campaigns").insert(rows as never);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });
