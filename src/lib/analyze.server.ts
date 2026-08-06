import { fetchCreatorFromApify } from "./apify.server";
import {
  isFresh,
  loadCachedCreator,
  recordSearch,
  saveCreator,
  saveReport,
} from "./creators.server";
import { CreatorLookupError, type AnalyzeResult } from "./creator-types";
import { generateReport } from "./scoring/engine";
import type { AnalyzeInput } from "./analyze-input";

export type { AnalyzeInput };

export async function analyzeCreatorHandler(data: AnalyzeInput): Promise<AnalyzeResult> {
  const { platform, username, refresh } = data;

  try {
    if (!refresh) {
      const cached = await loadCachedCreator(platform, username);
      if (cached && isFresh(cached.profile.lastFetchedAt)) {
        const report = generateReport(cached.profile);
        return { creator: cached.profile, report, cached: true, fetchedAt: cached.profile.lastFetchedAt };
      }
    }

    const profile = await fetchCreatorFromApify(platform, username);
    const report = generateReport(profile);
    const creatorId = await saveCreator(profile);
    await saveReport(creatorId, report);
    await recordSearch(platform, username, creatorId);

    return { creator: profile, report, cached: false, fetchedAt: profile.lastFetchedAt };
  } catch (error) {
    if (error instanceof CreatorLookupError) {
      throw new Error(error.message);
    }
    console.error("analyzeCreator failed", error);
    throw new Error("Something went wrong while analysing this profile. Please try again.");
  }
}
