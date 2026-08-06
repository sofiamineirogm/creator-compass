import type { Platform } from "../creator-types";

/**
 * Configurable scoring parameters.
 * The engine reads everything from here — tuning the product never means
 * touching engine logic or UI code.
 */
export interface ScoringConfig {
  weights: {
    brand: number;
    engagement: number;
    accessibility: number;
    growth: number;
  };
  /** Healthy engagement-rate targets (percent) by platform. Reaching the target scores 100. */
  engagementTarget: Record<Platform, number>;
  /** Follower counts that map to the top of the reach curve. */
  reachCeiling: Record<Platform, number>;
  brand: {
    bioMinLength: number;
    bioIdealLength: number;
    verifiedBonus: number;
    externalLinkBonus: number;
    categoryBonus: number;
    nameBonus: number;
  };
  accessibility: {
    captionMinLength: number;
    altOrCaptionWeight: number;
    publicAccountWeight: number;
    contactableWeight: number;
    consistencyWeight: number;
  };
  growth: {
    /** Posts within this window count as "recent". */
    recentDays: number;
    idealPostsPerMonth: number;
    followerRatioIdeal: number;
  };
}

export const defaultScoringConfig: ScoringConfig = {
  weights: { brand: 0.25, engagement: 0.35, accessibility: 0.15, growth: 0.25 },
  engagementTarget: { instagram: 3.5, tiktok: 6 },
  reachCeiling: { instagram: 5_000_000, tiktok: 5_000_000 },
  brand: {
    bioMinLength: 20,
    bioIdealLength: 120,
    verifiedBonus: 12,
    externalLinkBonus: 14,
    categoryBonus: 8,
    nameBonus: 6,
  },
  accessibility: {
    captionMinLength: 40,
    altOrCaptionWeight: 40,
    publicAccountWeight: 25,
    contactableWeight: 20,
    consistencyWeight: 15,
  },
  growth: { recentDays: 30, idealPostsPerMonth: 12, followerRatioIdeal: 50 },
};
