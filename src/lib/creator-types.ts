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
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  engagementRate: number;
  category: string | null;
  country: string | null;
  externalLinks: CreatorLink[];
  posts: CreatorPost[];
  lastFetchedAt: string;
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
  report: CreatorReport;
  cached: boolean;
  fetchedAt: string;
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
