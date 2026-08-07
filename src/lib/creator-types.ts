/**
 * Shared, browser-safe domain types for CreatorIQ.
 * No server-only imports may ever appear in this file.
 */

export type Platform = "instagram" | "tiktok";

export const PLATFORMS: Platform[] = ["instagram", "tiktok"];

export type PlatformSelection = Platform | "both";

export interface CreatorLink {
  title: string | null;
  url: string;
  /** Provider-supplied link classification (e.g. "facebook_page"). */
  linkType?: string | null;
}

export interface CreatorPost {
  externalId: string;
  caption: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  likes: number;
  comments: number;
  views: number;
  postedAt: string | null;
}

/**
 * Quality of the metrics attached to a profile.
 * VALID              — post metrics came from the latest successful fetch.
 * UNAVAILABLE        — the provider returned no usable posts and we have no history.
 * INCOMPLETE_REFRESH — the latest fetch returned no posts, so previous valid
 *                      metrics were preserved instead of being zeroed.
 */
export type DataQuality = "valid" | "unavailable" | "incomplete_refresh";

/** Platform-agnostic creator shape produced by the Apify service layer. */
export interface CreatorProfile {
  platform: Platform;
  username: string;
  fullName: string | null;
  biography: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followers: number;
  following: number;
  postsCount: number;
  /** Null means "unavailable" — never treat as zero engagement. */
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  engagementRate: number | null;
  category: string | null;
  country: string | null;
  externalLinks: CreatorLink[];
  posts: CreatorPost[];
  lastFetchedAt: string;
  /** Platform numeric/opaque account id, when the provider exposes it. */
  externalId?: string | null;
  isBusinessAccount?: boolean;
  facebookId?: string | null;
  dataQuality?: DataQuality;
  /** When metrics were preserved from an earlier fetch. */
  metricsFetchedAt?: string | null;
}

/** True when the profile carries real post-derived engagement metrics. */
export function hasPostMetrics(profile: CreatorProfile): boolean {
  return (
    typeof profile.avgLikes === "number" &&
    typeof profile.avgComments === "number" &&
    typeof profile.engagementRate === "number"
  );
}


export interface ScoreBreakdown {
  overall: number;
  brand: number;
  engagement: number;
  accessibility: number;
  growth: number;
}

export interface ScoreSection {
  key: keyof Omit<ScoreBreakdown, "overall">;
  label: string;
  score: number;
  summary: string;
}

export interface PremiumInsight {
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
}

export interface PremiumAnalysis {
  strengths: PremiumInsight[];
  weaknesses: PremiumInsight[];
  recommendations: PremiumInsight[];
  priorities: string[];
  estimatedImpact: string;
}

export interface CreatorReport {
  scores: ScoreBreakdown;
  sections: ScoreSection[];
  premium: PremiumAnalysis;
  benchmark: BenchmarkResult;
}

export interface BenchmarkResult {
  peerGroup: string;
  percentile: number;
  standing: "Top 10%" | "Top 25%" | "Above Average" | "Average" | "Below Average";
  averageEngagement: number;
  top25Engagement: number;
  top10Engagement: number;
}

export interface AnalyzeResult {
  creator: CreatorProfile;
  /** Null when there are no usable metrics to score. */
  report: CreatorReport | null;
  cached: boolean;
  fetchedAt: string;
  /** When the cached copy goes stale, if known. */
  expiresAt?: string | null;
  /** User-facing note about cache/rate-limit behaviour. */
  notice?: string | null;
  dataQuality?: DataQuality;
}


export class CreatorLookupError extends Error {
  code:
    | "invalid_username"
    | "not_found"
    | "private_account"
    | "rate_limited"
    | "timeout"
    | "upstream_error"
    | "not_configured";

  constructor(code: CreatorLookupError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "CreatorLookupError";
  }
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;

export function normalizeUsername(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!USERNAME_PATTERN.test(cleaned)) return null;
  return cleaned;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}
