/**
 * Creator KPI engine — browser-safe and pure.
 *
 * Hard rules, enforced here rather than in the UI:
 *  - A missing input produces `null`, never `0`.
 *  - A KPI is only produced when its inputs are actually sufficient.
 *  - No industry benchmark is ever invented. Comparisons exist only when a
 *    real peer dataset is supplied.
 */
import type { CreatorPost, DataQuality } from "../creator-types";

/* ------------------------------ sample size ------------------------------ */

export type SampleTier = "none" | "minimal" | "early" | "normal";

export interface SampleQuality {
  tier: SampleTier;
  posts: number;
  label: string;
  /** Safe to make comparative/statistical statements. */
  analytical: boolean;
}

export function sampleQuality(postCount: number): SampleQuality {
  if (postCount <= 0)
    return { tier: "none", posts: 0, label: "No post-level performance data available yet.", analytical: false };
  if (postCount < 5)
    return {
      tier: "minimal",
      posts: postCount,
      label: "Limited post sample — insights may be directional.",
      analytical: false,
    };
  if (postCount < 10)
    return {
      tier: "early",
      posts: postCount,
      label: "Early signal — more posts will improve confidence.",
      analytical: true,
    };
  return { tier: "normal", posts: postCount, label: `${postCount} posts analysed.`, analytical: true };
}

/* -------------------------------- helpers -------------------------------- */

export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? (v[mid] as number) : (((v[mid - 1] as number) + (v[mid] as number)) / 2);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

/** Interactions we can always observe on a public post. */
export function postInteractions(post: CreatorPost): number {
  return (Number(post.likes) || 0) + (Number(post.comments) || 0);
}

/* ---------------------------------- KPIs --------------------------------- */

export type KpiFormat = "percent" | "count" | "ratio" | "perWeek" | "multiple";

export interface KpiPeerComparison {
  peerMedian: number;
  peerCount: number;
  /** Percentage difference vs the peer median. */
  deltaPercent: number;
}

export interface Kpi {
  key: string;
  label: string;
  /** Null means unavailable — the UI must show "Not enough data yet". */
  value: number | null;
  format: KpiFormat;
  explanation: string;
  /** True when the value rests on a sufficient sample. */
  sufficient: boolean;
  /** Why the value is missing or weak, when applicable. */
  caveat?: string | undefined;
  peer?: KpiPeerComparison | undefined;
}

export interface PeerStats {
  peerCount: number;
  /** Median values across comparable, analysed peers. Keyed by KPI key. */
  medians: Partial<Record<string, number>>;
  /** Engagement rates of each peer — used for the distribution chart. */
  engagementRates: number[];
  /** True when the peer set meets the product's minimum peer threshold. */
  sufficient: boolean;
}

export interface ProfileSignals {
  biographyLength: number;
  externalLinks: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  hasCategory: boolean;
}

export interface AnalyticsInput {
  followers: number;
  postsCount: number;
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  engagementRate: number | null;
  posts: CreatorPost[];
  dataQuality: DataQuality;
  metricsFetchedAt: string | null;
  signals: ProfileSignals;
  peers: PeerStats | null;
}

/* ------------------------------- cadence --------------------------------- */

export interface Cadence {
  postsPerWeek: number;
  medianGapDays: number;
  spanDays: number;
  timestamps: string[];
}

export function computeCadence(posts: CreatorPost[]): Cadence | null {
  const dates = posts
    .map((p) => (p.postedAt ? new Date(p.postedAt).getTime() : NaN))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  // Fewer than four timestamps cannot describe a rhythm.
  if (dates.length < 4) return null;

  const first = dates[0] as number;
  const last = dates[dates.length - 1] as number;
  const spanDays = (last - first) / 86_400_000;
  if (spanDays <= 0) return null;

  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) gaps.push(((dates[i] as number) - (dates[i - 1] as number)) / 86_400_000);

  return {
    postsPerWeek: ((dates.length - 1) / spanDays) * 7,
    medianGapDays: median(gaps) ?? 0,
    spanDays,
    timestamps: dates.map((t) => new Date(t).toISOString()),
  };
}

/* --------------------------- post-level analysis -------------------------- */

export interface PostPerformance {
  post: CreatorPost;
  interactions: number;
  /** Interactions as a share of followers, in percent. */
  engagementPercent: number | null;
}

export interface ContentAnalysis {
  sample: SampleQuality;
  ranked: PostPerformance[];
  medianInteractions: number | null;
  meanInteractions: number | null;
  best: PostPerformance | null;
  worst: PostPerformance | null;
  /** Best post divided by the median post. */
  peakMultiple: number | null;
  /** Share of total interactions held by the top three posts, in percent. */
  topThreeShare: number | null;
  /** Expected share of the top three if every post performed equally. */
  expectedTopThreeShare: number | null;
  /** Posts more than 2x the median. */
  outliers: PostPerformance[];
  /** Coefficient of variation of interactions, in percent. */
  volatilityPercent: number | null;
  /** Caption pattern findings that are mathematically supported. */
  patterns: ContentPattern[];
}

export interface ContentPattern {
  key: string;
  label: string;
  withMedian: number;
  withoutMedian: number;
  withCount: number;
  withoutCount: number;
  liftPercent: number;
}

const PATTERN_TESTS: { key: string; label: string; test: (caption: string) => boolean }[] = [
  { key: "question", label: "Captions that ask a question", test: (c) => c.includes("?") },
  { key: "long", label: "Longer captions (140+ characters)", test: (c) => c.length >= 140 },
  { key: "hashtags", label: "Captions using 3+ hashtags", test: (c) => (c.match(/#/g) ?? []).length >= 3 },
  { key: "mentions", label: "Captions tagging another account", test: (c) => c.includes("@") },
];

function detectPatterns(ranked: PostPerformance[]): ContentPattern[] {
  // A split is only meaningful when both sides hold enough observations.
  if (ranked.length < 6) return [];
  const found: ContentPattern[] = [];

  for (const test of PATTERN_TESTS) {
    const withPosts = ranked.filter((p) => test.test(p.post.caption ?? ""));
    const withoutPosts = ranked.filter((p) => !test.test(p.post.caption ?? ""));
    if (withPosts.length < 2 || withoutPosts.length < 2) continue;

    const withMedian = median(withPosts.map((p) => p.interactions));
    const withoutMedian = median(withoutPosts.map((p) => p.interactions));
    if (withMedian === null || withoutMedian === null || withoutMedian <= 0) continue;

    const liftPercent = ((withMedian - withoutMedian) / withoutMedian) * 100;
    // Ignore differences small enough to be noise at this sample size.
    if (Math.abs(liftPercent) < 20) continue;

    found.push({
      key: test.key,
      label: test.label,
      withMedian,
      withoutMedian,
      withCount: withPosts.length,
      withoutCount: withoutPosts.length,
      liftPercent,
    });
  }

  return found.sort((a, b) => Math.abs(b.liftPercent) - Math.abs(a.liftPercent)).slice(0, 3);
}

export function analyseContent(posts: CreatorPost[], followers: number): ContentAnalysis {
  const usable = posts.filter((p) => Number.isFinite(p.likes) || Number.isFinite(p.comments));
  const ranked: PostPerformance[] = usable
    .map((post) => {
      const interactions = postInteractions(post);
      return {
        post,
        interactions,
        engagementPercent: followers > 0 ? (interactions / followers) * 100 : null,
      };
    })
    .sort((a, b) => b.interactions - a.interactions);

  const sample = sampleQuality(ranked.length);
  const values = ranked.map((p) => p.interactions);
  const med = median(values);
  const avg = mean(values);
  const total = values.reduce((a, b) => a + b, 0);

  const sd =
    values.length >= 5 && avg && avg > 0
      ? Math.sqrt(values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length)
      : null;

  return {
    sample,
    ranked,
    medianInteractions: med,
    meanInteractions: avg,
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? (ranked[ranked.length - 1] as PostPerformance) : null,
    peakMultiple: ranked[0] && med && med > 0 ? ranked[0].interactions / med : null,
    topThreeShare:
      ranked.length >= 5 && total > 0
        ? (ranked.slice(0, 3).reduce((a, p) => a + p.interactions, 0) / total) * 100
        : null,
    expectedTopThreeShare: ranked.length >= 5 ? (3 / ranked.length) * 100 : null,
    outliers: med && med > 0 ? ranked.filter((p) => p.interactions > med * 2) : [],
    volatilityPercent: sd !== null && avg ? (sd / avg) * 100 : null,
    patterns: detectPatterns(ranked),
  };
}

/* ------------------------------ KPI assembly ------------------------------ */

function withPeer(kpi: Kpi, peers: PeerStats | null): Kpi {
  if (!peers?.sufficient || kpi.value === null) return kpi;
  const peerMedian = peers.medians[kpi.key];
  if (typeof peerMedian !== "number" || peerMedian <= 0) return kpi;
  return {
    ...kpi,
    peer: {
      peerMedian,
      peerCount: peers.peerCount,
      deltaPercent: ((kpi.value - peerMedian) / peerMedian) * 100,
    },
  };
}

export function computeKpis(input: AnalyticsInput, content: ContentAnalysis, cadence: Cadence | null): Kpi[] {
  const { followers, avgLikes, avgComments, avgViews, engagementRate, peers } = input;
  const enough = content.sample.analytical;

  const list: Kpi[] = [
    {
      key: "engagementRate",
      label: "Engagement rate",
      value: engagementRate,
      format: "percent",
      explanation: "Average interactions per post as a share of your followers.",
      sufficient: engagementRate !== null && enough,
      caveat: engagementRate === null ? "No usable post data in the latest analysis." : undefined,
    },
    {
      key: "likesPerFollower",
      label: "Likes per follower",
      value: ratio(avgLikes, followers) === null ? null : (ratio(avgLikes, followers) as number) * 100,
      format: "percent",
      explanation: "How much of your audience likes a typical post.",
      sufficient: avgLikes !== null && followers > 0,
    },
    {
      key: "commentsPerFollower",
      label: "Comments per follower",
      value: ratio(avgComments, followers) === null ? null : (ratio(avgComments, followers) as number) * 100,
      format: "percent",
      explanation: "How much of your audience writes a comment.",
      sufficient: avgComments !== null && followers > 0,
    },
    {
      key: "commentToLike",
      label: "Comment-to-like ratio",
      value: ratio(avgComments, avgLikes) === null ? null : (ratio(avgComments, avgLikes) as number) * 100,
      format: "percent",
      explanation: "Conversation depth: comments earned for every 100 likes.",
      sufficient: avgComments !== null && avgLikes !== null && avgLikes > 0,
    },
    {
      key: "viewsPerFollower",
      label: "Views per follower",
      value: ratio(avgViews, followers) === null ? null : (ratio(avgViews, followers) as number) * 100,
      format: "percent",
      explanation: "Reach of a typical video relative to your follower base.",
      sufficient: avgViews !== null && followers > 0,
      caveat: avgViews === null ? "No video views recorded in the analysed posts." : undefined,
    },
    {
      key: "avgLikes",
      label: "Average likes",
      value: avgLikes,
      format: "count",
      explanation: "Mean likes across the analysed posts.",
      sufficient: avgLikes !== null,
    },
    {
      key: "avgComments",
      label: "Average comments",
      value: avgComments,
      format: "count",
      explanation: "Mean comments across the analysed posts.",
      sufficient: avgComments !== null,
    },
    {
      key: "avgViews",
      label: "Average views",
      value: avgViews,
      format: "count",
      explanation: "Mean views across the analysed video posts.",
      sufficient: avgViews !== null,
      caveat: avgViews === null ? "Views are not exposed for these posts." : undefined,
    },
    {
      key: "cadence",
      label: "Posting cadence",
      value: cadence ? cadence.postsPerWeek : null,
      format: "perWeek",
      explanation: "Publishing rhythm measured from the timestamps of your analysed posts.",
      sufficient: cadence !== null,
      caveat: cadence ? undefined : "Not enough dated posts to measure a rhythm.",
    },
    {
      key: "volatility",
      label: "Performance volatility",
      value: content.volatilityPercent,
      format: "percent",
      explanation: "How much post performance swings around your average. Lower is steadier.",
      sufficient: content.volatilityPercent !== null && content.sample.posts >= 5,
      caveat: content.volatilityPercent === null ? "At least 5 analysed posts are required." : undefined,
    },
    {
      key: "bestPost",
      label: "Best-performing post",
      value: content.best?.interactions ?? null,
      format: "count",
      explanation: "Interactions on your strongest analysed post.",
      sufficient: content.best !== null,
    },
    {
      key: "medianPost",
      label: "Median post performance",
      value: content.medianInteractions,
      format: "count",
      explanation: "The typical post — half of your posts do better, half do worse.",
      sufficient: content.medianInteractions !== null && content.sample.posts >= 5,
    },
    {
      key: "peakMultiple",
      label: "Peak vs typical",
      value: content.peakMultiple,
      format: "multiple",
      explanation: "How far your best post sits above your median post.",
      sufficient: content.peakMultiple !== null && content.sample.posts >= 5,
    },
  ];

  return list.map((kpi) => withPeer(kpi, peers));
}

/* --------------------------- analytical scorecard ------------------------- */

export interface AnalyticalScore {
  key: string;
  label: string;
  /** Null when the dimension cannot be measured from available data. */
  value: number | null;
  basis: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Analytical dimensions are deliberately separate from the CreatorIQ Score and
 * are derived only from measurable properties — never from invented industry
 * norms. Peer-relative dimensions stay null until a real peer set exists.
 */
export function analyticalScores(
  input: AnalyticsInput,
  content: ContentAnalysis,
  kpis: Kpi[],
): AnalyticalScore[] {
  const engagementKpi = kpis.find((k) => k.key === "engagementRate");
  const engagementVsPeers =
    engagementKpi?.peer && engagementKpi.value !== null
      ? clamp(50 + Math.max(-50, Math.min(50, engagementKpi.peer.deltaPercent / 2)))
      : null;

  const consistency =
    content.volatilityPercent !== null && content.sample.posts >= 5
      ? clamp(100 - content.volatilityPercent)
      : null;

  const diversification =
    content.topThreeShare !== null && content.expectedTopThreeShare !== null
      ? clamp(100 - (content.topThreeShare - content.expectedTopThreeShare))
      : null;

  const s = input.signals;
  const profile = clamp(
    (s.biographyLength >= 120 ? 30 : s.biographyLength >= 20 ? 20 : s.biographyLength > 0 ? 10 : 0) +
      (s.externalLinks > 0 ? 25 : 0) +
      (s.hasCategory ? 15 : 0) +
      (s.isBusinessAccount ? 15 : 0) +
      (s.isVerified ? 15 : 0),
  );

  return [
    {
      key: "engagement",
      label: "Engagement vs peers",
      value: engagementVsPeers,
      basis: engagementVsPeers === null ? "Needs a comparable peer set" : "Relative to the peer median engagement rate",
    },
    {
      key: "consistency",
      label: "Performance consistency",
      value: consistency,
      basis: consistency === null ? "Needs 5+ analysed posts" : "Inverse of post-to-post variation",
    },
    {
      key: "diversification",
      label: "Content diversification",
      value: diversification,
      basis:
        diversification === null
          ? "Needs 5+ analysed posts"
          : "How little of your engagement depends on a few posts",
    },
    {
      key: "profile",
      label: "Profile completeness",
      value: profile,
      basis: "Bio, links, category and account signals actually present",
    },
  ];
}

/* -------------------------------- formatting ------------------------------ */

export function formatKpi(value: number | null, format: KpiFormat): string {
  if (value === null || !Number.isFinite(value)) return "Not enough data yet";
  switch (format) {
    case "percent":
      return `${value < 1 ? value.toFixed(2) : value.toFixed(1)}%`;
    case "perWeek":
      return `${value.toFixed(1)}/week`;
    case "multiple":
      return `${value.toFixed(1)}×`;
    case "ratio":
      return value.toFixed(2);
    default:
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
        Math.round(value),
      );
  }
}

export function formatDelta(deltaPercent: number): string {
  const sign = deltaPercent >= 0 ? "+" : "";
  return `${sign}${deltaPercent.toFixed(1)}% vs peer median`;
}
