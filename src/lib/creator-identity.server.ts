/**
 * Creator identity persistence. Server-only.
 * Reuses the existing `creator_profiles` table and the new `social_accounts`
 * table; analysis data stays in `creators` / `reports`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicClient } from "./supabase-public.server";
import { normalizeUsername, type CreatorProfile, type Platform } from "./creator-types";
import { benchmarkCreator } from "./scoring/engine";
import {
  profileUrlFor,
  type CreatorBenchmark,
  type CreatorIdentity,
  type CreatorIdentityProfile,
  type CreatorMetrics,
  type SimilarCreator,
  type SocialAccount,
} from "./creator-identity";

type Row = Record<string, any>;
type Db = SupabaseClient<any, any, any>;

function mapProfile(row: Row): CreatorIdentityProfile {
  const categories: string[] = row["categories"] ?? [];
  return {
    id: row["id"],
    userId: row["user_id"],
    displayName: row["display_name"] ?? "Creator",
    handle: row["handle"] ?? null,
    bio: row["bio"] ?? null,
    headline: row["headline"] ?? null,
    profileImage: row["avatar_url"] ?? null,
    category: categories[0] ?? null,
    categories,
    location: row["location"] ?? null,
    isPublished: Boolean(row["is_published"]),
    createdAt: row["created_at"],
    updatedAt: row["updated_at"],
  };
}

function mapSocialAccount(row: Row): SocialAccount {
  return {
    id: row["id"],
    creatorProfileId: row["creator_profile_id"],
    platform: row["platform"] as Platform,
    handle: row["handle"],
    platformUserId: row["platform_user_id"] ?? null,
    profileUrl: row["profile_url"] ?? null,
    connectionType: row["connection_type"] ?? "public_handle",
    connectedAt: row["connected_at"],
    lastSyncedAt: row["last_synced_at"] ?? null,
  };
}

async function loadProfileRow(db: Db, userId: string): Promise<Row | null> {
  const { data, error } = await db
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row | null) ?? null;
}

async function loadSocialAccounts(db: Db, profileId: string): Promise<SocialAccount[]> {
  const { data, error } = await db
    .from("social_accounts")
    .select("*")
    .eq("creator_profile_id", profileId)
    .order("connected_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapSocialAccount);
}

/** Analysis data for a connected handle, if it has ever been analysed. */
async function metricsFor(account: SocialAccount): Promise<{ metrics: CreatorMetrics | null; creatorRow: Row | null }> {
  const db = publicClient() as unknown as Db;
  const { data: creator } = await db
    .from("creators")
    .select("*")
    .eq("platform", account.platform)
    .eq("username", account.handle.toLowerCase())
    .maybeSingle();
  if (!creator) return { metrics: null, creatorRow: null };

  const c = creator as Row;
  const { data: report } = await db
    .from("reports")
    .select("*")
    .eq("creator_id", c["id"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = (report ?? null) as Row | null;

  return {
    creatorRow: c,
    metrics: {
      platform: account.platform,
      handle: c["username"],
      followers: Number(c["followers"] ?? 0),
      following: Number(c["following"] ?? 0),
      postsCount: Number(c["posts_count"] ?? 0),
      avgLikes: Number(c["avg_likes"] ?? 0),
      avgComments: Number(c["avg_comments"] ?? 0),
      engagementRate: Number(c["engagement_rate"] ?? 0),
      overallScore: r ? Number(r["overall_score"]) : null,
      brandScore: r ? Number(r["brand_score"]) : null,
      engagementScore: r ? Number(r["engagement_score"]) : null,
      accessibilityScore: r ? Number(r["accessibility_score"]) : null,
      growthScore: r ? Number(r["growth_score"]) : null,
      lastFetchedAt: c["last_fetched_at"] ?? null,
    },
  };
}

function benchmarkFrom(creatorRow: Row, metrics: CreatorMetrics): CreatorBenchmark {
  // Reuse the existing scoring engine rather than inventing a second model.
  const profile = {
    platform: metrics.platform,
    username: metrics.handle,
    fullName: creatorRow["full_name"] ?? null,
    biography: creatorRow["biography"] ?? null,
    avatarUrl: creatorRow["avatar_url"] ?? null,
    profileUrl: creatorRow["profile_url"] ?? null,
    isVerified: Boolean(creatorRow["is_verified"]),
    isPrivate: Boolean(creatorRow["is_private"]),
    followers: metrics.followers,
    following: metrics.following,
    postsCount: metrics.postsCount,
    avgLikes: metrics.avgLikes,
    avgComments: metrics.avgComments,
    avgViews: Number(creatorRow["avg_views"] ?? 0),
    engagementRate: metrics.engagementRate,
    category: creatorRow["category"] ?? null,
    country: creatorRow["country"] ?? null,
    externalLinks: [],
    posts: [],
    lastFetchedAt: metrics.lastFetchedAt ?? new Date().toISOString(),
  } satisfies CreatorProfile;

  const result = benchmarkCreator(profile, {
    overall: metrics.overallScore ?? 60,
    brand: metrics.brandScore ?? 60,
    engagement: metrics.engagementScore ?? 60,
    accessibility: metrics.accessibilityScore ?? 60,
    growth: metrics.growthScore ?? 60,
  });

  return {
    peerGroup: result.peerGroup,
    percentile: result.percentile,
    standing: result.standing,
    averageEngagement: result.averageEngagement,
    top25Engagement: result.top25Engagement,
    top10Engagement: result.top10Engagement,
  };
}

async function similarCreators(metrics: CreatorMetrics, creatorRow: Row | null): Promise<SimilarCreator[]> {
  const db = publicClient() as unknown as Db;
  let query = db
    .from("creators")
    .select("platform, username, full_name, avatar_url, followers, engagement_rate")
    .eq("platform", metrics.platform)
    .neq("username", metrics.handle)
    .limit(6);

  const category = creatorRow?.["category"];
  if (category) query = query.eq("category", category);

  const { data } = await query;
  const rows = ((data as Row[]) ?? []).map((r) => ({
    platform: r["platform"] as Platform,
    username: r["username"],
    fullName: r["full_name"] ?? null,
    avatarUrl: r["avatar_url"] ?? null,
    followers: Number(r["followers"] ?? 0),
    engagementRate: Number(r["engagement_rate"] ?? 0),
  }));

  return rows
    .sort(
      (a, b) =>
        Math.abs(a.followers - metrics.followers) - Math.abs(b.followers - metrics.followers),
    )
    .slice(0, 4);
}

export async function getCreatorIdentity(db: Db, userId: string): Promise<CreatorIdentity> {
  const row = await loadProfileRow(db, userId);
  if (!row) {
    return { profile: null, socialAccounts: [], metrics: null, benchmark: null, similar: [], isPlaceholderData: true };
  }

  const profile = mapProfile(row);
  const socialAccounts = await loadSocialAccounts(db, profile.id);
  const primary = socialAccounts[0];
  if (!primary) {
    return { profile, socialAccounts, metrics: null, benchmark: null, similar: [], isPlaceholderData: true };
  }

  const { metrics, creatorRow } = await metricsFor(primary);
  if (!metrics || !creatorRow) {
    return { profile, socialAccounts, metrics: null, benchmark: null, similar: [], isPlaceholderData: true };
  }

  return {
    profile,
    socialAccounts,
    metrics,
    benchmark: benchmarkFrom(creatorRow, metrics),
    similar: await similarCreators(metrics, creatorRow),
    isPlaceholderData: false,
  };
}

export interface CreatorProfileInput {
  displayName: string;
  bio?: string | null;
  headline?: string | null;
  profileImage?: string | null;
  category?: string | null;
  location?: string | null;
  isPublished?: boolean;
}

function slugHandle(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "creator";
  return `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function saveCreatorIdentityProfile(
  db: Db,
  userId: string,
  input: CreatorProfileInput,
): Promise<CreatorIdentityProfile> {
  const existing = await loadProfileRow(db, userId);
  const patch: Row = {
    user_id: userId,
    display_name: input.displayName.trim() || "Creator",
    bio: input.bio ?? null,
    headline: input.headline ?? null,
    avatar_url: input.profileImage ?? null,
    location: input.location ?? null,
    categories: input.category ? [input.category] : (existing?.["categories"] ?? []),
  };
  if (typeof input.isPublished === "boolean") patch["is_published"] = input.isPublished;
  if (!existing) patch["handle"] = slugHandle(input.displayName);

  const { data, error } = await db
    .from("creator_profiles")
    .upsert(patch, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data as Row);
}

/**
 * Links a PUBLIC social handle. This is not OAuth — no tokens, no private
 * insights. `connection_type` leaves room for an `oauth` link later.
 */
export async function connectSocialAccount(
  db: Db,
  userId: string,
  input: { platform: Platform; handle: string },
): Promise<SocialAccount> {
  const profile = await loadProfileRow(db, userId);
  if (!profile) throw new Error("Create your creator profile first.");

  const handle = normalizeUsername(input.handle);
  if (!handle) throw new Error("Enter a valid handle — letters, numbers, dots and underscores only.");
  const platform: Platform = input.platform === "tiktok" ? "tiktok" : "instagram";

  const { data, error } = await db
    .from("social_accounts")
    .upsert(
      {
        creator_profile_id: profile["id"],
        platform,
        handle,
        profile_url: profileUrlFor(platform, handle),
        connection_type: "public_handle",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "creator_profile_id,platform" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Keep the marketplace profile columns in sync so existing features work.
  await db
    .from("creator_profiles")
    .update(platform === "tiktok" ? { tiktok_username: handle } : { instagram_username: handle })
    .eq("id", profile["id"]);

  return mapSocialAccount(data as Row);
}

export async function disconnectSocialAccount(db: Db, userId: string, id: string): Promise<{ ok: true }> {
  const profile = await loadProfileRow(db, userId);
  if (!profile) throw new Error("No creator profile.");
  const { data, error } = await db
    .from("social_accounts")
    .delete()
    .eq("id", id)
    .eq("creator_profile_id", profile["id"])
    .select("platform")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const platform = (data as Row | null)?.["platform"];
  if (platform) {
    await db
      .from("creator_profiles")
      .update(platform === "tiktok" ? { tiktok_username: null } : { instagram_username: null })
      .eq("id", profile["id"]);
  }
  return { ok: true };
}

/** Runs the existing cached analysis pipeline for a connected handle. */
export async function syncSocialAccount(db: Db, userId: string, id: string) {
  const profile = await loadProfileRow(db, userId);
  if (!profile) throw new Error("No creator profile.");
  const { data, error } = await db
    .from("social_accounts")
    .select("*")
    .eq("id", id)
    .eq("creator_profile_id", profile["id"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Social account not found.");

  const account = mapSocialAccount(data as Row);
  const { analyzeCreatorHandler } = await import("./analyze.server");
  const result = await analyzeCreatorHandler({ platform: account.platform, username: account.handle });

  await db
    .from("social_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", account.id);

  return { ok: true as const, cached: result.cached, fetchedAt: result.fetchedAt };
}
