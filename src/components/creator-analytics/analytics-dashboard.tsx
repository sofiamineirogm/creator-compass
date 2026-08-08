/**
 * Creator Pro analytics — an insight-led diagnosis, not a metrics wall.
 *
 * Narrative order: what is happening -> who you are -> what your content did
 * -> why -> how that compares -> what to do next. Every number passes through
 * the KPI engine, which returns null rather than a fabricated zero, so each
 * block can honestly say "Not enough data yet".
 */
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Compass,
  ListChecks,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import {
  analyseContent,
  computeCadence,
  computeKpis,
  formatKpi,
  type AnalyticsInput,
  type Cadence,
  type ContentAnalysis,
  type Kpi,
} from "@/lib/analytics/kpi";
import {
  buildDiagnosis,
  prioritiseActions,
  type Confidence,
  type Finding,
  type FindingSection,
} from "@/lib/analytics/diagnosis";
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
    const findings = buildDiagnosis(input, content, cadence, kpis);
    return { input, content, cadence, kpis, findings, actions: prioritiseActions(findings) };
  }, [metrics, analytics]);

  if (!metrics || !analytics || !model) {
    return (
      <section className="surface p-6">
        <h3 className="font-display text-lg font-semibold">Your diagnosis</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Run a sync on a connected account to pull live public metrics into your dashboard.
        </p>
      </section>
    );
  }

  const { content, cadence, kpis, findings, actions } = model;
  const kpiBy = (key: string) => kpis.find((k) => k.key === key);
  const inSection = (section: FindingSection) => findings.filter((f) => f.section === section);

  return (
    <div className="space-y-5">
      <PerformanceOverview
        identity={identity}
        kpis={kpis}
        content={content}
        findings={findings}
      />

      <DiagnosisBlock
        icon={<UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />}
        title="Profile & brand"
        intro="How your account reads to a brand before they open a single post."
        findings={inSection("profile")}
        empty="Your profile has not been analysed yet."
      />

      <ContentSection
        content={content}
        cadence={cadence}
        findings={inSection("content")}
        sampleLabel={content.sample.label}
      />

      <DiagnosisBlock
        icon={<Compass className="h-4 w-4 text-muted-foreground" aria-hidden />}
        title="What drives your performance"
        intro="Differences measured between your own posts — never platform averages."
        findings={inSection("drivers")}
        empty="No format, timing or caption difference is yet supported by enough posts to report."
      />

      <BenchmarkSection
        benchmark={benchmark}
        peers={analytics.peers}
        kpis={kpis}
        engagement={kpiBy("engagementRate")?.value ?? null}
        findings={inSection("peers")}
      />

      <EvidenceSection kpis={kpis} sampleLabel={content.sample.label} />

      <ActionsSection actions={actions} />
    </div>
  );
}

/* ----------------------------- shared primitives -------------------------- */

function ConfidencePill({ level }: { level: Confidence }) {
  const copy: Record<Confidence, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Directional only",
  };
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {copy[level]}
    </span>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const accent =
    finding.tone === "strength"
      ? "border-primary/40"
      : finding.tone === "risk"
        ? "border-border"
        : "border-border/60";

  return (
    <li className={`rounded-2xl border ${accent} bg-card p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {finding.tone === "strength" ? (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          ) : finding.tone === "risk" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <p className="font-display text-base font-semibold leading-snug">{finding.headline}</p>
        </div>
        <ConfidencePill level={finding.confidence} />
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{finding.observation}</p>

      <dl className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Evidence
          </dt>
          <dd className="mt-0.5 text-muted-foreground">{finding.evidence}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Why it matters
          </dt>
          <dd className="mt-0.5 text-muted-foreground">{finding.soWhat}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Do this
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">{finding.action}</dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Based on: {finding.basedOn.join(" · ")}
      </p>
    </li>
  );
}

function DiagnosisBlock({
  icon,
  title,
  intro,
  findings,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  intro: string;
  findings: Finding[];
  empty: string;
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      {findings.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </ul>
      )}
    </section>
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

function PerformanceOverview({
  identity,
  kpis,
  content,
  findings,
}: {
  identity: CreatorIdentity;
  kpis: Kpi[];
  content: ContentAnalysis;
  findings: Finding[];
}) {
  const metrics = identity.metrics!;
  const cadence = kpis.find((k) => k.key === "cadence");
  const lead = findings.find((f) => f.section === "performance") ?? findings[0] ?? null;
  const strengths = findings.filter((f) => f.tone === "strength").slice(0, 2);
  const risks = findings.filter((f) => f.tone === "risk").slice(0, 2);

  const tiles = [
    {
      label: "Engagement rate",
      value:
        metrics.engagementRate === null ? UNAVAILABLE : `${metrics.engagementRate.toFixed(2)}%`,
    },
    { label: "Followers", value: formatCompact(metrics.followers) },
    {
      label: "Median post",
      value: formatKpi(content.medianInteractions, "count"),
    },
    { label: "Posting cadence", value: formatKpi(cadence?.value ?? null, "perWeek") },
  ];

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Your diagnosis</h3>
          <p className="text-sm text-muted-foreground">{content.sample.label}</p>
        </div>
        <DataQualityBadge identity={identity} />
      </div>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col items-center">
          {metrics.overallScore === null ? (
            <p className="text-sm text-muted-foreground">{UNAVAILABLE}</p>
          ) : (
            <ScoreDial value={metrics.overallScore} label="Overall" size={120} />
          )}
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            CreatorIQ Score
          </p>
        </div>

        <div className="min-w-0 flex-1">
          {lead ? (
            <>
              <p className="font-display text-xl font-semibold leading-snug">{lead.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">{lead.observation}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {UNAVAILABLE} — sync a connected account to generate your diagnosis.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryList
              title="Working for you"
              items={strengths.map((f) => f.headline)}
              empty="No measured strength stands out yet."
            />
            <SummaryList
              title="Holding you back"
              items={risks.map((f) => f.headline)}
              empty="No measured weakness stands out yet."
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {tile.label}
            </p>
            <p
              className={
                tile.value === UNAVAILABLE
                  ? "mt-1 text-xs text-muted-foreground"
                  : "mt-1 font-display text-lg font-semibold tabular-nums"
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

function SummaryList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-1.5 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item} className="leading-snug">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------- C. Content performance ----------------------- */

function ContentSection({
  content,
  cadence,
  findings,
  sampleLabel,
}: {
  content: ContentAnalysis;
  cadence: Cadence | null;
  findings: Finding[];
  sampleLabel: string;
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-lg font-semibold">Engagement & content performance</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{sampleLabel}</p>

      {content.sample.tier === "none" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No post-level performance data available yet.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {findings.length > 0 ? (
            <ul className="space-y-3">
              {findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </ul>
          ) : null}

          <PostPerformanceChart content={content} />

          <div className="grid gap-3 sm:grid-cols-2">
            {content.best ? (
              <PostCard title="Highest-performing post" performance={content.best} />
            ) : null}
            {content.worst ? (
              <PostCard title="Lowest-performing post" performance={content.worst} />
            ) : null}
          </div>

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
  performance: NonNullable<ContentAnalysis["best"]>;
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

/* ------------------------------ E. Benchmark ------------------------------ */

function BenchmarkSection({
  benchmark,
  peers,
  kpis,
  engagement,
  findings,
}: {
  benchmark: CreatorIdentity["benchmark"];
  peers: NonNullable<CreatorIdentity["analytics"]>["peers"];
  kpis: Kpi[];
  engagement: number | null;
  findings: Finding[];
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
            and peer medians stay hidden until the peer set is large enough. Your own numbers above
            are real and unaffected.
          </p>
          {findings.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </ul>
          ) : null}
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

/* ------------------------------- Evidence --------------------------------- */

function EvidenceSection({ kpis, sampleLabel }: { kpis: Kpi[]; sampleLabel: string }) {
  return (
    <section className="surface p-5 sm:p-6">
      <details>
        <summary className="cursor-pointer">
          <span className="font-display text-lg font-semibold">The numbers behind this</span>
          <span className="ml-2 text-xs text-muted-foreground">{sampleLabel}</span>
        </summary>
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
      </details>
    </section>
  );
}

/* -------------------------------- F. Actions ------------------------------ */

function ActionsSection({ actions }: { actions: ReturnType<typeof prioritiseActions> }) {
  if (actions.length === 0) return null;
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-lg font-semibold">What to do next</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked by the size of the measured gap, not by generic best practice.
      </p>
      <ol className="mt-4 space-y-3">
        {actions.map((action) => (
          <li key={action.rank} className="flex gap-4 rounded-2xl border border-border p-4">
            <span className="font-display text-2xl font-semibold tabular-nums text-muted-foreground">
              {String(action.rank).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{action.action}</p>
                <ConfidencePill level={action.confidence} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Because {action.because}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.expected}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
