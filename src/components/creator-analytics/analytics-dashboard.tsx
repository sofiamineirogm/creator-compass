/**
 * Creator Pro analytics dashboard.
 *
 * Narrative order: PERFORMANCE -> WHY -> BENCHMARK -> ACTION.
 * Every value passes through the KPI engine, which returns null rather than a
 * fabricated zero, so each section can honestly say "Not enough data yet".
 */
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Target,
} from "lucide-react";

import {
  analyseContent,
  analyticalScores,
  computeCadence,
  computeKpis,
  formatKpi,
  type AnalyticsInput,
  type Kpi,
} from "@/lib/analytics/kpi";
import {
  INSIGHT_CATEGORY_LABELS,
  buildActions,
  buildInsights,
  type Insight,
  type InsightCategory,
} from "@/lib/analytics/insights";
import { MINIMUM_BENCHMARK_PEERS, type CreatorIdentity } from "@/lib/creator-identity";
import { formatCompact } from "@/lib/creator-types";
import { ScoreDial } from "@/components/score-dial";
import {
  CadenceTimeline,
  PeerComparisonBars,
  PeerDistribution,
  PostPerformanceChart,
} from "./charts";

const UNAVAILABLE = "Not enough data yet";

export function CreatorAnalytics({ identity }: { identity: CreatorIdentity }) {
  const { metrics, analytics, benchmark } = identity;

  const model = useMemo(() => {
    if (!metrics || !analytics) return null;
    const input: AnalyticsInput = {
      followers: metrics.followers,
      postsCount: metrics.postsCount,
      avgLikes: metrics.avgLikes,
      avgComments: metrics.avgComments,
      avgViews: metrics.avgViews,
      engagementRate: metrics.engagementRate,
      posts: analytics.posts,
      dataQuality: analytics.dataQuality,
      metricsFetchedAt: analytics.metricsFetchedAt,
      signals: analytics.signals,
      peers: analytics.peers,
    };
    const content = analyseContent(input.posts, input.followers);
    const cadence = computeCadence(input.posts);
    const kpis = computeKpis(input, content, cadence);
    const scores = analyticalScores(input, content, kpis);
    const insights = buildInsights(input, content, cadence, kpis, scores);
    return { input, content, cadence, kpis, scores, insights, actions: buildActions(insights) };
  }, [metrics, analytics]);

  if (!metrics || !analytics || !model) {
    return (
      <section className="surface p-6">
        <h3 className="font-display text-lg font-semibold">Performance analytics</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Run a sync on a connected account to pull live public metrics into your dashboard.
        </p>
      </section>
    );
  }

  const { content, cadence, kpis, scores, insights, actions } = model;
  const kpiBy = (key: string) => kpis.find((k) => k.key === key);

  return (
    <div className="space-y-5">
      <PerformanceOverview identity={identity} kpis={kpis} />

      <ScorecardSection
        overall={metrics.overallScore}
        scores={scores}
        creatorIq={{
          brand: metrics.brandScore,
          engagement: metrics.engagementScore,
          accessibility: metrics.accessibilityScore,
          growth: metrics.growthScore,
        }}
      />

      <KpiSection kpis={kpis} sampleLabel={content.sample.label} />

      <ContentSection content={content} cadence={cadence} />

      <BenchmarkSection
        benchmark={benchmark}
        peers={analytics.peers}
        kpis={kpis}
        engagement={kpiBy("engagementRate")?.value ?? null}
      />

      <InsightsSection insights={insights} />

      <ActionsSection actions={actions} />
    </div>
  );
}

/* --------------------------- A. Performance overview ---------------------- */

function DataQualityBadge({ identity }: { identity: CreatorIdentity }) {
  const quality = identity.analytics?.dataQuality ?? "unavailable";
  const measured = identity.analytics?.metricsFetchedAt;

  if (quality === "valid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Live measurement
      </span>
    );
  }
  if (quality === "incomplete_refresh") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Refresh incomplete — previous valid
        measurement{measured ? ` from ${new Date(measured).toLocaleDateString()}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
      <CircleDashed className="h-3.5 w-3.5" aria-hidden /> Post metrics unavailable
    </span>
  );
}

function PerformanceOverview({ identity, kpis }: { identity: CreatorIdentity; kpis: Kpi[] }) {
  const metrics = identity.metrics!;
  const analytics = identity.analytics!;
  const cadence = kpis.find((k) => k.key === "cadence");

  const tiles = [
    {
      label: "CreatorIQ Score",
      value:
        metrics.overallScore === null ? UNAVAILABLE : `${Math.round(metrics.overallScore)}/100`,
    },
    {
      label: "Engagement rate",
      value:
        metrics.engagementRate === null ? UNAVAILABLE : `${metrics.engagementRate.toFixed(2)}%`,
    },
    { label: "Followers", value: formatCompact(metrics.followers) },
    {
      label: "Avg likes",
      value: metrics.avgLikes === null ? UNAVAILABLE : formatCompact(Math.round(metrics.avgLikes)),
    },
    {
      label: "Avg comments",
      value:
        metrics.avgComments === null ? UNAVAILABLE : formatCompact(Math.round(metrics.avgComments)),
    },
    {
      label: "Avg views",
      value: metrics.avgViews === null ? UNAVAILABLE : formatCompact(Math.round(metrics.avgViews)),
    },
    {
      label: "Posts analysed",
      value: analytics.posts.length > 0 ? String(analytics.posts.length) : UNAVAILABLE,
    },
    { label: "Posting cadence", value: formatKpi(cadence?.value ?? null, "perWeek") },
  ];

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Performance overview</h3>
          <p className="text-sm text-muted-foreground">How you are performing right now.</p>
        </div>
        <DataQualityBadge identity={identity} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {tile.label}
            </p>
            <p
              className={
                tile.value === UNAVAILABLE
                  ? "mt-1 text-xs text-muted-foreground"
                  : "mt-1 font-display text-xl font-semibold tabular-nums"
              }
            >
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ B. Scorecard ------------------------------ */

function ScorecardSection({
  overall,
  scores,
  creatorIq,
}: {
  overall: number | null;
  scores: ReturnType<typeof analyticalScores>;
  creatorIq: {
    brand: number | null;
    engagement: number | null;
    accessibility: number | null;
    growth: number | null;
  };
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold">Scorecard</h3>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center">
          {overall === null ? (
            <p className="text-sm text-muted-foreground">{UNAVAILABLE}</p>
          ) : (
            <ScoreDial value={overall} label="Overall" size={132} />
          )}
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            CreatorIQ Score
          </p>
          <ul className="mt-3 w-full space-y-1 text-xs">
            {[
              ["Brand", creatorIq.brand],
              ["Engagement", creatorIq.engagement],
              ["Accessibility", creatorIq.accessibility],
              ["Growth", creatorIq.growth],
            ].map(([label, value]) => (
              <li
                key={label as string}
                className="flex justify-between gap-3 text-muted-foreground"
              >
                <span>{label as string}</span>
                <span className="font-semibold text-foreground">
                  {typeof value === "number" ? `${Math.round(value)}/100` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Analytical dimensions
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Measured from your own data. Separate from the CreatorIQ Score and not part of it.
          </p>
          <ul className="mt-3 space-y-3">
            {scores.map((s) => (
              <li key={s.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="font-display font-semibold tabular-nums">
                    {s.value === null ? (
                      <span className="text-xs text-muted-foreground">{UNAVAILABLE}</span>
                    ) : (
                      `${s.value}/100`
                    )}
                  </span>
                </div>
                {s.value !== null ? (
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-ember"
                      style={{ width: `${s.value}%` }}
                    />
                  </span>
                ) : null}
                <p className="mt-1 text-[11px] text-muted-foreground">{s.basis}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ C. KPI section ---------------------------- */

function KpiSection({ kpis, sampleLabel }: { kpis: Kpi[]; sampleLabel: string }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Performance KPIs</h3>
        <span className="text-xs text-muted-foreground">{sampleLabel}</span>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <li key={kpi.key} className="rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p
              className={
                kpi.value === null
                  ? "mt-1 text-sm text-muted-foreground"
                  : "mt-1 font-display text-2xl font-semibold tabular-nums"
              }
            >
              {formatKpi(kpi.value, kpi.format)}
            </p>
            {kpi.peer ? (
              <p
                className={`mt-1 text-xs font-semibold ${kpi.peer.deltaPercent >= 0 ? "text-primary" : "text-muted-foreground"}`}
              >
                {kpi.peer.deltaPercent >= 0 ? "+" : ""}
                {kpi.peer.deltaPercent.toFixed(1)}% vs peer median (
                {formatKpi(kpi.peer.peerMedian, kpi.format)})
              </p>
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {kpi.explanation}
            </p>
            {kpi.caveat ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.caveat}</p>
            ) : null}
            {kpi.value !== null && !kpi.sufficient ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Based on a limited sample — directional only.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------- D. Content performance ----------------------- */

function ContentSection({
  content,
  cadence,
}: {
  content: ReturnType<typeof analyseContent>;
  cadence: ReturnType<typeof computeCadence>;
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-lg font-semibold">What drives your performance</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{content.sample.label}</p>

      {content.sample.tier === "none" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No post-level performance data available yet.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          <PostPerformanceChart content={content} />

          <div className="grid gap-3 sm:grid-cols-2">
            {content.best ? (
              <PostCard title="Highest-performing post" performance={content.best} />
            ) : null}
            {content.worst ? (
              <PostCard title="Lowest-performing post" performance={content.worst} />
            ) : null}
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            <Fact
              label="Median post"
              value={formatKpi(content.medianInteractions, "count")}
              hint="interactions"
            />
            <Fact
              label="Peak vs typical"
              value={formatKpi(content.peakMultiple, "multiple")}
              hint="best ÷ median"
            />
            <Fact
              label="Top 3 share"
              value={
                content.topThreeShare === null
                  ? UNAVAILABLE
                  : `${content.topThreeShare.toFixed(1)}%`
              }
              hint={
                content.expectedTopThreeShare === null
                  ? "needs 5+ posts"
                  : `even split would be ${content.expectedTopThreeShare.toFixed(1)}%`
              }
            />
          </ul>

          {content.patterns.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold">Measured content patterns</h4>
              <ul className="mt-2 space-y-2">
                {content.patterns.map((p) => (
                  <li key={p.key} className="rounded-2xl bg-muted/40 px-4 py-3 text-sm">
                    <span className="font-medium">{p.label}</span>{" "}
                    <span className={p.liftPercent > 0 ? "text-primary" : "text-muted-foreground"}>
                      {p.liftPercent > 0 ? "+" : ""}
                      {p.liftPercent.toFixed(0)}%
                    </span>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Median {formatKpi(p.withMedian, "count")} across {p.withCount} posts vs{" "}
                      {formatKpi(p.withoutMedian, "count")} across {p.withoutCount} others.
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No caption or hook pattern is yet supported by enough posts to report.
            </p>
          )}

          {cadence ? (
            <CadenceTimeline cadence={cadence} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Posting cadence needs at least four dated posts before it can be measured.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PostCard({
  title,
  performance,
}: {
  title: string;
  performance: NonNullable<ReturnType<typeof analyseContent>["best"]>;
}) {
  const { post, interactions, engagementPercent } = performance;
  return (
    <article className="flex gap-3 rounded-2xl border border-border p-3">
      {post.thumbnailUrl ? (
        <img
          src={post.thumbnailUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="h-16 w-16 shrink-0 rounded-xl bg-muted" />
      )}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="font-display text-lg font-semibold tabular-nums">
          {formatKpi(interactions, "count")}{" "}
          <span className="text-xs font-normal text-muted-foreground">interactions</span>
        </p>
        {engagementPercent !== null ? (
          <p className="text-[11px] text-muted-foreground">
            {engagementPercent.toFixed(2)}% of followers
          </p>
        ) : null}
        {post.caption ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>
        ) : null}
        {post.url ? (
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
          >
            View post <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <li className="rounded-2xl border border-border p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          value === UNAVAILABLE
            ? "mt-1 text-xs text-muted-foreground"
            : "mt-1 font-display text-xl font-semibold"
        }
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </li>
  );
}

/* ------------------------------ E. Benchmark ------------------------------ */

function BenchmarkSection({
  benchmark,
  peers,
  kpis,
  engagement,
}: {
  benchmark: CreatorIdentity["benchmark"];
  peers: NonNullable<CreatorIdentity["analytics"]>["peers"];
  kpis: Kpi[];
  engagement: number | null;
}) {
  const enough = Boolean(peers?.sufficient);

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-lg font-semibold">Compared with similar creators</h3>
      </div>

      {!enough ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-display text-lg font-semibold text-muted-foreground">
            Not enough comparable creators yet
          </p>
          <p className="text-xs text-muted-foreground">
            {peers?.peerCount ?? 0} of {MINIMUM_BENCHMARK_PEERS} analysed peers found. Percentiles
            and peer medians stay hidden until the peer set is large enough. Your own KPIs above are
            real and unaffected.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {benchmark?.percentile !== null && benchmark?.standing ? (
            <p className="text-sm text-muted-foreground">
              {benchmark.peerGroup} —{" "}
              <span className="font-semibold text-foreground">{benchmark.standing}</span>,{" "}
              {benchmark.percentile}th percentile across {benchmark.peerCount} peers.
            </p>
          ) : null}
          <PeerComparisonBars kpis={kpis} />
          {peers && engagement !== null ? (
            <PeerDistribution peers={peers} value={engagement} />
          ) : null}
        </div>
      )}
    </section>
  );
}

/* ------------------------------- F. Insights ------------------------------ */

const CATEGORY_ORDER: InsightCategory[] = [
  "performance",
  "content",
  "consistency",
  "audience",
  "profile",
];

function InsightsSection({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <section className="surface p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold">Insights</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Not enough data yet — insights appear only when your own metrics support them.
        </p>
      </section>
    );
  }

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-lg font-semibold">Why you perform this way</h3>
      </div>

      <div className="mt-4 space-y-5">
        {CATEGORY_ORDER.map((category) => {
          const group = insights.filter((i) => i.category === category);
          if (group.length === 0) return null;
          return (
            <div key={category}>
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {category === "audience" ? (
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                ) : null}
                {INSIGHT_CATEGORY_LABELS[category]}
              </h4>
              <ul className="mt-2 space-y-2">
                {group.map((insight) => (
                  <li key={insight.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          insight.priority === "high"
                            ? "bg-ember text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {insight.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{insight.observation}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                        Evidence and recommendation
                      </summary>
                      <p className="mt-2 text-xs text-muted-foreground">{insight.evidence}</p>
                      <p className="mt-2 text-xs font-medium">{insight.recommendation}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- G. Actions ------------------------------ */

function ActionsSection({ actions }: { actions: ReturnType<typeof buildActions> }) {
  if (actions.length === 0) return null;
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-lg font-semibold">What to do next</h3>
      </div>
      <ol className="mt-4 space-y-3">
        {actions.map((action) => (
          <li key={action.rank} className="flex gap-4 rounded-2xl border border-border p-4">
            <span className="font-display text-2xl font-semibold tabular-nums text-muted-foreground">
              {String(action.rank).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{action.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.reason}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
