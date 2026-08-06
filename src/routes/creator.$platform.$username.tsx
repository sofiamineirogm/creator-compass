import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { analyzeCreator } from "@/lib/creators.functions";
import { getSavedState, recordUserSearch, toggleSavedCreator } from "@/lib/account.functions";
import { formatCompact, type AnalyzeResult, type Platform } from "@/lib/creator-types";
import { useAuth } from "@/hooks/use-auth";
import { ScoreBar, ScoreDial } from "@/components/score-dial";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/creator/$platform/$username")({
  head: ({ params }) => {
    const title = `@${params.username} — creator analysis | CreatorIQ`;
    const description = `Live ${params.platform === "tiktok" ? "TikTok" : "Instagram"} performance scores for @${params.username}: engagement, brand strength, accessibility and growth.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
      ],
    };
  },
  component: CreatorReportPage,
});

function CreatorReportPage() {
  const { platform, username } = Route.useParams();
  const analyze = useServerFn(analyzeCreator);
  const record = useServerFn(recordUserSearch);
  const { user } = useAuth();

  const mutation = useMutation<AnalyzeResult, Error, { refresh: boolean }>({
    mutationFn: ({ refresh }) =>
      analyze({ data: { platform: platform as Platform, username, refresh } }),
  });

  const { mutate } = mutation;
  useEffect(() => {
    mutate({ refresh: false });
  }, [mutate, platform, username]);

  const succeeded = mutation.isSuccess;
  useEffect(() => {
    if (!succeeded || !user) return;
    void record({ data: { platform: platform as Platform, username } }).catch(() => {});
  }, [succeeded, user, record, platform, username]);

  return (
    <main className="min-h-screen">
      <div className="bg-haze">
        <div className="mx-auto w-full max-w-5xl px-5 pb-10 pt-8 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> New search
          </Link>

          {mutation.isPending ? <ReportSkeleton /> : null}

          {mutation.isError ? (
            <ErrorState message={mutation.error.message} onRetry={() => mutate({ refresh: true })} />
          ) : null}

          {mutation.data ? (
            <Report
              result={mutation.data}
              refreshing={mutation.isPending}
              onRefresh={() => mutate({ refresh: true })}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface mt-10 p-8 text-center">
      <h1 className="text-2xl font-semibold">We couldn't analyse that profile</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ember px-6 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        <RefreshCw className="h-4 w-4" aria-hidden /> Try again
      </button>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <div className="surface flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-40 w-40 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

function Report({
  result,
  refreshing,
  onRefresh,
}: {
  result: AnalyzeResult;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { creator, report } = result;
  const stats = [
    { label: "Followers", value: formatCompact(creator.followers) },
    { label: "Following", value: formatCompact(creator.following) },
    { label: "Posts", value: formatCompact(creator.postsCount) },
    { label: "Avg likes", value: formatCompact(creator.avgLikes) },
    { label: "Avg comments", value: formatCompact(creator.avgComments) },
    { label: "Engagement", value: `${creator.engagementRate.toFixed(2)}%` },
  ];

  return (
    <div className="animate-rise mt-8 space-y-6 pb-20">
      <header className="surface flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        {creator.avatarUrl ? (
          <img
            src={creator.avatarUrl}
            alt={`${creator.fullName ?? creator.username} profile photo`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
            {creator.username.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">
              {creator.fullName ?? `@${creator.username}`}
            </h1>
            {creator.isVerified ? <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verified" /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            @{creator.username} · {creator.platform === "tiktok" ? "TikTok" : "Instagram"}
            {creator.category ? ` · ${creator.category}` : ""}
          </p>
          {creator.biography ? (
            <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed">{creator.biography}</p>
          ) : null}
          {creator.externalLinks.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {creator.externalLinks.slice(0, 3).map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {link.title ?? new URL(link.url).hostname}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3">
          <ScoreDial value={report.scores.overall} label="Overall" />
          <SaveButton platform={creator.platform} username={creator.username} />
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            {result.cached ? "Refresh data" : "Re-fetch"}
          </button>
        </div>
      </header>

      <section className="surface grid grid-cols-2 gap-px overflow-hidden bg-border p-0 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card px-4 py-5 text-center">
            <p className="font-display text-xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="scores-heading" className="space-y-4">
        <h2 id="scores-heading" className="px-1 text-lg font-semibold">
          Performance scores
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {report.sections.map((section) => (
            <article key={section.key} className="surface p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-base font-semibold">{section.label}</h3>
                <span className="font-display text-2xl font-semibold tabular-nums text-sunset">
                  {Math.round(section.score)}
                </span>
              </div>
              <div className="mt-4">
                <ScoreBar value={section.score} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{section.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="benchmark-heading" className="surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="benchmark-heading" className="text-lg font-semibold">
            Benchmark
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-3 py-1 text-xs font-semibold text-primary-foreground">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden /> {report.benchmark.standing}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Compared against {report.benchmark.peerGroup} — {report.benchmark.percentile}th percentile.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Peer average", `${report.benchmark.averageEngagement}%`],
            ["Top 25%", `${report.benchmark.top25Engagement}%`],
            ["Top 10%", `${report.benchmark.top10Engagement}%`],
            ["This creator", `${creator.engagementRate.toFixed(2)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-muted px-4 py-4">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-sunset p-8 text-center sm:p-12">
        <div className="relative mx-auto max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full bg-card/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Premium report
          </span>
          <h2 className="mt-5 text-2xl font-semibold text-primary-foreground sm:text-3xl">
            {report.premium.strengths.length + report.premium.weaknesses.length + report.premium.recommendations.length}{" "}
            detailed findings are waiting
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
            Strengths, weaknesses, prioritised recommendations, estimated impact and historical trends for @
            {creator.username}.
          </p>
          <button className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-card px-7 text-sm font-semibold text-foreground shadow-lift transition-transform duration-300 hover:scale-[1.02]">
            <Sparkles className="h-4 w-4" aria-hidden /> Unlock Premium Report
          </button>
        </div>
      </section>

      <p className="px-1 text-center text-xs text-muted-foreground">
        {result.cached ? "Loaded from cache" : "Freshly fetched"} ·{" "}
        {new Date(result.fetchedAt).toLocaleString()}
      </p>
    </div>
  );
}
