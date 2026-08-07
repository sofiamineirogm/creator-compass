/**
 * Marketplace persistence layer. Server-only.
 * Reads/writes campaigns, applications, profiles, saved items and messages.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicClient } from "./supabase-public.server";
import {
  FOLLOWER_BANDS,
  type ApplicationRecord,
  type Campaign,
  type CampaignFilters,
  type ConversationRecord,
  type CreatorAnalyticsSnapshot,
  type CreatorMarketplaceProfile,
  type MessageRecord,
} from "./marketplace-types";
import type { Plan, Role, Viewer } from "./entitlements";

type Row = Record<string, any>;
type Db = SupabaseClient<any, any, any>;

const CAMPAIGN_SELECT = "*, brand_profiles(*)";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

function mapCampaign(row: Row): Campaign {
  const brand = (row["brand_profiles"] ?? null) as Row | null;
  return {
    id: row["id"],
    brandUserId: row["brand_user_id"],
    title: row["title"],
    description: row["description"] ?? "",
    objectives: row["objectives"] ?? [],
    targetAudience: row["target_audience"],
    expectedContent: row["expected_content"],
    category: row["category"],
    platforms: row["platforms"] ?? [],
    deliverables: row["deliverables"] ?? [],
    budgetMin: Number(row["budget_min"] ?? 0),
    budgetMax: Number(row["budget_max"] ?? 0),
    currency: row["currency"] ?? "USD",
    paymentModel: row["payment_model"],
    location: row["location"],
    locationType: row["location_type"],
    languages: row["languages"] ?? [],
    minFollowers: Number(row["min_followers"] ?? 0),
    maxFollowers: row["max_followers"] === null ? null : Number(row["max_followers"]),
    minEngagementRate: Number(row["min_engagement_rate"] ?? 0),
    creatorCategories: row["creator_categories"] ?? [],
    audienceRequirements: row["audience_requirements"],
    applicationDeadline: row["application_deadline"],
    startsAt: row["starts_at"],
    endsAt: row["ends_at"],
    creatorsNeeded: Number(row["creators_needed"] ?? 1),
    status: row["status"],
    applicantsCount: Number(row["applicants_count"] ?? 0),
    createdAt: row["created_at"],
    brand: {
      id: brand?.["id"] ?? null,
      companyName: brand?.["company_name"] ?? "Independent brand",
      logoUrl: brand?.["logo_url"] ?? null,
      industry: brand?.["industry"] ?? null,
      location: brand?.["location"] ?? null,
      website: brand?.["website"] ?? null,
      description: brand?.["description"] ?? null,
      isVerified: Boolean(brand?.["is_verified"]),
    },
  };
}

function mapCreatorProfile(row: Row, analytics: CreatorAnalyticsSnapshot | null = null): CreatorMarketplaceProfile {
  return {
    id: row["id"],
    userId: row["user_id"],
    displayName: row["display_name"] ?? "Creator",
    handle: row["handle"],
    avatarUrl: row["avatar_url"],
    headline: row["headline"],
    bio: row["bio"],
    location: row["location"],
    languages: row["languages"] ?? [],
    categories: row["categories"] ?? [],
    instagramUsername: row["instagram_username"],
    tiktokUsername: row["tiktok_username"],
    portfolio: row["portfolio"] ?? [],
    pastCollaborations: row["past_collaborations"] ?? [],
    startingPrice: Number(row["starting_price"] ?? 0),
    maxPrice: row["max_price"] === null ? null : Number(row["max_price"]),
    currency: row["currency"] ?? "USD",
    availability: row["availability"] ?? "open",
    isVerified: Boolean(row["is_verified"]),
    isPublished: Boolean(row["is_published"]),
    isBoosted: Boolean(row["is_boosted"]),
    analytics,
  };
}

function mapApplication(row: Row): ApplicationRecord {
  return {
    id: row["id"],
    campaignId: row["campaign_id"],
    creatorUserId: row["creator_user_id"],
    coverMessage: row["cover_message"] ?? "",
    proposedPrice: Number(row["proposed_price"] ?? 0),
    currency: row["currency"] ?? "USD",
    availability: row["availability"],
    portfolioExamples: row["portfolio_examples"] ?? [],
    attachments: row["attachments"] ?? [],
    status: row["status"],
    isInvitation: Boolean(row["is_invitation"]),
    createdAt: row["created_at"],
    campaign: row["campaigns"] ? mapCampaign(row["campaigns"] as Row) : null,
    creator: row["creator_profiles"] ? mapCreatorProfile(row["creator_profiles"] as Row) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

export async function listPublicCampaigns(filters: CampaignFilters): Promise<Campaign[]> {
  const db = publicClient() as unknown as Db;
  let query = db.from("campaigns").select(CAMPAIGN_SELECT).neq("status", "draft").limit(120);

  if (filters.openOnly !== false) query = query.eq("status", "open");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.platform) query = query.contains("platforms", [filters.platform]);
  if (filters.deliverable) query = query.contains("deliverables", [filters.deliverable]);
  if (filters.locationType && filters.locationType !== "any") {
    query = query.eq("location_type", filters.locationType);
  }
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters.minBudget) query = query.gte("budget_max", filters.minBudget);
  if (filters.maxEngagement) query = query.lte("min_engagement_rate", filters.maxEngagement);
  if (filters.followerBand) {
    const band = FOLLOWER_BANDS.find((b) => b.key === filters.followerBand);
    if (band) {
      query = query.lte("min_followers", band.max ?? 100_000_000);
      if (band.min) query = query.or(`max_followers.is.null,max_followers.gte.${band.min}`);
    }
  }
  if (filters.search) {
    const term = filters.search.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
  }

  switch (filters.sort) {
    case "highest_budget":
      query = query.order("budget_max", { ascending: false });
      break;
    case "deadline":
      query = query.order("application_deadline", { ascending: true, nullsFirst: false });
      break;
    case "most_relevant":
      query = query.order("applicants_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapCampaign);
}

export async function getPublicCampaign(id: string): Promise<Campaign | null> {
  const db = publicClient() as unknown as Db;
  const { data } = await db.from("campaigns").select(CAMPAIGN_SELECT).eq("id", id).maybeSingle();
  return data ? mapCampaign(data as Row) : null;
}

export async function getPublicCreatorProfile(handle: string): Promise<CreatorMarketplaceProfile | null> {
  const db = publicClient() as unknown as Db;
  const { data } = await db
    .from("creator_profiles")
    .select("*")
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;
  return mapCreatorProfile(data as Row, await analyticsFor(data as Row));
}

/** Pulls the existing analytics record for a creator's linked social handle. */
async function analyticsFor(profile: Row): Promise<CreatorAnalyticsSnapshot | null> {
  const platform = profile["instagram_username"] ? "instagram" : profile["tiktok_username"] ? "tiktok" : null;
  const username = profile["instagram_username"] ?? profile["tiktok_username"];
  if (!platform || !username) return null;

  const db = publicClient() as unknown as Db;
  const { data: creator } = await db
    .from("creators")
    .select("*")
    .eq("platform", platform)
    .eq("username", String(username).toLowerCase())
    .maybeSingle();
  if (!creator) return null;

  const { data: report } = await db
    .from("reports")
    .select("*")
    .eq("creator_id", (creator as Row)["id"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const c = creator as Row;
  const r = (report ?? {}) as Row;
  return {
    platform,
    username: c["username"],
    followers: Number(c["followers"] ?? 0),
    engagementRate: Number(c["engagement_rate"] ?? 0),
    overallScore: Number(r["overall_score"] ?? 0),
    brandScore: Number(r["brand_score"] ?? 0),
    engagementScore: Number(r["engagement_score"] ?? 0),
    accessibilityScore: Number(r["accessibility_score"] ?? 0),
    growthScore: Number(r["growth_score"] ?? 0),
    lastFetchedAt: c["last_fetched_at"],
  };
}

/* ------------------------------------------------------------------ */
/* Viewer context                                                      */
/* ------------------------------------------------------------------ */

export async function loadViewer(db: Db, userId: string, email: string | null): Promise<Viewer> {
  const [{ data: roles }, { data: sub }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId),
    db.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle(),
  ]);

  const list = ((roles as Row[]) ?? []).map((r) => r["role"] as Role);
  const priority: Role[] = ["admin", "agency", "brand", "creator", "guest"];
  const role = priority.find((r) => list.includes(r)) ?? "guest";
  const subRow = sub as Row | null;
  const plan: Plan = subRow && subRow["status"] === "active" ? (subRow["plan"] as Plan) : "free";

  return { userId, email, role, plan, isDemo: false };
}

export async function setViewerRole(db: Db, userId: string, role: Role): Promise<void> {
  const service = await admin();
  await service.from("user_roles").delete().eq("user_id", userId).neq("role", "admin");
  await service.from("user_roles").insert({ user_id: userId, role });
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export async function getMyCreatorProfile(db: Db, userId: string) {
  const { data } = await db.from("creator_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return mapCreatorProfile(data as Row, await analyticsFor(data as Row));
}

export async function upsertCreatorProfile(db: Db, userId: string, input: Row) {
  const { data, error } = await db
    .from("creator_profiles")
    .upsert({ ...input, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCreatorProfile(data as Row);
}

export async function getMyBrandProfile(db: Db, userId: string) {
  const { data } = await db.from("brand_profiles").select("*").eq("user_id", userId).maybeSingle();
  return (data as Row | null) ?? null;
}

export async function upsertBrandProfile(db: Db, userId: string, input: Row) {
  const { data, error } = await db
    .from("brand_profiles")
    .upsert({ ...input, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Row;
}

/* ------------------------------------------------------------------ */
/* Campaigns (owner side)                                              */
/* ------------------------------------------------------------------ */

export async function listMyCampaigns(db: Db, userId: string): Promise<Campaign[]> {
  const { data, error } = await db
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("brand_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapCampaign);
}

export async function createCampaign(db: Db, userId: string, input: Row): Promise<Campaign> {
  const brand = await getMyBrandProfile(db, userId);
  const { data, error } = await db
    .from("campaigns")
    .insert({ ...input, brand_user_id: userId, brand_profile_id: brand?.["id"] ?? null })
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapCampaign(data as Row);
}

export async function updateCampaign(db: Db, userId: string, id: string, patch: Row): Promise<Campaign> {
  const { data, error } = await db
    .from("campaigns")
    .update(patch)
    .eq("id", id)
    .eq("brand_user_id", userId)
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapCampaign(data as Row);
}

export async function listCampaignApplicants(db: Db, campaignId: string): Promise<ApplicationRecord[]> {
  const { data, error } = await db
    .from("campaign_applications")
    .select("*, creator_profiles(*)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapApplication);
}

export async function updateApplicationStatus(db: Db, id: string, status: string, note?: string) {
  const { error } = await db
    .from("campaign_applications")
    .update({ status, brand_note: note ?? null, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Applications (creator side)                                         */
/* ------------------------------------------------------------------ */

export async function listMyApplications(db: Db, userId: string): Promise<ApplicationRecord[]> {
  const { data, error } = await db
    .from("campaign_applications")
    .select(`*, campaigns(${CAMPAIGN_SELECT})`)
    .eq("creator_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapApplication);
}

export async function applyToCampaign(db: Db, userId: string, input: Row) {
  const profile = await db.from("creator_profiles").select("id").eq("user_id", userId).maybeSingle();
  const { data, error } = await db
    .from("campaign_applications")
    .insert({
      campaign_id: input["campaign_id"],
      creator_user_id: userId,
      creator_profile_id: (profile.data as Row | null)?.["id"] ?? null,
      cover_message: input["cover_message"],
      proposed_price: input["proposed_price"],
      currency: input["currency"] ?? "USD",
      availability: input["availability"] ?? null,
      portfolio_examples: input["portfolio_examples"] ?? [],
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("You have already applied to this campaign.");
    throw new Error(error.message);
  }
  return mapApplication(data as Row);
}

export async function withdrawApplication(db: Db, userId: string, id: string) {
  const { error } = await db
    .from("campaign_applications")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .eq("creator_user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Saved campaigns                                                     */
/* ------------------------------------------------------------------ */

export async function listSavedCampaigns(db: Db, userId: string): Promise<Campaign[]> {
  const { data, error } = await db
    .from("saved_campaigns")
    .select(`campaign_id, campaigns(${CAMPAIGN_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).filter((r) => r["campaigns"]).map((r) => mapCampaign(r["campaigns"] as Row));
}

export async function toggleSavedCampaign(db: Db, userId: string, campaignId: string) {
  const { data } = await db
    .from("saved_campaigns")
    .select("id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (data) {
    await db.from("saved_campaigns").delete().eq("id", (data as Row)["id"]);
    return { saved: false };
  }
  await db.from("saved_campaigns").insert({ user_id: userId, campaign_id: campaignId });
  return { saved: true };
}

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export async function listConversations(db: Db, userId: string): Promise<ConversationRecord[]> {
  const { data, error } = await db
    .from("conversations")
    .select("*, campaigns(title)")
    .or(`brand_user_id.eq.${userId},creator_user_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data as Row[]) ?? [];
  const counterpartIds = rows.map((r) => (r["brand_user_id"] === userId ? r["creator_user_id"] : r["brand_user_id"]));
  const names = await displayNames(db, counterpartIds);

  return rows.map((r) => {
    const other = r["brand_user_id"] === userId ? r["creator_user_id"] : r["brand_user_id"];
    return {
      id: r["id"],
      campaignId: r["campaign_id"],
      campaignTitle: (r["campaigns"] as Row | null)?.["title"] ?? null,
      brandUserId: r["brand_user_id"],
      creatorUserId: r["creator_user_id"],
      lastMessageAt: r["last_message_at"],
      unreadCount: 0,
      counterpartName: names[other] ?? "Member",
    };
  });
}

async function displayNames(db: Db, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const service = await admin();
  const [{ data: creators }, { data: brands }] = await Promise.all([
    service.from("creator_profiles").select("user_id, display_name").in("user_id", ids),
    service.from("brand_profiles").select("user_id, company_name").in("user_id", ids),
  ]);
  const out: Record<string, string> = {};
  for (const r of ((brands as Row[]) ?? [])) out[r["user_id"]] = r["company_name"];
  for (const r of ((creators as Row[]) ?? [])) out[r["user_id"]] ??= r["display_name"];
  return out;
}

export async function listMessages(db: Db, conversationId: string): Promise<MessageRecord[]> {
  const { data, error } = await db
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((r) => ({
    id: r["id"],
    conversationId: r["conversation_id"],
    senderUserId: r["sender_user_id"],
    body: r["body"],
    attachments: r["attachments"] ?? [],
    readAt: r["read_at"],
    createdAt: r["created_at"],
  }));
}

export async function sendMessage(db: Db, userId: string, conversationId: string, body: string) {
  const { error } = await db
    .from("messages")
    .insert({ conversation_id: conversationId, sender_user_id: userId, body });
  if (error) throw new Error(error.message);
  await db
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  return { ok: true };
}

/** Opens (or reuses) the conversation between a brand and a creator. */
export async function openConversation(
  db: Db,
  brandUserId: string,
  creatorUserId: string,
  campaignId: string | null,
  applicationId: string | null,
) {
  const { data: existing } = await db
    .from("conversations")
    .select("id")
    .eq("brand_user_id", brandUserId)
    .eq("creator_user_id", creatorUserId)
    .eq("campaign_id", campaignId ?? "")
    .maybeSingle();
  if (existing) return { id: (existing as Row)["id"] as string };

  const { data, error } = await db
    .from("conversations")
    .insert({
      brand_user_id: brandUserId,
      creator_user_id: creatorUserId,
      campaign_id: campaignId,
      application_id: applicationId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as Row)["id"] as string };
}
