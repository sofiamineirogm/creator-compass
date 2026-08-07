/**
 * Persistence layer for creators: cache reads, upserts and report storage.
 * Server-only.
 */
import type { CreatorProfile, Platform } from "./creator-types";
import type { CreatorReport } from "./creator-types";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type Row = Record<string, any>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Null stays null: an absent metric is "unavailable", not zero. */
function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowToProfile(row: Row, posts: Row[]): CreatorProfile {
  return {
    platform: row["platform"] as Platform,
    username: row["username"],
    fullName: row["full_name"],
    biography: row["biography"],
    avatarUrl: row["avatar_url"],
    profileUrl: row["profile_url"],
    isVerified: row["is_verified"],
    isPrivate: row["is_private"],
    followers: Number(row["followers"]),
    following: Number(row["following"]),
    postsCount: Number(row["posts_count"]),
    avgLikes: numOrNull(row["avg_likes"]),
    avgComments: numOrNull(row["avg_comments"]),
    avgViews: numOrNull(row["avg_views"]),
    engagementRate: numOrNull(row["engagement_rate"]),
    category: row["category"],
    country: row["country"],
    externalLinks: (row["external_links"] as CreatorProfile["externalLinks"]) ?? [],
    posts: posts.map((p) => ({
      externalId: p["external_id"],
      caption: p["caption"],
      url: p["url"],
      thumbnailUrl: p["thumbnail_url"],
      likes: Number(p["likes"]),
      comments: Number(p["comments"]),
      views: Number(p["views"]),
      postedAt: p["posted_at"],
    })),
    lastFetchedAt: row["last_fetched_at"],
  };
}


export async function loadCachedCreator(
  platform: Platform,
  username: string,
): Promise<{ profile: CreatorProfile; creatorId: string } | null> {
  const db = await admin();
  const { data, error } = await db
    .from("creators")
    .select("*")
    .eq("platform", platform)
    .eq("username", username)
    .maybeSingle();
  if (error || !data) return null;

  const { data: posts } = await db
    .from("creator_posts")
    .select("*")
    .eq("creator_id", (data as Row)["id"])
    .order("posted_at", { ascending: false });

  return { profile: rowToProfile(data as Row, (posts as Row[]) ?? []), creatorId: (data as Row)["id"] };
}

export function isFresh(lastFetchedAt: string): boolean {
  return Date.now() - new Date(lastFetchedAt).getTime() < CACHE_TTL_MS;
}

export async function saveCreator(profile: CreatorProfile, raw?: unknown): Promise<string> {
  const db = await admin();

  const payload: Row = {
    platform: profile.platform,
    username: profile.username,
    full_name: profile.fullName,
    biography: profile.biography,
    avatar_url: profile.avatarUrl,
    profile_url: profile.profileUrl,
    is_verified: profile.isVerified,
    is_private: profile.isPrivate,
    followers: Math.round(profile.followers),
    following: Math.round(profile.following),
    posts_count: Math.round(profile.postsCount),
    category: profile.category,
    country: profile.country,
    external_links: profile.externalLinks as unknown as Row,
    last_fetched_at: profile.lastFetchedAt,
  };

  // Only write metrics we actually have. Omitted columns keep their previous
  // value on conflict, so a post-less refresh never zeroes valid history.
  if (profile.avgLikes !== null) payload["avg_likes"] = profile.avgLikes;
  if (profile.avgComments !== null) payload["avg_comments"] = profile.avgComments;
  if (profile.avgViews !== null) payload["avg_views"] = profile.avgViews;
  if (profile.engagementRate !== null) payload["engagement_rate"] = profile.engagementRate;

  // Raw provider payload: debugging, future field extraction, schema drift.
  if (raw !== undefined) payload["raw"] = raw as Row;

  const { data, error } = await db
    .from("creators")
    .upsert(payload, { onConflict: "platform,username" })
    .select("id")
    .single();


  if (error || !data) throw new Error(error?.message ?? "Could not save creator");
  const creatorId = (data as Row)["id"] as string;

  if (profile.posts.length > 0) {
    await db.from("creator_posts").upsert(
      profile.posts.map((p) => ({
        creator_id: creatorId,
        external_id: p.externalId,
        caption: p.caption,
        url: p.url,
        thumbnail_url: p.thumbnailUrl,
        likes: Math.round(p.likes),
        comments: Math.round(p.comments),
        views: Math.round(p.views),
        posted_at: p.postedAt,
      })),
      { onConflict: "creator_id,external_id" },
    );
  }
  return creatorId;
}

export async function saveReport(creatorId: string, report: CreatorReport): Promise<void> {
  const db = await admin();
  await db.from("reports").insert({
    creator_id: creatorId,
    overall_score: report.scores.overall,
    brand_score: report.scores.brand,
    engagement_score: report.scores.engagement,
    accessibility_score: report.scores.accessibility,
    growth_score: report.scores.growth,
    summaries: report.sections as unknown as Row,
    premium: report.premium as unknown as Row,
  });
}

export async function recordSearch(platform: Platform, username: string, creatorId: string | null) {
  const db = await admin();
  await db.from("search_history").insert({ platform, username, creator_id: creatorId });
}
