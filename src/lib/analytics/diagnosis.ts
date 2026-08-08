/**
 * Creator diagnosis engine — browser-safe and pure.
 *
 * Every finding is built as: Observation -> Evidence -> So what -> Action.
 * A finding may only exist when the numbers behind it exist. Nothing here can
 * emit generic advice: each generator returns early when its evidence is
 * missing, and every evidence string is composed from measured values.
 */
import {
  formatKpi,
  median,
  postInteractions,
  type AnalyticsInput,
  type Cadence,
  type ContentAnalysis,
  type Kpi,
  type PostPerformance,
} from "./kpi";
import type { CreatorPost } from "../creator-types";

export type FindingSection = "performance" | "profile" | "content" | "drivers" | "peers";

export type FindingTone = "strength" | "risk" | "neutral";

export type Confidence = "high" | "medium" | "low";

export interface Finding {
  id: string;
  section: FindingSection;
  tone: FindingTone;
  /** Ranking weight: higher means more urgent/valuable. */
  weight: number;
  headline: string;
  observation: string;
  evidence: string;
  soWhat: string;
  action: string;
  confidence: Confidence;
  /** Metric labels this finding is built from — shown as provenance. */
  basedOn: string[];
}

const pct = (n: number) => `${n.toFixed(1)}%`;
const int = (n: number) => formatKpi(n, "count");

function confidenceFor(posts: number): Confidence {
  if (posts >= 10) return "high";
  if (posts >= 5) return "medium";
  return "low";
}

/* --------------------------- derived content splits ----------------------- */

export interface Split {
  key: string;
  label: string;
  otherLabel: string;
  withCount: number;
  withoutCount: number;
  withMedian: number;
  withoutMedian: number;
  liftPercent: number;
}

function splitBy(
  ranked: PostPerformance[],
  key: string,
  label: string,
  otherLabel: string,
  test: (post: CreatorPost) => boolean,
  minSide = 3,
): Split | null {
  const withPosts = ranked.filter((p) => test(p.post));
  const withoutPosts = ranked.filter((p) => !test(p.post));
  if (withPosts.length < minSide || withoutPosts.length < minSide) return null;

  const withMedian = median(withPosts.map((p) => p.interactions));
  const withoutMedian = median(withoutPosts.map((p) => p.interactions));
  if (withMedian === null || withoutMedian === null || withoutMedian <= 0) return null;

  const liftPercent = ((withMedian - withoutMedian) / withoutMedian) * 100;
  if (Math.abs(liftPercent) < 20) return null;

  return {
    key,
    label,
    otherLabel,
    withCount: withPosts.length,
    withoutCount: withoutPosts.length,
    withMedian,
    withoutMedian,
    liftPercent,
  };
}

/** Format split: video posts carry view counts, image posts do not. */
export function formatSplit(content: ContentAnalysis): Split | null {
  return splitBy(
    content.ranked,
    "format-video",
    "Video posts",
    "Photo posts",
    (p) => Number(p.views) > 0,
  );
}

/** Timing split measured on the creator's own posting timestamps. */
export function timingSplit(content: ContentAnalysis): Split | null {
  return splitBy(
    content.ranked,
    "timing-weekend",
    "Weekend posts",
    "Weekday posts",
    (p) => {
      if (!p.postedAt) return false;
      const day = new Date(p.postedAt).getDay();
      return day === 0 || day === 6;
    },
  );
}

/** Caption-length split, using the creator's own median caption length. */
export function captionLengthSplit(content: ContentAnalysis): Split | null {
  const lengths = content.ranked.map((p) => (p.post.caption ?? "").trim().length);
  const mid = median(lengths);
  if (mid === null || mid <= 0) return null;
  return splitBy(
    content.ranked,
    "caption-length",
    "Posts with longer captions than usual",
    "Posts with shorter captions",
    (p) => (p.caption ?? "").trim().length > mid,
  );
}

export function allSplits(content: ContentAnalysis): Split[] {
  return [formatSplit(content), timingSplit(content), captionLengthSplit(content)]
    .filter((s): s is Split => s !== null)
    .sort((a, b) => Math.abs(b.liftPercent) - Math.abs(a.liftPercent));
}

/* ------------------------------ diagnosis core ---------------------------- */

export function buildDiagnosis(
  input: AnalyticsInput,
  content: ContentAnalysis,
  cadence: Cadence | null,
  kpis: Kpi[],
): Finding[] {
  const out: Finding[] = [];
  const kpi = (key: string) => kpis.find((k) => k.key === key);
  const n = content.sample.posts;
  const conf = confidenceFor(n);
  const s = input.signals;

  /* ------------------------------ performance ---------------------------- */

  const engagement = kpi("engagementRate");
  if (engagement && engagement.value !== null) {
    const value = engagement.value;
    if (engagement.peer) {
      const { deltaPercent, peerMedian, peerCount } = engagement.peer;
      const ahead = deltaPercent >= 0;
      out.push({
        id: "engagement-vs-peers",
        section: "performance",
        tone: ahead ? "strength" : "risk",
        weight: ahead ? 70 : 95,
        headline: ahead
          ? "You convert more of your audience than comparable creators"
          : "You convert less of your audience than comparable creators",
        observation: `Your engagement rate is ${pct(value)}, against a median of ${pct(peerMedian)} for creators of similar size on ${peerCount} analysed profiles.`,
        evidence: `${pct(value)} measured across ${n} of your posts and ${input.followers.toLocaleString()} followers; peer median ${pct(peerMedian)} (${peerCount} peers).`,
        soWhat: ahead
          ? "This is the number brands price against — it is currently your strongest negotiating asset."
          : "Brands screen on engagement rate before reach, so this gap suppresses inbound interest even at your follower count.",
        action: ahead
          ? `Put "${pct(value)} engagement rate, ${Math.round(((value - peerMedian) / peerMedian) * 100)}% above comparable creators" at the top of your media kit.`
          : "Before increasing volume, rebuild the next five posts around the formats that already beat your own median post.",
        confidence: conf,
        basedOn: ["Engagement rate", "Peer median"],
      });
    } else {
      out.push({
        id: "engagement-standalone",
        section: "performance",
        tone: "neutral",
        weight: 60,
        headline: `Your engagement rate is ${pct(value)}`,
        observation: `Across your ${n} analysed posts, ${pct(value)} of your follower base interacts with an average post.`,
        evidence: `Median ${int(content.medianInteractions ?? 0)} interactions per post against ${input.followers.toLocaleString()} followers.`,
        soWhat:
          "Without a comparable peer set we will not tell you whether that is good — the number is yours, the comparison is not invented.",
        action:
          "Track this figure after each sync; movement against your own baseline is the only honest benchmark available right now.",
        confidence: conf,
        basedOn: ["Engagement rate"],
      });
    }
  }

  const views = kpi("viewsPerFollower");
  if (views?.value != null && views.value > 100) {
    out.push({
      id: "reach-beyond-followers",
      section: "performance",
      tone: "strength",
      weight: 65,
      headline: "Your video reach extends past your follower base",
      observation:
        "Average views exceed your follower count, so a meaningful share of distribution comes from people who do not follow you.",
      evidence: `Average views are ${pct(views.value)} of your follower count (${formatKpi(input.avgViews, "count")} views vs ${input.followers.toLocaleString()} followers).`,
      soWhat:
        "Non-follower reach is already there; the constraint is conversion from viewer to follower, not distribution.",
      action:
        "Add one explicit follow reason in the first three seconds and in the caption of your next five video posts.",
      confidence: conf,
      basedOn: ["Average views", "Followers"],
    });
  }

  /* -------------------------------- profile ------------------------------ */

  const bio = (s.biography ?? "").trim();
  const gaps: string[] = [];
  if (bio.length < 20) gaps.push("a descriptive bio");
  if (s.externalLinks === 0) gaps.push("an external link");
  if (!s.hasCategory) gaps.push("a category label");

  if (gaps.length > 0) {
    out.push({
      id: "profile-gaps",
      section: "profile",
      tone: "risk",
      weight: 80,
      headline: "Your profile is missing signals brands screen on",
      observation: `Your public profile is missing ${gaps.join(" and ")}.`,
      evidence: `Bio length ${s.biographyLength} characters, ${s.externalLinks} external link${s.externalLinks === 1 ? "" : "s"}, category ${s.category ?? "not set"}.`,
      soWhat:
        "Brand teams shortlist from the profile screen before they open a single post, and missing fields read as an inactive account.",
      action: `Add ${gaps[0]} today — it is the fastest change on this list and it is visible on first view.`,
      confidence: "high",
      basedOn: ["Bio", "External links", "Category"],
    });
  } else if (bio.length > 0) {
    const words = bio.split(/\s+/).filter(Boolean).length;
    out.push({
      id: "profile-complete",
      section: "profile",
      tone: "strength",
      weight: 35,
      headline: "Your profile carries the signals brands look for",
      observation: `Your bio, category and ${s.externalLinks} external link${s.externalLinks === 1 ? "" : "s"} are all present.`,
      evidence: `Bio: "${bio.slice(0, 140)}${bio.length > 140 ? "…" : ""}" (${words} words). Category: ${s.category}. Links: ${s.linkHosts.length > 0 ? s.linkHosts.join(", ") : `${s.externalLinks} set`}.`,
      soWhat:
        "The profile screen is not what holds you back, so improvement effort belongs in content rather than presentation.",
      action:
        "Keep the bio current, and point the link at the page you actually want brand traffic to reach.",
      confidence: "high",
      basedOn: ["Bio", "External links", "Category"],
    });
  }

  if (!s.isBusinessAccount && s.externalLinks > 0) {
    out.push({
      id: "profile-account-type",
      section: "profile",
      tone: "neutral",
      weight: 40,
      headline: "You are running a personal, not a professional, account",
      observation:
        "The platform reports your account as a personal profile rather than a business or creator account.",
      evidence: `Account type flag reported as personal for @${s.username ?? ""}, with ${s.externalLinks} external link${s.externalLinks === 1 ? "" : "s"} already present.`,
      soWhat:
        "Personal accounts expose fewer contact and category fields, which is exactly what agency shortlisting tools read.",
      action:
        "Switch to a creator or business account so a contact button and category appear on your profile.",
      confidence: "high",
      basedOn: ["Account type"],
    });
  }

  /* ------------------------- content and engagement ---------------------- */

  if (content.peakMultiple !== null && content.peakMultiple >= 1.8 && content.best) {
    out.push({
      id: "peak-vs-typical",
      section: "content",
      tone: "risk",
      weight: 88,
      headline: "A handful of posts carries your whole account",
      observation:
        "Your best post is far ahead of your typical post rather than marginally ahead, so results depend on rare hits.",
      evidence: `Best post ${int(content.best.interactions)} interactions vs a median post of ${int(content.medianInteractions ?? 0)} — ${content.peakMultiple.toFixed(1)}× the median across ${n} posts.`,
      soWhat:
        "Income and inbound interest follow the median post, not the peak, so raising the floor pays more than chasing another spike.",
      action: `Reproduce the structure of your best post ("${(content.best.post.caption ?? "no caption").slice(0, 60)}…") on two upcoming topics and compare the result to your median.`,
      confidence: conf,
      basedOn: ["Best post", "Median post"],
    });
  }

  if (
    content.topThreeShare !== null &&
    content.expectedTopThreeShare !== null &&
    content.topThreeShare > content.expectedTopThreeShare * 1.5
  ) {
    out.push({
      id: "concentration",
      section: "content",
      tone: "risk",
      weight: 72,
      headline: "Your engagement is concentrated in very few posts",
      observation: "Total engagement leans disproportionately on your top three posts.",
      evidence: `Top 3 posts hold ${pct(content.topThreeShare)} of all interactions across ${n} posts; an even spread would be ${pct(content.expectedTopThreeShare)}.`,
      soWhat:
        "A concentrated account looks volatile to a brand planning a multi-post campaign.",
      action:
        "Apply your proven post structure to your weakest recurring theme rather than introducing a new format.",
      confidence: conf,
      basedOn: ["Top 3 share", "Posts analysed"],
    });
  }

  const c2l = kpi("commentToLike");
  if (c2l?.value != null) {
    const low = c2l.value < 2;
    out.push({
      id: "conversation-depth",
      section: "content",
      tone: low ? "risk" : "strength",
      weight: low ? 78 : 45,
      headline: low
        ? "Your audience likes, but rarely talks back"
        : "Your audience actually holds a conversation",
      observation: low
        ? "Passive engagement dominates: likes arrive, comments do not."
        : "Comment volume is strong relative to likes.",
      evidence: `${c2l.value.toFixed(1)} comments for every 100 likes across ${n} posts (${formatKpi(input.avgComments, "count")} comments and ${formatKpi(input.avgLikes, "count")} likes per post).`,
      soWhat: low
        ? "Comment rate is the signal both the ranking system and brand analysts read as genuine audience relationship."
        : "Comment-heavy accounts are ranked and priced above like-heavy accounts of the same size.",
      action: low
        ? "Close your next five captions with one specific question about the post, and reply to the first ten comments within an hour."
        : "Keep the closing question format you already use; it is measurably producing conversation.",
      confidence: conf,
      basedOn: ["Comments per like"],
    });
  }

  /* --------------------------- performance drivers ----------------------- */

  for (const split of allSplits(content)) {
    const up = split.liftPercent > 0;
    out.push({
      id: `split-${split.key}`,
      section: "drivers",
      tone: up ? "strength" : "risk",
      weight: Math.min(90, 50 + Math.abs(split.liftPercent) / 4),
      headline: up
        ? `${split.label} outperform ${split.otherLabel.toLowerCase()}`
        : `${split.label} underperform ${split.otherLabel.toLowerCase()}`,
      observation: `Measured directly on your own posts, not assumed from platform averages.`,
      evidence: `Median ${int(split.withMedian)} interactions across ${split.withCount} ${split.label.toLowerCase()} vs ${int(split.withoutMedian)} across ${split.withoutCount} ${split.otherLabel.toLowerCase()} (${up ? "+" : ""}${split.liftPercent.toFixed(0)}%).`,
      soWhat: up
        ? "This is a lever you already control, and it is currently under-used."
        : "You are spending production effort on the weaker side of this split.",
      action: up
        ? `Shift your next posts towards ${split.label.toLowerCase()} and re-measure once the sample grows.`
        : `Reduce ${split.label.toLowerCase()} in favour of ${split.otherLabel.toLowerCase()} and re-check after five more posts.`,
      confidence: confidenceFor(Math.min(split.withCount, split.withoutCount) * 2),
      basedOn: ["Post interactions", "Post metadata"],
    });
  }

  for (const pattern of content.patterns) {
    const up = pattern.liftPercent > 0;
    out.push({
      id: `pattern-${pattern.key}`,
      section: "drivers",
      tone: up ? "strength" : "risk",
      weight: Math.min(85, 45 + Math.abs(pattern.liftPercent) / 4),
      headline: up
        ? `${pattern.label} outperform your other posts`
        : `${pattern.label} underperform your other posts`,
      observation: "A caption-level difference measured across your own analysed posts.",
      evidence: `Median ${int(pattern.withMedian)} interactions across ${pattern.withCount} such posts vs ${int(pattern.withoutMedian)} across ${pattern.withoutCount} others (${up ? "+" : ""}${pattern.liftPercent.toFixed(0)}%).`,
      soWhat: up
        ? "Caption structure is the cheapest variable to change and it is measurably moving your numbers."
        : "This caption habit is costing you interactions on every post that uses it.",
      action: up
        ? "Apply this caption pattern deliberately to every post for the next two weeks."
        : "Drop this caption habit from your next five posts and compare the medians again.",
      confidence: confidenceFor(Math.min(pattern.withCount, pattern.withoutCount) * 2),
      basedOn: ["Captions", "Post interactions"],
    });
  }

  /* ------------------------------ consistency ---------------------------- */

  if (cadence) {
    const slow = cadence.postsPerWeek < 1;
    out.push({
      id: "cadence",
      section: "content",
      tone: slow ? "risk" : "strength",
      weight: slow ? 76 : 30,
      headline: slow ? "Your publishing rhythm is too sparse to compound" : "Your publishing rhythm is steady",
      observation: `Measured from the timestamps of your ${n} analysed posts.`,
      evidence: `${cadence.postsPerWeek.toFixed(1)} posts per week over ${Math.round(cadence.spanDays)} days, median gap ${cadence.medianGapDays.toFixed(1)} days.`,
      soWhat: slow
        ? "Long gaps reset audience familiarity, and they also slow how fast this dashboard can detect what works."
        : "This rhythm is frequent enough for pattern detection to stay reliable between syncs.",
      action: slow
        ? `Add one post per week to close the ${cadence.medianGapDays.toFixed(0)}-day median gap.`
        : "Hold this cadence rather than pushing volume; consistency is already handled.",
      confidence: conf,
      basedOn: ["Posting cadence"],
    });
  }

  const volatility = kpi("volatility");
  if (volatility?.value != null && volatility.value > 60) {
    out.push({
      id: "volatility",
      section: "content",
      tone: "risk",
      weight: 68,
      headline: "Post performance swings too widely to predict",
      observation: "Results scatter from post to post instead of clustering around your average.",
      evidence: `Post-to-post variation is ${pct(volatility.value)} of your average performance across ${n} posts.`,
      soWhat:
        "A brand cannot forecast a campaign result from an account this variable, which lowers what they will commit.",
      action:
        "Standardise the opening frame and caption structure so the difference between posts is topic, not execution.",
      confidence: conf,
      basedOn: ["Volatility"],
    });
  }

  /* ---------------------------------- peers ------------------------------ */

  const peers = input.peers;
  if (peers && !peers.sufficient) {
    out.push({
      id: "peer-gap",
      section: "peers",
      tone: "neutral",
      weight: 20,
      headline: "Your peer comparison is not statistically usable yet",
      observation: `Only ${peers.peerCount} comparable analysed creator${peers.peerCount === 1 ? "" : "s"} exist in the dataset so far.`,
      evidence: `${peers.peerCount} valid peers found; percentiles stay hidden below the ${10} peer minimum.`,
      soWhat:
        "We would rather show nothing than a percentile drawn from a handful of accounts.",
      action:
        "Your own KPIs above are unaffected — use them as your baseline until the comparable set grows.",
      confidence: "high",
      basedOn: ["Peer set size"],
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/* --------------------------------- actions -------------------------------- */

export interface PrioritisedAction {
  rank: number;
  action: string;
  because: string;
  expected: string;
  confidence: Confidence;
}

/** "What to do next" is only ever a re-ranking of evidence-backed findings. */
export function prioritiseActions(findings: Finding[]): PrioritisedAction[] {
  return findings
    .filter((f) => f.tone !== "strength" || f.weight >= 60)
    .slice(0, 3)
    .map((f, i) => ({
      rank: i + 1,
      action: f.action,
      because: f.evidence,
      expected: f.soWhat,
      confidence: f.confidence,
    }));
}

/** Total interactions across the analysed sample — used for the headline read. */
export function totalInteractions(posts: CreatorPost[]): number {
  return posts.reduce((acc, p) => acc + postInteractions(p), 0);
}
