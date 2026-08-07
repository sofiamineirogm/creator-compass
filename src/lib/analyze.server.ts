import { fetchCreatorFromApify } from "./apify.server";
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
import { CreatorLookupError, type AnalyzeResult } from "./creator-types";
import { generateReport } from "./scoring/engine";
import type { AnalyzeInput } from "./analyze-input";

export type { AnalyzeInput };

function fromCache(entry: CacheEntry, notice?: string): AnalyzeResult {
  return {
    creator: entry.profile,
    report: entry.report ?? generateReport(entry.profile),
    cached: true,
    fetchedAt: entry.lastFetchedAt,
    expiresAt: entry.expiresAt,
    notice: notice ?? null,
  };
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
      const profile = await fetchCreatorFromApify(platform, username);
      const report = generateReport(profile);

      await writeCache(platform, username, profile, report);
      const creatorId = await saveCreator(profile);
      await saveReport(creatorId, report);
      await recordSearch(platform, username, creatorId);

      return {
        creator: profile,
        report,
        cached: false,
        fetchedAt: profile.lastFetchedAt,
        expiresAt: null,
        notice: null,
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
