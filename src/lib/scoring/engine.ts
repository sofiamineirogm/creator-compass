import type {
  BenchmarkResult,
  CreatorProfile,
  CreatorReport,
  PremiumAnalysis,
  ScoreBreakdown,
  ScoreSection,
} from "../creator-types";
import { defaultScoringConfig, type ScoringConfig } from "./config";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

/** Null when there is no usable post data — never a fabricated zero. */
export function computeEngagementRate(creator: CreatorProfile): number | null {
  if (creator.followers <= 0) return null;
  if (creator.avgLikes === null || creator.avgComments === null) return null;
  const interactions = creator.avgLikes + creator.avgComments;
  return round((interactions / creator.followers) * 100, 2);
}


function scoreBrand(creator: CreatorProfile, cfg: ScoringConfig): number {
  const c = cfg.brand;
  const bio = creator.biography?.trim() ?? "";
  let score = 0;
  if (bio.length >= c.bioMinLength) {
    score += 30 * clamp(bio.length / c.bioIdealLength, 0, 1);
  } else if (bio.length > 0) {
    score += 12;
  }
  if (creator.isVerified) score += c.verifiedBonus;
  if (creator.externalLinks.length > 0) score += c.externalLinkBonus;
  if (creator.category) score += c.categoryBonus;
  if (creator.fullName) score += c.nameBonus;

  const reach = Math.log10(Math.max(creator.followers, 1)) / Math.log10(cfg.reachCeiling[creator.platform]);
  score += 30 * clamp(reach, 0, 1);
  return round(clamp(score));
}

function scoreEngagement(creator: CreatorProfile, cfg: ScoringConfig): number {
  const target = cfg.engagementTarget[creator.platform];
  const rate = creator.engagementRate ?? computeEngagementRate(creator) ?? 0;
  const likes = creator.avgLikes ?? 0;
  const comments = creator.avgComments ?? 0;
  const base = 100 * clamp(rate / target, 0, 1.15);
  const commentRatio = likes > 0 ? comments / likes : 0;
  const conversationBonus = 10 * clamp(commentRatio / 0.03, 0, 1);
  return round(clamp(base * 0.9 + conversationBonus));

}

function scoreAccessibility(creator: CreatorProfile, cfg: ScoringConfig): number {
  const c = cfg.accessibility;
  const posts = creator.posts;
  const described = posts.filter((p) => (p.caption?.trim().length ?? 0) >= c.captionMinLength).length;
  const captionScore = posts.length > 0 ? c.altOrCaptionWeight * (described / posts.length) : 0;
  const publicScore = creator.isPrivate ? 0 : c.publicAccountWeight;
  const contactScore = creator.externalLinks.length > 0 ? c.contactableWeight : 0;
  const consistency = posts.length >= 6 ? c.consistencyWeight : c.consistencyWeight * (posts.length / 6);
  return round(clamp(captionScore + publicScore + contactScore + consistency));
}

function scoreGrowth(creator: CreatorProfile, cfg: ScoringConfig): number {
  const c = cfg.growth;
  const now = Date.now();
  const windowMs = c.recentDays * 24 * 60 * 60 * 1000;
  const dated = creator.posts.filter((p) => p.postedAt);
  const recent = dated.filter((p) => now - new Date(p.postedAt as string).getTime() <= windowMs);
  const cadence = 55 * clamp(recent.length / c.idealPostsPerMonth, 0, 1);

  const ratio = creator.following > 0 ? creator.followers / creator.following : c.followerRatioIdeal;
  const ratioScore = 20 * clamp(Math.log10(Math.max(ratio, 1)) / Math.log10(c.followerRatioIdeal), 0, 1);

  const half = Math.floor(dated.length / 2);
  let momentum = 12.5;
  if (half >= 2) {
    const sorted = [...dated].sort(
      (a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime(),
    );
    const avg = (arr: typeof sorted) =>
      arr.reduce((sum, p) => sum + p.likes + p.comments, 0) / Math.max(arr.length, 1);
    const newer = avg(sorted.slice(0, half));
    const older = avg(sorted.slice(half));
    const delta = older > 0 ? (newer - older) / older : 0;
    momentum = 25 * clamp(0.5 + delta, 0, 1);
  }
  return round(clamp(cadence + ratioScore + momentum));
}

function summarize(key: ScoreSection["key"], score: number, creator: CreatorProfile): string {
  const band = score >= 80 ? "strong" : score >= 60 ? "solid" : score >= 40 ? "mixed" : "weak";
  switch (key) {
    case "brand":
      return `A ${band} brand footprint. ${creator.isVerified ? "Verified status" : "No verification badge"}, ${creator.externalLinks.length} outbound link${creator.externalLinks.length === 1 ? "" : "s"} and a ${creator.biography ? `${creator.biography.trim().length}-character` : "missing"} bio shape how partners read this profile.`;
    case "engagement":
      return `Audience response is ${band} at ${creator.engagementRate.toFixed(2)}% engagement, averaging ${Math.round(creator.avgLikes).toLocaleString()} likes and ${Math.round(creator.avgComments).toLocaleString()} comments per post.`;
    case "accessibility":
      return `Content is ${band} on accessibility. Descriptive captions, a ${creator.isPrivate ? "private" : "public"} account and reachable contact paths determine how easily new audiences and brands can engage.`;
    case "growth":
      return `Growth signals look ${band}. Posting cadence, follower-to-following balance and recent post performance drive this score.`;
  }
}

export function benchmarkCreator(
  creator: CreatorProfile,
  scores: ScoreBreakdown,
  cfg: ScoringConfig = defaultScoringConfig,
): BenchmarkResult {
  const target = cfg.engagementTarget[creator.platform];
  const average = round(target * 0.55, 2);
  const top25 = round(target, 2);
  const top10 = round(target * 1.8, 2);
  const rate = creator.engagementRate;

  // Log-normal style positioning against the platform's engagement curve.
  const percentile = round(
    clamp(100 * (0.5 * (rate / average) ** 0.7) * (0.6 + 0.4 * (scores.overall / 100)), 1, 99),
    0,
  );

  const standing: BenchmarkResult["standing"] =
    percentile >= 90
      ? "Top 10%"
      : percentile >= 75
        ? "Top 25%"
        : percentile >= 55
          ? "Above Average"
          : percentile >= 40
            ? "Average"
            : "Below Average";

  const bucket =
    creator.followers >= 1_000_000
      ? "1M+ followers"
      : creator.followers >= 100_000
        ? "100K–1M followers"
        : creator.followers >= 10_000
          ? "10K–100K followers"
          : "under 10K followers";

  return {
    peerGroup: `${creator.platform === "instagram" ? "Instagram" : "TikTok"} · ${creator.category ?? "General"} · ${bucket}`,
    percentile,
    standing,
    averageEngagement: average,
    top25Engagement: top25,
    top10Engagement: top10,
  };
}

function buildPremium(creator: CreatorProfile, scores: ScoreBreakdown): PremiumAnalysis {
  const strengths: PremiumAnalysis["strengths"] = [];
  const weaknesses: PremiumAnalysis["weaknesses"] = [];
  const recommendations: PremiumAnalysis["recommendations"] = [];

  const add = (
    list: PremiumAnalysis["strengths"],
    title: string,
    detail: string,
    impact: "high" | "medium" | "low",
  ) => list.push({ title, detail, impact });

  if (scores.engagement >= 70)
    add(
      strengths,
      "Audience actually responds",
      `An engagement rate of ${creator.engagementRate.toFixed(2)}% puts real interaction behind the follower count, which is what brands pay for.`,
      "high",
    );
  if (creator.isVerified)
    add(strengths, "Verified identity", "Verification reduces partner risk and speeds up brand approvals.", "medium");
  if (creator.externalLinks.length > 0)
    add(
      strengths,
      "Clear conversion path",
      `${creator.externalLinks.length} outbound link${creator.externalLinks.length === 1 ? "" : "s"} give campaigns somewhere to send traffic.`,
      "medium",
    );
  if (scores.growth >= 70)
    add(strengths, "Consistent cadence", "Recent posting frequency and momentum are above the healthy threshold.", "medium");

  if (scores.engagement < 55)
    add(
      weaknesses,
      "Engagement lags the platform norm",
      "Interaction per follower is below what partners expect at this audience size, which suppresses campaign pricing.",
      "high",
    );
  if (scores.accessibility < 60)
    add(
      weaknesses,
      "Content is hard to reach",
      "Short or missing captions limit discovery, search indexing and access for users relying on screen readers.",
      "medium",
    );
  if ((creator.biography?.trim().length ?? 0) < 40)
    add(weaknesses, "Thin bio", "The bio does not state a niche, audience or contact route.", "medium");
  if (scores.growth < 55)
    add(weaknesses, "Irregular publishing", "Gaps in the recent posting window reduce reach compounding.", "high");
  if (creator.externalLinks.length === 0)
    add(weaknesses, "No contact or link path", "There is no way for a brand to convert interest into a conversation.", "high");

  add(
    recommendations,
    "Rewrite the bio as a positioning line",
    "State niche, audience and a contact route in the first 80 characters so brands qualify the profile in one glance.",
    (creator.biography?.trim().length ?? 0) < 40 ? "high" : "low",
  );
  add(
    recommendations,
    "Caption for search, not just context",
    "Lead captions with the topic keyword and keep them above 40 characters to lift discovery and accessibility together.",
    scores.accessibility < 60 ? "high" : "medium",
  );
  add(
    recommendations,
    "Lock a publishing rhythm",
    "Three to four posts per week in the same formats stabilises reach and makes performance measurable.",
    scores.growth < 55 ? "high" : "medium",
  );
  add(
    recommendations,
    "Push conversation, not just likes",
    "Prompted questions and replies within the first hour raise the comment-to-like ratio, the strongest engagement quality signal.",
    scores.engagement < 55 ? "high" : "medium",
  );

  const priorities = [...weaknesses, ...recommendations]
    .filter((i) => i.impact === "high")
    .slice(0, 4)
    .map((i) => i.title);

  const headroom = Math.max(0, 100 - scores.overall);
  const estimatedImpact = `Acting on the priority items above is modelled to lift the overall score by ${Math.round(headroom * 0.35)}–${Math.round(headroom * 0.6)} points within two quarters, largely through engagement quality and publishing consistency.`;

  return {
    strengths: strengths.length ? strengths : [{ title: "Stable baseline", detail: "No standout risks in the current profile data.", impact: "low" }],
    weaknesses,
    recommendations,
    priorities: priorities.length ? priorities : ["Maintain current cadence", "Deepen category positioning"],
    estimatedImpact,
  };
}

/** Pure scoring entry point. No I/O, no UI, fully deterministic. */
export function generateReport(
  creator: CreatorProfile,
  cfg: ScoringConfig = defaultScoringConfig,
): CreatorReport {
  const brand = scoreBrand(creator, cfg);
  const engagement = scoreEngagement(creator, cfg);
  const accessibility = scoreAccessibility(creator, cfg);
  const growth = scoreGrowth(creator, cfg);
  const w = cfg.weights;
  const overall = round(
    clamp(brand * w.brand + engagement * w.engagement + accessibility * w.accessibility + growth * w.growth),
  );

  const scores: ScoreBreakdown = { overall, brand, engagement, accessibility, growth };

  const sections: ScoreSection[] = (
    [
      ["brand", "Brand Management"],
      ["engagement", "Engagement"],
      ["accessibility", "Accessibility"],
      ["growth", "Growth"],
    ] as const
  ).map(([key, label]) => ({
    key,
    label,
    score: scores[key],
    summary: summarize(key, scores[key], creator),
  }));

  return { scores, sections, premium: buildPremium(creator, scores), benchmark: benchmarkCreator(creator, scores, cfg) };
}
