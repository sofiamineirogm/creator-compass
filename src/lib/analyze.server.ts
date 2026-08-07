import { fetchCreatorWithRaw, fetchCreatorsFromApify, MAX_BATCH_SIZE } from "./apify.server";
import { recordSearch, saveCreator, saveReport } from "./creators.server";
import {
  acquireLock,
  readCache,
  refreshAllowedAt,
  releaseLock,
  waitForInFlight,
  writeCache,
  writeCacheError,
  type CacheEntry,
} from "./cache.server";
import {
  CreatorLookupError,
  hasPostMetrics,
  type AnalyzeResult,
  type CreatorProfile,
  type DataQuality,
  type Platform,
} from "./creator-types";
import { generateReport } from "./scoring/engine";
import type { AnalyzeInput } from "./analyze-input";

export type { AnalyzeInput };

function reportFor(profile: CreatorProfile) {
  // NO REAL METRICS = NO REPORT. Never score fabricated zeros.
  return hasPostMetrics(profile) ? generateReport(profile) : null;
}

function fromCache(entry: CacheEntry, notice?: string): AnalyzeResult {
  return {
    creator: entry.profile,
    report: entry.report ?? reportFor(entry.profile),
    cached: true,
    fetchedAt: entry.lastFetchedAt,
    expiresAt: entry.expiresAt,
    notice: notice ?? null,
    dataQuality: entry.profile.dataQuality ?? (hasPostMetrics(entry.profile) ? "valid" : "unavailable"),
  };
}

/**
 * A refresh that came back without usable posts must never destroy valid
 * history: previous metrics and posts are carried forward and the refresh is
 * flagged as incomplete.
 */
function preserveMetrics(fresh: CreatorProfile, previous: CreatorProfile | null): CreatorProfile {
  if (hasPostMetrics(fresh)) return { ...fresh, dataQuality: "valid", metricsFetchedAt: fresh.lastFetchedAt };
  if (previous && hasPostMetrics(previous)) {
    return {
      ...fresh,
      avgLikes: previous.avgLikes,
      avgComments: previous.avgComments,
      avgViews: previous.avgViews,
      engagementRate: previous.engagementRate,
      posts: previous.posts,
      dataQuality: "incomplete_refresh",
      metricsFetchedAt: previous.metricsFetchedAt ?? previous.lastFetchedAt,
    };
  }
  return { ...fresh, dataQuality: "unavailable", metricsFetchedAt: null };
}

/** Fetch + persist one profile. Shared by the single and batch paths. */
async function fetchAndPersist(
  platform: Platform,
  username: string,
  previous: CreatorProfile | null,
): Promise<{ profile: CreatorProfile; report: ReturnType<typeof generateReport> | null; creatorId: string }> {
  const { profile: fetched, raw } = await fetchCreatorWithRaw(platform, username);
  const profile = preserveMetrics(fetched, previous);
  const report = reportFor(profile);

  await writeCache(platform, username, profile, report);
  const creatorId = await saveCreator(profile, raw);
  if (report) await saveReport(creatorId, report);
  return { profile, report, creatorId };
}

export async function analyzeCreatorHandler(data: AnalyzeInput): Promise<AnalyzeResult> {
  const { platform, username, refresh } = data;

  try {
    const cached = await readCache(platform, username);

    if (cached && !refresh && cached.fresh) return fromCache(cached);

    // Manual refreshes are rate limited so one user cannot hammer the provider.
    if (cached && refresh) {
      const allowedAt = refreshAllowedAt(cached.lastFetchedAt);
      if (Date.now() < allowedAt) {
        const mins = Math.max(1, Math.ceil((allowedAt - Date.now()) / 60_000));
        return fromCache(cached, `Recently refreshed — new data available in about ${mins} min.`);
      }
    }

    // Deduplicate concurrent lookups for the same profile.
    const locked = await acquireLock(platform, username);
    if (!locked) {
      const settled = await waitForInFlight(platform, username);
      if (settled) return fromCache(settled, "Served from an in-progress lookup.");
      if (cached) return fromCache(cached, "Showing the last known data while a refresh finishes.");
      throw new CreatorLookupError("rate_limited", "This profile is being analysed right now. Try again in a moment.");
    }

    try {
      const { profile, report } = await fetchAndPersist(platform, username, cached?.profile ?? null);
      const creatorIdSearch = await recordSearchSafely(platform, username);
      void creatorIdSearch;

      return {
        creator: profile,
        report,
        cached: false,
        fetchedAt: profile.lastFetchedAt,
        expiresAt: null,
        notice:
          profile.dataQuality === "incomplete_refresh"
            ? "The provider returned no recent posts this time — showing the last valid metrics."
            : profile.dataQuality === "unavailable"
              ? "No recent posts were returned, so engagement metrics are unavailable."
              : null,
        dataQuality: profile.dataQuality ?? "valid",
      };
    } finally {
      await releaseLock(platform, username);
    }
  } catch (error) {
    if (error instanceof CreatorLookupError) {
      await writeCacheError(platform, username, error.message);
      throw new Error(error.message);
    }
    console.error("analyzeCreator failed", error);
    throw new Error("Something went wrong while analysing this profile. Please try again.");
  }
}

async function recordSearchSafely(platform: Platform, username: string) {
  try {
    const { loadCachedCreator } = await import("./creators.server");
    const existing = await loadCachedCreator(platform, username);
    await recordSearch(platform, username, existing?.creatorId ?? null);
  } catch (error) {
    console.error("recordSearch failed", error);
  }
}

export interface BatchEnrichResult {
  username: string;
  status: "cached" | "enriched" | "skipped" | "failed";
  dataQuality?: DataQuality;
  error?: string;
}

/**
 * Batch enrichment for internal pipelines (future Creator Discovery).
 * Reuses the same per-profile cache, TTL, cooldown and lock rules as the
 * single-profile path, so nothing about analyzeCreator changes.
 */
export async function enrichCreatorsBatch(
  platform: Platform,
  usernames: string[],
  options: { batchSize?: number; force?: boolean } = {},
): Promise<BatchEnrichResult[]> {
  const unique = [...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))];
  const results: BatchEnrichResult[] = [];
  const toFetch: string[] = [];
  const previousByUser = new Map<string, CreatorProfile | null>();

  for (const username of unique) {
    const cached = await readCache(platform, username);
    previousByUser.set(username, cached?.profile ?? null);
    if (cached?.fresh && !options.force) {
      results.push({
        username,
        status: "cached",
        dataQuality: cached.profile.dataQuality ?? "valid",
      });
      continue;
    }
    const locked = await acquireLock(platform, username);
    if (!locked) {
      results.push({ username, status: "skipped", error: "Another lookup is already in flight." });
      continue;
    }
    toFetch.push(username);
  }

  if (toFetch.length === 0) return results;

  try {
    const fetched = await fetchCreatorsFromApify(
      platform,
      toFetch,
      Math.max(1, Math.min(options.batchSize ?? MAX_BATCH_SIZE, MAX_BATCH_SIZE)),
    );

    for (const username of toFetch) {
      const outcome = fetched.get(username);
      if (!outcome || !outcome.ok) {
        const message = outcome && !outcome.ok ? outcome.error : "No result returned for this profile.";
        await writeCacheError(platform, username, message);
        results.push({ username, status: "failed", error: message });
        continue;
      }
      try {
        const profile = preserveMetrics(outcome.profile, previousByUser.get(username) ?? null);
        const report = reportFor(profile);
        await writeCache(platform, username, profile, report);
        const creatorId = await saveCreator(profile, outcome.raw);
        if (report) await saveReport(creatorId, report);
        results.push({ username, status: "enriched", dataQuality: profile.dataQuality ?? "valid" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not persist profile.";
        results.push({ username, status: "failed", error: message });
      }
    }
  } finally {
    for (const username of toFetch) await releaseLock(platform, username);
  }

  return results;
}
