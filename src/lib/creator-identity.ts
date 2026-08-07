/**
 * Browser-safe types for the creator identity layer.
 *
 * The model is deliberately three-tiered:
 *   User account  ->  Creator profile  ->  Social accounts  ->  Analysis data
 * Social metrics are never attached to the user record.
 */
import type { CreatorPost, DataQuality, Platform } from "./creator-types";
import type { PeerStats, ProfileSignals } from "./analytics/kpi";


export type SocialConnectionType = "public_handle" | "oauth";

export interface SocialAccount {
  id: string;
  creatorProfileId: string;
  platform: Platform;
  handle: string;
  platformUserId: string | null;
  profileUrl: string | null;
  connectionType: SocialConnectionType;
  connectedAt: string;
  lastSyncedAt: string | null;
}

export interface CreatorIdentityProfile {
  id: string;
  userId: string;
  displayName: string;
  handle: string | null;
  bio: string | null;
  headline: string | null;
  profileImage: string | null;
  /** Primary category — first entry of the profile's category list. */
  category: string | null;
  categories: string[];
  location: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorMetrics {
  platform: Platform;
  handle: string;
  followers: number;
  following: number;
  postsCount: number;
  /** Null means unavailable — never render as zero. */
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  engagementRate: number | null;
  overallScore: number | null;
  brandScore: number | null;
  engagementScore: number | null;
  accessibilityScore: number | null;
  growthScore: number | null;
  lastFetchedAt: string | null;
}

/**
 * Minimum number of valid comparable peers required before a percentile may be
 * shown. Below this we say so instead of extrapolating from a tiny sample.
 */
export const MINIMUM_BENCHMARK_PEERS = 10;

/** Minimum candidates before the "similar creators" list is meaningful. */
export const MINIMUM_SIMILAR_CREATORS = 3;

export interface CreatorBenchmark {
  peerGroup: string;
  /** Null when fewer than MINIMUM_BENCHMARK_PEERS valid peers exist. */
  percentile: number | null;
  /** Null when no percentile can be computed. */
  standing: string | null;
  /** Count of real, analysed, comparable creators backing this benchmark. */
  peerCount: number;
  averageEngagement: number;
  top25Engagement: number;
  top10Engagement: number;
}

export interface SimilarCreator {
  platform: Platform;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  followers: number;
  engagementRate: number;
  /** Human-readable reason this creator qualified. Never a fabricated score. */
  reason: string;
}

export interface CreatorIdentity {
  profile: CreatorIdentityProfile | null;
  socialAccounts: SocialAccount[];
  /** Metrics for the primary connected account, when analysis data exists. */
  metrics: CreatorMetrics | null;
  benchmark: CreatorBenchmark | null;
  similar: SimilarCreator[];
  /** True when no real analysis has run yet and placeholders are shown. */
  isPlaceholderData: boolean;
}

export const ONBOARDING_STEPS = [
  { key: "profile", title: "Create your creator profile", description: "Name, category and location." },
  { key: "connect", title: "Connect a social account", description: "Add your public Instagram or TikTok handle." },
  { key: "confirm", title: "Confirm your profile", description: "Review and publish to the marketplace." },
  { key: "done", title: "See your creator dashboard", description: "Metrics, benchmarks and similar creators." },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export function nextOnboardingStep(identity: CreatorIdentity | null | undefined): OnboardingStepKey {
  if (!identity?.profile) return "profile";
  if (identity.socialAccounts.length === 0) return "connect";
  if (!identity.profile.isPublished) return "confirm";
  return "done";
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

export function profileUrlFor(platform: Platform, handle: string): string {
  return platform === "tiktok"
    ? `https://www.tiktok.com/@${handle}`
    : `https://www.instagram.com/${handle}`;
}
