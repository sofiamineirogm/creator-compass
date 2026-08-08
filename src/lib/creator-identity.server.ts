/**
 * Creator identity persistence. Server-only.
 * Reuses the existing `creator_profiles` table and the new `social_accounts`
 * table; analysis data stays in `creators` / `reports`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicClient } from "./supabase-public.server";
import {
  normalizeUsername,
  type CreatorPost,
  type CreatorProfile,
  type DataQuality,
  type Platform,
} from "./creator-types";
import { median, type PeerStats, type ProfileSignals } from "./analytics/kpi";
import { benchmarkCreator } from "./scoring/engine";
import {
  MINIMUM_BENCHMARK_PEERS,
  MINIMUM_SIMILAR_CREATORS,
  profileUrlFor,
  type CreatorAnalyticsData,
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
async function metricsFor(
  account: SocialAccount,
): Promise<{ metrics: CreatorMetrics | null; creatorRow: Row | null }> {
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
      avgLikes: metricOrNull(c["avg_likes"]),
      avgComments: metricOrNull(c["avg_comments"]),
      avgViews: metricOrNull(c["avg_views"]),
      engagementRate: metricOrNull(c["engagement_rate"]),
      overallScore: r ? Number(r["overall_score"]) : null,
      brandScore: r ? Number(r["brand_score"]) : null,
      engagementScore: r ? Number(r["engagement_score"]) : null,
      accessibilityScore: r ? Number(r["accessibility_score"]) : null,
      growthScore: r ? Number(r["growth_score"]) : null,
      lastFetchedAt: c["last_fetched_at"] ?? null,
    },
  };
}

/** An absent metric stays absent: never coerced into a fabricated zero. */
function metricOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Obvious demo/mock/placeholder handles must never pollute analytics. */
function isDemoLikeUsername(username: string | null | undefined): boolean {
  const u = String(username ?? "").toLowerCase();
  if (!u) return true;
  return /^(demo|test|sample|mock|example|fake)[._-]?/.test(u) || u.includes("creatoriq.test");
}

/** A row is usable for analytics only when its core metrics are real. */
function hasUsableMetrics(row: Row): boolean {
  return (
    Number(row["followers"] ?? 0) > 0 &&
    Number(row["engagement_rate"] ?? 0) > 0 &&
    Number(row["posts_count"] ?? 0) > 0
  );
}

/** Follower band: peers within a quarter to four times the creator's size. */
function withinFollowerBand(followers: number, target: number): boolean {
  if (target <= 0 || followers <= 0) return false;
  return followers >= target * 0.25 && followers <= target * 4;
}

interface PeerRow extends Row {
  hasReport: boolean;
}

/**
 * Real, analysed creators on the same platform. One query, then filtered in
 * memory so peer rules stay explicit and auditable.
 */
async function loadPeerRows(metrics: CreatorMetrics): Promise<PeerRow[]> {
  const db = publicClient() as unknown as Db;
  const { data } = await db
    .from("creators")
    .select(
      "id, platform, username, full_name, avatar_url, followers, engagement_rate, avg_likes, avg_comments, avg_views, posts_count, category, reports(id)",
    )
    .eq("platform", metrics.platform)
    .limit(500);

  const rows: PeerRow[] = ((data as Row[]) ?? []).map((r) => ({
    ...r,
    hasReport: Array.isArray(r["reports"]) && r["reports"].length > 0,
  }));

  return rows.filter(
    (r) =>
      r["username"] !== metrics.handle &&
      !isDemoLikeUsername(r["username"]) &&
      hasUsableMetrics(r) &&
      r.hasReport,
  );
}

/**
 * Valid comparable peers for the benchmark: same platform, same category when
 * the creator has one, and a comparable follower band. Follower count alone is
 * never sufficient — a real analysis is required.
 */
function comparablePeers(
  peers: PeerRow[],
  metrics: CreatorMetrics,
  category: string | null,
): PeerRow[] {
  return peers.filter(
    (r) =>
      withinFollowerBand(Number(r["followers"] ?? 0), metrics.followers) &&
      (!category || r["category"] === category),
  );
}

function benchmarkFrom(
  creatorRow: Row,
  metrics: CreatorMetrics,
  peerCount: number,
): CreatorBenchmark | null {
  // NO REAL DATA = NO METRIC. Never benchmark from invented scores.
  const scores = {
    overall: metrics.overallScore,
    brand: metrics.brandScore,
    engagement: metrics.engagementScore,
    accessibility: metrics.accessibilityScore,
    growth: metrics.growthScore,
  };
  const hasRealScores = Object.values(scores).every(
    (v) => typeof v === "number" && Number.isFinite(v),
  );
  const hasRealProfile = metrics.followers > 0 && (metrics.engagementRate ?? 0) > 0;
  if (!hasRealScores || !hasRealProfile) return null;

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
    overall: scores.overall as number,
    brand: scores.brand as number,
    engagement: scores.engagement as number,
    accessibility: scores.accessibility as number,
    growth: scores.growth as number,
  });

  // Too small a peer group -> no percentile at all, rather than a fabricated one.
  const enoughPeers = peerCount >= MINIMUM_BENCHMARK_PEERS;

  return {
    peerGroup: result.peerGroup,
    percentile: enoughPeers ? result.percentile : null,
    standing: enoughPeers ? result.standing : null,
    peerCount,
    averageEngagement: result.averageEngagement,
    top25Engagement: result.top25Engagement,
    top10Engagement: result.top10Engagement,
  };
}

/**
 * Heuristic (not the final similarity engine): platform + follower band +
 * category + a real analysis. Ranked by relative follower distance, then
 * engagement closeness. No similarity percentage is produced.
 */
function similarCreators(
  peers: PeerRow[],
  metrics: CreatorMetrics,
  category: string | null,
): SimilarCreator[] {
  const banded = peers.filter((r) =>
    withinFollowerBand(Number(r["followers"] ?? 0), metrics.followers),
  );
  const sameCategory = category ? banded.filter((r) => r["category"] === category) : [];
  const pool = sameCategory.length >= MINIMUM_SIMILAR_CREATORS ? sameCategory : banded;

  if (pool.length < MINIMUM_SIMILAR_CREATORS) return [];

  return pool
    .map((r) => {
      const followers = Number(r["followers"] ?? 0);
      const engagementRate = Number(r["engagement_rate"] ?? 0);
      const followerDistance = Math.abs(Math.log(followers / metrics.followers));
      const engagementDistance = Math.abs(engagementRate - (metrics.engagementRate ?? 0));
      const matchedCategory = Boolean(category) && r["category"] === category;
      return {
        platform: r["platform"] as Platform,
        username: r["username"] as string,
        fullName: r["full_name"] ?? null,
        avatarUrl: r["avatar_url"] ?? null,
        followers,
        engagementRate,
        reason: matchedCategory
          ? `Same category (${category}) · comparable audience size · analysed profile`
          : "Same platform · comparable audience size · analysed profile",
        score: followerDistance + engagementDistance / 20,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ score: _score, ...rest }) => rest);
}

function text(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v && v.toLowerCase() !== "none" ? v : null;
}

/**
 * The creator profile header must describe the connected social account.
 * Real analysis data wins; stored profile data is only a fallback; nothing is
 * invented — missing category/location stay null so the UI can say so.
 */
function withConnectedAccountIdentity(
  profile: CreatorIdentityProfile,
  account: SocialAccount,
  creatorRow: Row,
): CreatorIdentityProfile {
  const realName = text(creatorRow["full_name"]);
  const realCategory = text(creatorRow["category"]);
  const realCountry = text(creatorRow["country"]);
  const realAvatar = text(creatorRow["avatar_url"]);
  const realBio = text(creatorRow["biography"]);

  // Stored profile copy is only trusted when it was authored for this handle.
  const storedMatchesAccount = text(profile.handle)?.toLowerCase() === account.handle.toLowerCase();
  const storedName = storedMatchesAccount ? text(profile.displayName) : null;

  return {
    ...profile,
    displayName: realName ?? storedName ?? `@${account.handle}`,
    handle: account.handle,
    profileImage: realAvatar ?? (storedMatchesAccount ? profile.profileImage : null),
    bio: realBio ?? (storedMatchesAccount ? profile.bio : null),
    headline: storedMatchesAccount ? profile.headline : null,
    category: realCategory,
    categories: realCategory ? [realCategory] : [],
    location: realCountry,
  };
}

/* ------------------------------- analytics -------------------------------- */

/** Peer KPI medians. Only produced from real, analysed, comparable creators. */
function peerStatsFrom(peers: PeerRow[]): PeerStats {
  const engagementRates: number[] = [];
  const likesPerFollower: number[] = [];
  const commentsPerFollower: number[] = [];
  const commentToLike: number[] = [];
  const viewsPerFollower: number[] = [];

  for (const p of peers) {
    const followers = Number(p["followers"] ?? 0);
    const er = metricOrNull(p["engagement_rate"]);
    const likes = metricOrNull(p["avg_likes"]);
    const comments = metricOrNull(p["avg_comments"]);
    const views = metricOrNull(p["avg_views"]);
    if (er !== null) engagementRates.push(er);
    if (followers > 0 && likes !== null) likesPerFollower.push((likes / followers) * 100);
    if (followers > 0 && comments !== null) commentsPerFollower.push((comments / followers) * 100);
    if (likes !== null && likes > 0 && comments !== null)
      commentToLike.push((comments / likes) * 100);
    if (followers > 0 && views !== null) viewsPerFollower.push((views / followers) * 100);
  }

  const medians: Record<string, number> = {};
  const put = (key: string, values: number[]) => {
    const m = median(values);
    if (m !== null) medians[key] = m;
  };
  put("engagementRate", engagementRates);
  put("likesPerFollower", likesPerFollower);
  put("commentsPerFollower", commentsPerFollower);
  put("commentToLike", commentToLike);
  put("viewsPerFollower", viewsPerFollower);

  return {
    peerCount: peers.length,
    medians,
    engagementRates,
    sufficient: peers.length >= MINIMUM_BENCHMARK_PEERS,
  };
}

/** Analysed posts for the connected handle, straight from stored data. */
async function loadPosts(creatorId: string): Promise<CreatorPost[]> {
  const db = publicClient() as unknown as Db;
  const { data } = await db
    .from("creator_posts")
    .select("*")
    .eq("creator_id", creatorId)
    .order("posted_at", { ascending: false })
    .limit(60);

  return ((data as Row[]) ?? []).map((p) => ({
    externalId: p["external_id"],
    caption: p["caption"] ?? null,
    url: p["url"] ?? null,
    thumbnailUrl: p["thumbnail_url"] ?? null,
    likes: Number(p["likes"] ?? 0),
    comments: Number(p["comments"] ?? 0),
    views: Number(p["views"] ?? 0),
    postedAt: p["posted_at"] ?? null,
  }));
}

function signalsFrom(creatorRow: Row): ProfileSignals {
  const links = Array.isArray(creatorRow["external_links"]) ? creatorRow["external_links"] : [];
  const raw = (creatorRow["raw"] ?? {}) as Row;
  const biography = text(creatorRow["biography"]);
  const linkHosts = (links as { url?: string }[])
    .map((l) => {
      try {
        return new URL(String(l?.url ?? "")).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })
    .filter((h): h is string => Boolean(h));

  return {
    biographyLength: String(biography ?? "").trim().length,
    externalLinks: links.length,
    isVerified: Boolean(creatorRow["is_verified"]),
    isBusinessAccount: Boolean(raw["isBusinessAccount"]),
    hasCategory: Boolean(text(creatorRow["category"])),
    biography: biography ?? null,
    displayName: text(creatorRow["full_name"]) ?? null,
    username: text(creatorRow["username"]) ?? null,
    category: text(creatorRow["category"]) ?? null,
    location: text(creatorRow["country"]) ?? null,
    linkHosts,
  };
}


/**
 * Data quality is read from the cached analysis when available, because only
 * the analysis pipeline knows whether the latest refresh was complete.
 */
async function analyticsFor(
  account: SocialAccount,
  metrics: CreatorMetrics,
  creatorRow: Row,
  peers: PeerRow[],
): Promise<CreatorAnalyticsData> {
  const { readCache } = await import("./cache.server");
  const cached = await readCache(account.platform, account.handle.toLowerCase());

  const cachedPosts = cached?.profile.posts ?? [];
  const posts = cachedPosts.length > 0 ? cachedPosts : await loadPosts(creatorRow["id"]);

  const hasMetrics = metrics.avgLikes !== null || metrics.engagementRate !== null;
  const dataQuality: DataQuality =
    cached?.profile.dataQuality ?? (hasMetrics ? "valid" : "unavailable");

  return {
    posts,
    signals: signalsFrom(creatorRow),
    peers: peerStatsFrom(peers),
    dataQuality,
    metricsFetchedAt: cached?.profile.metricsFetchedAt ?? metrics.lastFetchedAt,
  };
}

export async function getCreatorIdentity(db: Db, userId: string): Promise<CreatorIdentity> {
  const row = await loadProfileRow(db, userId);
  if (!row) {
    return {
      profile: null,
      socialAccounts: [],
      metrics: null,
      benchmark: null,
      similar: [],
      analytics: null,
      isPlaceholderData: true,
    };
  }

  const profile = mapProfile(row);
  const socialAccounts = await loadSocialAccounts(db, profile.id);
  const primary = socialAccounts[0];
  if (!primary) {
    return {
      profile,
      socialAccounts,
      metrics: null,
      benchmark: null,
      similar: [],
      analytics: null,
      isPlaceholderData: true,
    };
  }

  const { metrics, creatorRow } = await metricsFor(primary);
  if (!metrics || !creatorRow) {
    return {
      profile,
      socialAccounts,
      metrics: null,
      benchmark: null,
      similar: [],
      analytics: null,
      isPlaceholderData: true,
    };
  }

  const category = (creatorRow["category"] as string | null) ?? null;
  const peers = await loadPeerRows(metrics);
  const comparable = comparablePeers(peers, metrics, category);

  return {
    // The profile shown must represent the CONNECTED account, never stale
    // seeded identity data from another persona.
    profile: withConnectedAccountIdentity(profile, primary, creatorRow),
    socialAccounts,
    metrics,
    benchmark: benchmarkFrom(creatorRow, metrics, comparable.length),
    similar: similarCreators(peers, metrics, category),
    analytics: await analyticsFor(primary, metrics, creatorRow, comparable),
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
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "creator";
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
  if (!handle)
    throw new Error("Enter a valid handle — letters, numbers, dots and underscores only.");
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

export async function disconnectSocialAccount(
  db: Db,
  userId: string,
  id: string,
): Promise<{ ok: true }> {
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
  const result = await analyzeCreatorHandler({
    platform: account.platform,
    username: account.handle,
  });

  await db
    .from("social_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", account.id);

  return { ok: true as const, cached: result.cached, fetchedAt: result.fetchedAt };
}
