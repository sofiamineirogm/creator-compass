/** Browser-safe marketplace domain types. No server imports here. */

export type CampaignStatus = "draft" | "open" | "closed" | "completed" | "archived";
export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "negotiation"
  | "accepted"
  | "rejected"
  | "completed"
  | "withdrawn";
export type PaymentModel = "fixed" | "per_deliverable" | "per_post" | "gifted" | "commission" | "hybrid";
export type LocationType = "remote" | "in_person" | "hybrid";

export const DELIVERABLES = [
  "Reel",
  "Story",
  "Post",
  "Carousel",
  "UGC",
  "TikTok Video",
  "Live",
  "Other",
] as const;

export const CATEGORIES = [
  "Beauty",
  "Fashion",
  "Fitness",
  "Food",
  "Gaming",
  "Lifestyle",
  "Music",
  "Parenting",
  "Sports",
  "Tech",
  "Travel",
  "Finance",
] as const;

export const OBJECTIVES = [
  "Awareness",
  "Product launch",
  "Conversions",
  "UGC library",
  "App installs",
  "Event coverage",
] as const;

export const APPLICATION_STAGES: ApplicationStatus[] = [
  "applied",
  "shortlisted",
  "negotiation",
  "accepted",
  "rejected",
  "completed",
];

export const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  negotiation: "Negotiation",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

export interface BrandSummary {
  id: string | null;
  companyName: string;
  logoUrl: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  description: string | null;
  isVerified: boolean;
}

export interface Campaign {
  id: string;
  brandUserId: string;
  title: string;
  description: string;
  objectives: string[];
  targetAudience: string | null;
  expectedContent: string | null;
  category: string | null;
  platforms: string[];
  deliverables: string[];
  budgetMin: number;
  budgetMax: number;
  currency: string;
  paymentModel: PaymentModel;
  location: string | null;
  locationType: LocationType;
  languages: string[];
  minFollowers: number;
  maxFollowers: number | null;
  minEngagementRate: number;
  creatorCategories: string[];
  audienceRequirements: string | null;
  applicationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  creatorsNeeded: number;
  status: CampaignStatus;
  applicantsCount: number;
  createdAt: string;
  brand: BrandSummary;
}

export interface CampaignFilters {
  search?: string | undefined;
  platform?: string | undefined;
  category?: string | undefined;
  location?: string | undefined;
  minBudget?: number | undefined;
  deliverable?: string | undefined;
  followerBand?: string | undefined;
  maxEngagement?: number | undefined;
  locationType?: LocationType | "any" | undefined;
  openOnly?: boolean | undefined;
  sort?: CampaignSort | undefined;
}

export type CampaignSort = "best_match" | "newest" | "highest_budget" | "deadline" | "most_relevant";

export const SORT_LABELS: Record<CampaignSort, string> = {
  best_match: "Best Match",
  newest: "Newest",
  highest_budget: "Highest Budget",
  deadline: "Deadline",
  most_relevant: "Most Relevant",
};

export const FOLLOWER_BANDS: { key: string; label: string; min: number; max: number | null }[] = [
  { key: "nano", label: "1K – 10K", min: 1000, max: 10000 },
  { key: "micro", label: "10K – 100K", min: 10000, max: 100000 },
  { key: "mid", label: "100K – 500K", min: 100000, max: 500000 },
  { key: "macro", label: "500K – 1M", min: 500000, max: 1000000 },
  { key: "mega", label: "1M+", min: 1000000, max: null },
];

export interface CreatorMarketplaceProfile {
  id: string;
  userId: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  languages: string[];
  categories: string[];
  instagramUsername: string | null;
  tiktokUsername: string | null;
  portfolio: { title: string; url: string }[];
  pastCollaborations: { brand: string; note?: string }[];
  startingPrice: number;
  maxPrice: number | null;
  currency: string;
  availability: string;
  isVerified: boolean;
  isPublished: boolean;
  isBoosted: boolean;
  /** Pulled from the existing analytics system — never recomputed here. */
  analytics: CreatorAnalyticsSnapshot | null;
}

export interface CreatorAnalyticsSnapshot {
  platform: string;
  username: string;
  followers: number;
  engagementRate: number;
  overallScore: number;
  brandScore: number;
  engagementScore: number;
  accessibilityScore: number;
  growthScore: number;
  lastFetchedAt: string;
}

export interface ApplicationRecord {
  id: string;
  campaignId: string;
  creatorUserId: string;
  coverMessage: string;
  proposedPrice: number;
  currency: string;
  availability: string | null;
  portfolioExamples: { title: string; url: string }[];
  attachments: { name: string; url: string }[];
  status: ApplicationStatus;
  isInvitation: boolean;
  createdAt: string;
  campaign?: Campaign | null;
  creator?: CreatorMarketplaceProfile | null;
}

export interface ConversationRecord {
  id: string;
  campaignId: string | null;
  campaignTitle: string | null;
  brandUserId: string;
  creatorUserId: string;
  lastMessageAt: string;
  unreadCount: number;
  counterpartName: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  attachments: { name: string; url: string }[];
  readAt: string | null;
  createdAt: string;
}

export function formatMoney(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBudget(min: number, max: number, currency = "USD"): string {
  if (!min && !max) return "Budget on request";
  if (!max || max === min) return formatMoney(min, currency);
  return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
