/**
 * Lightweight SVG chart primitives for the creator analytics dashboard.
 * No chart is rendered unless the caller has already verified the sample.
 * All colours come from semantic design tokens.
 */
import type { ContentAnalysis, Kpi, PeerStats, Cadence } from "@/lib/analytics/kpi";
import { formatKpi } from "@/lib/analytics/kpi";

/* --------------------------- A. KPI vs peer median ------------------------ */

export function PeerComparisonBars({ kpis }: { kpis: Kpi[] }) {
  const comparable = kpis.filter((k) => k.peer && k.value !== null);
  if (comparable.length === 0) return null;

  return (
    <ul className="space-y-4">
      {comparable.map((kpi) => {
        const peer = kpi.peer!;
        const max = Math.max(kpi.value as number, peer.peerMedian) || 1;
        const you = ((kpi.value as number) / max) * 100;
        const them = (peer.peerMedian / max) * 100;
        const ahead = peer.deltaPercent >= 0;

        return (
          <li key={kpi.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{kpi.label}</span>
              <span className={`text-xs font-semibold ${ahead ? "text-primary" : "text-muted-foreground"}`}>
                {ahead ? "+" : ""}
                {peer.deltaPercent.toFixed(1)}% vs peer median
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              <Bar label="You" value={formatKpi(kpi.value, kpi.format)} width={you} tone="primary" />
              <Bar
                label={`Peers (${peer.peerCount})`}
                value={formatKpi(peer.peerMedian, kpi.format)}
                width={them}
                tone="muted"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Bar({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: number;
  tone: "primary" | "muted";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={`block h-full rounded-full ${tone === "primary" ? "bg-ember" : "bg-muted-foreground/40"}`}
          style={{ width: `${Math.max(2, Math.min(100, width))}%` }}
        />
      </span>
      <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/* ------------------------ B. Peer distribution strip ---------------------- */

export function PeerDistribution({ peers, value }: { peers: PeerStats; value: number }) {
  if (!peers.sufficient || peers.engagementRates.length < 10) return null;
  const all = [...peers.engagementRates, value];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pos = (v: number) => ((v - min) / span) * 100;

  return (
    <figure>
      <figcaption className="text-xs text-muted-foreground">
        Where you sit in the engagement rate distribution of {peers.peerCount} comparable creators
      </figcaption>
      <div className="relative mt-4 h-14">
        <div className="absolute inset-x-0 top-6 h-px bg-border" />
        {peers.engagementRates.map((r, i) => (
          <span
            key={`${r}-${i}`}
            className="absolute top-4 h-4 w-1 -translate-x-1/2 rounded-full bg-muted-foreground/40"
            style={{ left: `${pos(r)}%` }}
          />
        ))}
        <span
          className="absolute top-2 h-8 w-1.5 -translate-x-1/2 rounded-full bg-ember"
          style={{ left: `${pos(value)}%` }}
          aria-label={`Your engagement rate ${value.toFixed(2)}%`}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{min.toFixed(2)}%</span>
        <span>{max.toFixed(2)}%</span>
      </div>
    </figure>
  );
}

/* --------------------- C/D. Post performance distribution ------------------ */

export function PostPerformanceChart({ content }: { content: ContentAnalysis }) {
  // Too few observations to draw a distribution honestly.
  if (content.ranked.length < 5 || content.medianInteractions === null) return null;

  const byDate = [...content.ranked].sort((a, b) => {
    const at = a.post.postedAt ? new Date(a.post.postedAt).getTime() : 0;
    const bt = b.post.postedAt ? new Date(b.post.postedAt).getTime() : 0;
    return at - bt;
  });
  const max = Math.max(...byDate.map((p) => p.interactions)) || 1;
  const med = content.medianInteractions;
  const medPct = (med / max) * 100;

  return (
    <figure>
      <figcaption className="text-xs text-muted-foreground">
        Interactions per analysed post, oldest to newest. The line marks your median post; taller bars
        are outliers.
      </figcaption>
      <div className="relative mt-4 flex h-36 items-end gap-1.5">
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/60"
          style={{ bottom: `${medPct}%` }}
        />
        {byDate.map((p) => {
          const outlier = p.interactions > med * 2;
          return (
            <span
              key={p.post.externalId}
              title={`${p.interactions.toLocaleString()} interactions`}
              className={`min-w-0 flex-1 rounded-t-md ${outlier ? "bg-ember" : "bg-muted-foreground/30"}`}
              style={{ height: `${Math.max(3, (p.interactions / max) * 100)}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ember" /> Outlier (2× median)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Typical post
        </span>
        <span>Median {formatKpi(med, "count")} interactions</span>
      </div>
    </figure>
  );
}

/* ---------------------------- E. Posting cadence -------------------------- */

export function CadenceTimeline({ cadence }: { cadence: Cadence }) {
  const times = cadence.timestamps.map((t) => new Date(t).getTime());
  const first = Math.min(...times);
  const last = Math.max(...times);
  const span = last - first || 1;

  return (
    <figure>
      <figcaption className="text-xs text-muted-foreground">
        Publishing activity across the last {Math.round(cadence.spanDays)} days —{" "}
        {cadence.postsPerWeek.toFixed(1)} posts per week, median gap {cadence.medianGapDays.toFixed(1)} days.
      </figcaption>
      <div className="relative mt-4 h-8">
        <div className="absolute inset-x-0 top-3.5 h-px bg-border" />
        {times.map((t) => (
          <span
            key={t}
            className="absolute top-1 h-6 w-1 -translate-x-1/2 rounded-full bg-ember/70"
            style={{ left: `${((t - first) / span) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{new Date(first).toLocaleDateString()}</span>
        <span>{new Date(last).toLocaleDateString()}</span>
      </div>
    </figure>
  );
}
