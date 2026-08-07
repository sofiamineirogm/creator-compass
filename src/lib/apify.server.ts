/**
 * Apify service layer. The only place in the app that talks to Apify.
 * Server-only: never import this from a component.
 */
import {
  CreatorLookupError,
  type CreatorPost,
  type CreatorProfile,
  type Platform,
} from "./creator-types";
import { computeEngagementRate } from "./scoring/engine";

/** Providers return the literal string "None" for missing categories. */
function cleanCategory(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v || v.toLowerCase() === "none" || v.toLowerCase() === "null") return null;
  return v;
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/apify";
const ACTORS: Record<Platform, string> = {
  instagram: "apify~instagram-profile-scraper",
  tiktok: "clockworks~tiktok-scraper",
};
const TIMEOUT_MS = 120_000;

/**
 * Conservative batch size for the synchronous gateway run. The actor is called
 * with one run per chunk; larger chunks risk the 110s sync timeout.
 */
export const MAX_BATCH_SIZE = 5;

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * Runs the platform actor for one or more usernames.
 * Instagram natively supports a `usernames` array; TikTok a `profiles` array.
 */
async function runActor(platform: Platform, usernames: string[]): Promise<unknown[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const apifyKey = process.env["APIFY_API_KEY"];
  if (!lovableKey || !apifyKey) {
    throw new CreatorLookupError("not_configured", "The data provider is not connected yet.");
  }

  const input =
    platform === "instagram"
      ? { usernames }
      : {
          profiles: usernames,
          resultsPerPage: 12,
          shouldDownloadCovers: false,
          shouldDownloadVideos: false,
          shouldDownloadSubtitles: false,
          shouldDownloadSlideshowImages: false,
        };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `${GATEWAY_URL}/acts/${ACTORS[platform]}/run-sync-get-dataset-items?timeout=110`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apifyKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new CreatorLookupError("timeout", "The provider took too long to respond. Try again.");
    }
    throw new CreatorLookupError("upstream_error", "Could not reach the data provider.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(`Apify request failed [${response.status}]: ${body}`);
    if (response.status === 429) {
      throw new CreatorLookupError("rate_limited", "Too many requests right now. Try again shortly.");
    }
    if (response.status === 404) {
      throw new CreatorLookupError("not_found", "That profile could not be found.");
    }
    throw new CreatorLookupError("upstream_error", "The data provider returned an error.");
  }

  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

/**
 * Null when there are no usable posts. An empty post list means
 * "metrics unavailable", never "zero engagement".
 */
function averages(posts: CreatorPost[]): { likes: number; comments: number; views: number } | null {
  if (posts.length === 0) return null;
  const sum = posts.reduce(
    (acc, p) => ({ likes: acc.likes + p.likes, comments: acc.comments + p.comments, views: acc.views + p.views }),
    { likes: 0, comments: 0, views: 0 },
  );
  return {
    likes: sum.likes / posts.length,
    comments: sum.comments / posts.length,
    views: sum.views / posts.length,
  };
}

function mapInstagram(item: Record<string, unknown>): CreatorProfile {
  if (item["error"] || (!item["username"] && !item["id"])) {
    throw new CreatorLookupError("not_found", "That Instagram profile does not exist or was removed.");
  }
  const rawPosts = Array.isArray(item["latestPosts"]) ? (item["latestPosts"] as Record<string, unknown>[]) : [];
  const posts: CreatorPost[] = rawPosts.slice(0, 12).map((p) => ({
    externalId: String(p["id"] ?? p["shortCode"] ?? crypto.randomUUID()),
    caption: (p["caption"] as string) ?? null,
    url: (p["url"] as string) ?? null,
    thumbnailUrl: (p["displayUrl"] as string) ?? null,
    likes: num(p["likesCount"]),
    comments: num(p["commentsCount"]),
    views: num(p["videoViewCount"] ?? p["videoPlayCount"]),
    postedAt: (p["timestamp"] as string) ?? null,
  }));

  const links = Array.isArray(item["externalUrls"])
    ? (item["externalUrls"] as Record<string, unknown>[]).map((l) => ({
        title: (l["title"] as string) ?? null,
        url: String(l["url"] ?? ""),
        linkType: str(l["link_type"] ?? l["linkType"]),
      }))
    : [];

  const avg = averages(posts);
  const profile: CreatorProfile = {
    platform: "instagram",
    username: String(item["username"] ?? "").toLowerCase(),
    fullName: (item["fullName"] as string) ?? null,
    biography: (item["biography"] as string) ?? null,
    avatarUrl: (item["profilePicUrlHD"] as string) ?? (item["profilePicUrl"] as string) ?? null,
    profileUrl: (item["url"] as string) ?? null,
    isVerified: Boolean(item["verified"]),
    isPrivate: Boolean(item["private"]),
    followers: num(item["followersCount"]),
    following: num(item["followsCount"]),
    postsCount: num(item["postsCount"]),
    avgLikes: avg ? avg.likes : null,
    avgComments: avg ? avg.comments : null,
    avgViews: avg ? avg.views : null,
    engagementRate: null,
    category: cleanCategory(item["businessCategoryName"]),
    country: null,
    externalLinks: links.filter((l) => l.url),
    posts,
    lastFetchedAt: new Date().toISOString(),
    externalId: str(item["id"]),
    isBusinessAccount: Boolean(item["isBusinessAccount"]),
    facebookId: str(item["fbid"]),
    dataQuality: avg ? "valid" : "unavailable",
  };
  profile.engagementRate = computeEngagementRate(profile);
  if (profile.isPrivate && posts.length === 0) {
    throw new CreatorLookupError(
      "private_account",
      "This account is private, so its performance data cannot be analysed.",
    );
  }
  return profile;
}

function mapTikTok(items: Record<string, unknown>[]): CreatorProfile {
  const first = items.find((i) => i["authorMeta"]);
  if (!first) {
    throw new CreatorLookupError("not_found", "That TikTok profile does not exist or has no public videos.");
  }
  const author = first["authorMeta"] as Record<string, unknown>;
  if (author["privateAccount"]) {
    throw new CreatorLookupError("private_account", "This TikTok account is private.");
  }

  const posts: CreatorPost[] = items.slice(0, 12).map((p) => ({
    externalId: String(p["id"] ?? crypto.randomUUID()),
    caption: (p["text"] as string) ?? null,
    url: (p["webVideoUrl"] as string) ?? null,
    thumbnailUrl:
      ((p["videoMeta"] as Record<string, unknown> | undefined)?.["coverUrl"] as string) ?? null,
    likes: num(p["diggCount"]),
    comments: num(p["commentCount"]),
    views: num(p["playCount"]),
    postedAt: (p["createTimeISO"] as string) ?? null,
  }));

  const avg = averages(posts);
  const bioLink = author["bioLink"];
  const profile: CreatorProfile = {
    platform: "tiktok",
    username: String(author["name"] ?? "").toLowerCase(),
    fullName: (author["nickName"] as string) ?? null,
    biography: (author["signature"] as string) ?? null,
    avatarUrl: (author["avatar"] as string) ?? null,
    profileUrl: (author["profileUrl"] as string) ?? null,
    isVerified: Boolean(author["verified"]),
    isPrivate: Boolean(author["privateAccount"]),
    followers: num(author["fans"]),
    following: num(author["following"]),
    postsCount: num(author["video"]),
    avgLikes: avg ? avg.likes : null,
    avgComments: avg ? avg.comments : null,
    avgViews: avg ? avg.views : null,
    engagementRate: null,
    category: cleanCategory(
      (author["commerceUserInfo"] as Record<string, unknown> | undefined)?.["category"],
    ),
    country: null,
    externalLinks: typeof bioLink === "string" && bioLink ? [{ title: "Bio link", url: bioLink }] : [],
    posts,
    lastFetchedAt: new Date().toISOString(),
    externalId: str(author["id"]),
    dataQuality: avg ? "valid" : "unavailable",
  };
  profile.engagementRate = computeEngagementRate(profile);
  return profile;
}

export interface RawProfileFetch {
  profile: CreatorProfile;
  /** Raw provider dataset item, persisted for debugging and future extraction. */
  raw: unknown;
}

/** Single-profile fetch. Behaviour unchanged for existing callers. */
export async function fetchCreatorFromApify(
  platform: Platform,
  username: string,
): Promise<CreatorProfile> {
  return (await fetchCreatorWithRaw(platform, username)).profile;
}

export async function fetchCreatorWithRaw(
  platform: Platform,
  username: string,
): Promise<RawProfileFetch> {
  const items = (await runActor(platform, [username])) as Record<string, unknown>[];
  if (items.length === 0) {
    throw new CreatorLookupError("not_found", `No ${platform} profile found for @${username}.`);
  }
  if (platform === "instagram") {
    return { profile: mapInstagram(items[0]!), raw: items[0] };
  }
  return { profile: mapTikTok(items), raw: items.slice(0, 12) };
}

export type BatchFetchOutcome =
  | { ok: true; profile: CreatorProfile; raw: unknown }
  | { ok: false; error: string };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Batch-capable enrichment path. One actor run per conservative chunk, each
 * returned item mapped back to its username. Individual failures never fail
 * the whole batch.
 */
export async function fetchCreatorsFromApify(
  platform: Platform,
  usernames: string[],
  batchSize = MAX_BATCH_SIZE,
): Promise<Map<string, BatchFetchOutcome>> {
  const results = new Map<string, BatchFetchOutcome>();
  const unique = [...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return results;

  // TikTok returns video-level rows and needs per-profile grouping, so its
  // batch path stays one run per profile for correctness.
  const size = platform === "instagram" ? Math.max(1, Math.min(batchSize, MAX_BATCH_SIZE)) : 1;

  for (const group of chunk(unique, size)) {
    let items: Record<string, unknown>[] = [];
    try {
      items = (await runActor(platform, group)) as Record<string, unknown>[];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider request failed.";
      for (const u of group) results.set(u, { ok: false, error: message });
      continue;
    }

    if (platform === "instagram") {
      for (const u of group) {
        const item = items.find(
          (i) => String(i["username"] ?? "").toLowerCase() === u || String(i["inputUrl"] ?? "").toLowerCase().includes(`/${u}`),
        );
        if (!item) {
          results.set(u, { ok: false, error: `No Instagram profile found for @${u}.` });
          continue;
        }
        try {
          results.set(u, { ok: true, profile: mapInstagram(item), raw: item });
        } catch (error) {
          results.set(u, { ok: false, error: error instanceof Error ? error.message : "Could not map profile." });
        }
      }
    } else {
      const u = group[0]!;
      try {
        results.set(u, { ok: true, profile: mapTikTok(items), raw: items.slice(0, 12) });
      } catch (error) {
        results.set(u, { ok: false, error: error instanceof Error ? error.message : "Could not map profile." });
      }
    }
  }

  return results;
}
