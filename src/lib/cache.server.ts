/**
 * Database-backed cache for expensive Apify profile fetches.
 * Server-only. Handles TTL, refresh rate limiting and request deduplication
 * so the same profile never triggers parallel provider jobs.
 */
import type { CreatorProfile, CreatorReport, Platform } from "./creator-types";

type Row = Record<string, any>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Configurable via env; defaults to 24 hours. */
export function cacheTtlMs(): number {
  const hours = Number(process.env["PROFILE_CACHE_TTL_HOURS"] ?? 24);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3_600_000;
}

/** Minimum gap between manual refreshes of the same profile. */
export function refreshCooldownMs(): number {
  const mins = Number(process.env["PROFILE_REFRESH_COOLDOWN_MINUTES"] ?? 15);
  return (Number.isFinite(mins) && mins > 0 ? mins : 15) * 60_000;
}

/** How long a fetch may hold the dedup lock before it is considered dead. */
const LOCK_TTL_MS = 150_000;

export interface CacheEntry {
  profile: CreatorProfile;
  report: CreatorReport | null;
  lastFetchedAt: string;
  expiresAt: string | null;
  fresh: boolean;
}

export async function readCache(platform: Platform, username: string): Promise<CacheEntry | null> {
  const db = await admin();
  const { data } = await db
    .from("social_profile_cache")
    .select("*")
    .eq("platform", platform)
    .eq("username", username)
    .maybeSingle();

  const row = data as Row | null;
  if (!row || row["fetch_status"] !== "success" || !row["profile_data"]) return null;

  const expiresAt = row["expires_at"] as string | null;
  return {
    profile: row["profile_data"] as CreatorProfile,
    report: (row["analytics_data"] as CreatorReport | null) ?? null,
    lastFetchedAt: (row["last_fetched_at"] as string) ?? new Date(0).toISOString(),
    expiresAt,
    fresh: expiresAt ? new Date(expiresAt).getTime() > Date.now() : false,
  };
}

export async function writeCache(
  platform: Platform,
  username: string,
  profile: CreatorProfile,
  report: CreatorReport | null,
): Promise<void> {
  const db = await admin();
  const now = new Date();
  await db.from("social_profile_cache").upsert(
    {
      platform,
      username,
      profile_url: profile.profileUrl,
      profile_data: profile as unknown as Row,
      analytics_data: report as unknown as Row,
      fetch_status: "success",
      fetch_error: null,
      last_fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + cacheTtlMs()).toISOString(),
      locked_at: null,
    },
    { onConflict: "platform,username" },
  );
}

export async function writeCacheError(
  platform: Platform,
  username: string,
  message: string,
): Promise<void> {
  const db = await admin();
  const { data } = await db
    .from("social_profile_cache")
    .select("id, fetch_status")
    .eq("platform", platform)
    .eq("username", username)
    .maybeSingle();

  // Never downgrade a good cache entry because of a transient provider error.
  if ((data as Row | null)?.["fetch_status"] === "success") {
    await db
      .from("social_profile_cache")
      .update({ fetch_error: message, locked_at: null })
      .eq("id", (data as Row)["id"]);
    return;
  }

  await db.from("social_profile_cache").upsert(
    { platform, username, fetch_status: "error", fetch_error: message, locked_at: null },
    { onConflict: "platform,username" },
  );
}

/**
 * Try to claim the right to call the provider for this profile.
 * Returns false when another in-flight request already holds the lock.
 */
export async function acquireLock(platform: Platform, username: string): Promise<boolean> {
  const db = await admin();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TTL_MS).toISOString();

  await db
    .from("social_profile_cache")
    .upsert({ platform, username }, { onConflict: "platform,username", ignoreDuplicates: true });

  const { data } = await db
    .from("social_profile_cache")
    .update({ locked_at: now.toISOString() })
    .eq("platform", platform)
    .eq("username", username)
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .select("id");

  return Array.isArray(data) && data.length > 0;
}

export async function releaseLock(platform: Platform, username: string): Promise<void> {
  const db = await admin();
  await db
    .from("social_profile_cache")
    .update({ locked_at: null })
    .eq("platform", platform)
    .eq("username", username);
}

/** Wait for whoever holds the lock to finish, then read their result. */
export async function waitForInFlight(
  platform: Platform,
  username: string,
  timeoutMs = 45_000,
): Promise<CacheEntry | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1_500));
    const entry = await readCache(platform, username);
    if (entry?.fresh) return entry;
  }
  return readCache(platform, username);
}

export function refreshAllowedAt(lastFetchedAt: string): number {
  return new Date(lastFetchedAt).getTime() + refreshCooldownMs();
}
