/**
 * Insight engine — browser-safe and pure.
 *
 * Every insight must be backed by a value computed from the creator's own
 * data. Generic social-media advice is deliberately impossible to emit here:
 * each generator returns nothing unless its evidence exists.
 */
import {
  formatKpi,
  type AnalyticalScore,
  type AnalyticsInput,
  type Cadence,
  type ContentAnalysis,
  type Kpi,
} from "./kpi";

export type InsightCategory = "performance" | "content" | "consistency" | "audience" | "profile";

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  performance: "Performance",
  content: "Content",
  consistency: "Consistency",
  audience: "Audience interaction",
  profile: "Profile & brand",
};

export type InsightPriority = "high" | "medium" | "low";

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  observation: string;
  /** The measured fact this insight rests on. */
  evidence: string;
  recommendation: string;
  kpis: string[];
}

const pct = (n: number) => `${n.toFixed(1)}%`;

export function buildInsights(
  input: AnalyticsInput,
  content: ContentAnalysis,
  cadence: Cadence | null,
  kpis: Kpi[],
  scores: AnalyticalScore[],
): Insight[] {
  const out: Insight[] = [];
  const kpi = (key: string) => kpis.find((k) => k.key === key);

  /* ------------------------------ performance ----------------------------- */

  const engagement = kpi("engagementRate");
  if (engagement?.value !== null && engagement?.peer) {
    const { deltaPercent, peerMedian, peerCount } = engagement.peer;
    out.push({
      id: "engagement-vs-peers",
      category: "performance",
      priority: deltaPercent >= 0 ? "medium" : "high",
      title:
        deltaPercent >= 0
          ? "Your engagement rate leads comparable creators"
          : "Your engagement rate trails comparable creators",
      observation:
        deltaPercent >= 0
          ? "Comparable analysed creators convert a smaller share of their audience than you do."
          : "Comparable analysed creators convert a larger share of their audience than you do.",
      evidence: `${pct(engagement.value as number)} versus a peer median of ${pct(peerMedian)} across ${peerCount} comparable creators.`,
      recommendation:
        deltaPercent >= 0
          ? "Lead with this number in brand pitches — it is your strongest measured differentiator."
          : "Focus the next posts on the formats that already beat your own median before scaling volume.",
      kpis: ["engagementRate"],
    });
  }

  const views = kpi("viewsPerFollower");
  if (views?.value !== null && views && views.value > 100) {
    out.push({
      id: "reach-beyond-followers",
      category: "performance",
      priority: "medium",
      title: "Your videos reach well beyond your follower base",
      observation:
        "Average views exceed your follower count, so distribution is coming from non-followers.",
      evidence: `Average views are ${pct(views.value as number)} of your follower count.`,
      recommendation:
        "Add a clear follow or profile CTA to video content — the reach is already there to convert.",
      kpis: ["viewsPerFollower", "avgViews"],
    });
  }

  /* -------------------------------- content ------------------------------- */

  if (content.peakMultiple !== null && content.peakMultiple >= 1.8 && content.best) {
    out.push({
      id: "peak-vs-typical",
      category: "content",
      priority: "high",
      title: "A small number of posts carry your performance",
      observation:
        "Your strongest post performs far above your typical post rather than slightly above it.",
      evidence: `Your best analysed post earned ${formatKpi(content.best.interactions, "count")} interactions — ${content.peakMultiple.toFixed(1)}× your median post.`,
      recommendation:
        "Break down what that post did differently — topic, hook, format — and produce two variations.",
      kpis: ["peakMultiple", "bestPost", "medianPost"],
    });
  }

  if (
    content.topThreeShare !== null &&
    content.expectedTopThreeShare !== null &&
    content.topThreeShare > content.expectedTopThreeShare * 1.5
  ) {
    out.push({
      id: "concentration",
      category: "content",
      priority: "medium",
      title: "Your engagement is concentrated in a few posts",
      observation: "Total engagement depends disproportionately on your top three posts.",
      evidence: `Your top 3 posts hold ${pct(content.topThreeShare)} of all interactions across ${content.sample.posts} analysed posts, against ${pct(content.expectedTopThreeShare)} if performance were even.`,
      recommendation:
        "Raise the floor: repeat your proven structure on weaker themes instead of chasing new formats.",
      kpis: ["bestPost", "medianPost"],
    });
  }

  for (const pattern of content.patterns) {
    out.push({
      id: `pattern-${pattern.key}`,
      category: "content",
      priority: Math.abs(pattern.liftPercent) >= 50 ? "high" : "medium",
      title:
        pattern.liftPercent > 0
          ? `${pattern.label} outperform your other posts`
          : `${pattern.label} underperform your other posts`,
      observation: "This difference was measured directly on your analysed posts, not assumed.",
      evidence: `Median ${formatKpi(pattern.withMedian, "count")} interactions across ${pattern.withCount} such posts versus ${formatKpi(pattern.withoutMedian, "count")} across ${pattern.withoutCount} others (${pattern.liftPercent > 0 ? "+" : ""}${pattern.liftPercent.toFixed(0)}%).`,
      recommendation:
        pattern.liftPercent > 0
          ? "Apply this pattern deliberately to your next posts and re-measure after the sample grows."
          : "Reduce reliance on this pattern and compare results once more posts are analysed.",
      kpis: ["medianPost"],
    });
  }

  /* ------------------------------ consistency ----------------------------- */

  if (cadence) {
    const slow = cadence.postsPerWeek < 1;
    out.push({
      id: "cadence",
      category: "consistency",
      priority: slow ? "high" : "low",
      title: slow ? "Your publishing rhythm is sparse" : "Your publishing rhythm is steady",
      observation: "Measured from the timestamps of your analysed posts.",
      evidence: `${cadence.postsPerWeek.toFixed(1)} posts per week over the last ${Math.round(cadence.spanDays)} days, with a median gap of ${cadence.medianGapDays.toFixed(1)} days.`,
      recommendation: slow
        ? "Add one extra post per week; your measured gap is long enough that audiences lose the thread between posts."
        : "Hold this rhythm — it is frequent enough to keep measurement meaningful.",
      kpis: ["cadence"],
    });
  }

  const volatility = kpi("volatility");
  if (volatility?.value !== null && volatility && volatility.value > 60) {
    out.push({
      id: "volatility",
      category: "consistency",
      priority: "medium",
      title: "Post performance swings widely",
      observation:
        "Results vary strongly from post to post rather than clustering around your average.",
      evidence: `Post-to-post variation is ${pct(volatility.value as number)} of your average performance.`,
      recommendation:
        "Standardise the opening seconds and caption structure of your posts to reduce the spread.",
      kpis: ["volatility"],
    });
  }

  /* --------------------------- audience interaction ----------------------- */

  const c2l = kpi("commentToLike");
  if (c2l?.value !== null && c2l) {
    const low = c2l.value < 2;
    out.push({
      id: "conversation-depth",
      category: "audience",
      priority: low ? "high" : "low",
      title: low
        ? "Your audience likes far more than it comments"
        : "Your audience actively comments",
      observation: low
        ? "Passive engagement dominates, which limits conversation depth signals."
        : "Comment volume is healthy relative to likes.",
      evidence: `${c2l.value.toFixed(1)} comments for every 100 likes.`,
      recommendation: low
        ? "End posts with one concrete question tied to the content and reply to the first ten comments."
        : "Keep the CTA style you are using — it is measurably producing conversation.",
      kpis: ["commentToLike", "commentsPerFollower"],
    });
  }

  /* ------------------------------ profile/brand --------------------------- */

  const profileScore = scores.find((s) => s.key === "profile");
  const s = input.signals;
  const gaps: string[] = [];
  if (s.biographyLength < 20) gaps.push("a descriptive bio");
  if (s.externalLinks === 0) gaps.push("an external link");
  if (!s.hasCategory) gaps.push("a category");
  if (gaps.length > 0 && profileScore?.value !== null) {
    out.push({
      id: "profile-gaps",
      category: "profile",
      priority: "medium",
      title: "Your profile is missing discoverability signals",
      observation: "Brands screen profiles before they screen posts.",
      evidence: `Missing: ${gaps.join(", ")}. Profile completeness scores ${profileScore?.value}/100.`,
      recommendation: `Add ${gaps[0]} to your profile — it is the fastest fix on this list.`,
      kpis: [],
    });
  }

  const order: Record<InsightPriority, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.priority] - order[b.priority]);
}

export interface ActionItem {
  rank: number;
  action: string;
  reason: string;
  priority: InsightPriority;
}

/** "What to do next" is only ever a re-ranking of evidence-backed insights. */
export function buildActions(insights: Insight[]): ActionItem[] {
  return insights
    .filter((i) => i.priority !== "low")
    .slice(0, 3)
    .map((i, index) => ({
      rank: index + 1,
      action: i.recommendation,
      reason: `Because ${i.evidence.charAt(0).toLowerCase()}${i.evidence.slice(1)}`,
      priority: i.priority,
    }));
}
