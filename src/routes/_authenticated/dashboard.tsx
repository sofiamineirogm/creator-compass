import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Clock, Search } from "lucide-react";

import { getSavedCreators, getSearchHistory } from "@/lib/account.functions";
import { formatCompact } from "@/lib/creator-types";
import { CreatorSearch } from "@/components/creator-search";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CreatorIQ" },
      { name: "description", content: "Your saved creators and recent CreatorIQ analyses." },
      { property: "og:title", content: "Dashboard — CreatorIQ" },
      { property: "og:description", content: "Your saved creators and recent CreatorIQ analyses." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchSaved = useServerFn(getSavedCreators);
  const fetchHistory = useServerFn(getSearchHistory);

  const saved = useQuery({ queryKey: ["saved-creators"], queryFn: () => fetchSaved({}) });
  const history = useQuery({ queryKey: ["search-history"], queryFn: () => fetchHistory({}) });

  return (
    <main className="min-h-screen bg-haze">
      <div className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:px-8">
        <h1 className="text-3xl font-semibold">Your workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analyse a new creator, or jump back into the ones you're tracking.
        </p>

        <div className="mt-6">
          <CreatorSearch />
        </div>

        <section aria-labelledby="saved-heading" className="mt-12">
          <h2 id="saved-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Bookmark className="h-4 w-4 text-primary" aria-hidden /> Saved creators
          </h2>

          {saved.isPending ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-28 rounded-3xl" />
              <Skeleton className="h-28 rounded-3xl" />
            </div>
          ) : saved.data && saved.data.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {saved.data.map((item) => (
                <Link
                  key={item.id}
                  to="/creator/$platform/$username"
                  params={{ platform: item.platform, username: item.username }}
                  className="surface flex items-center gap-4 p-5 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  {item.avatarUrl ? (
                    <img
                      src={item.avatarUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-semibold">
                      {item.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {item.fullName ?? `@${item.username}`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      @{item.username} · {formatCompact(item.followers)} followers ·{" "}
                      {item.engagementRate.toFixed(2)}%
                    </span>
                  </span>
                  {item.overallScore != null ? (
                    <span className="font-display text-xl font-semibold tabular-nums text-sunset">
                      {Math.round(item.overallScore)}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bookmark}
              title="No saved creators yet"
              body="Run an analysis and hit Save to keep a creator in your workspace."
            />
          )}
        </section>

        <section aria-labelledby="history-heading" className="mt-12">
          <h2 id="history-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-4 w-4 text-primary" aria-hidden /> Recent searches
          </h2>

          {history.isPending ? (
            <Skeleton className="mt-4 h-24 rounded-3xl" />
          ) : history.data && history.data.length > 0 ? (
            <ul className="surface mt-4 divide-y divide-border p-0">
              {history.data.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/creator/$platform/$username"
                    params={{ platform: item.platform, username: item.username }}
                    className="flex items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-accent/60"
                  >
                    <span className="truncate font-medium">@{item.username}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.platform === "tiktok" ? "TikTok" : "Instagram"} ·{" "}
                      {new Date(item.searchedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Search}
              title="No searches yet"
              body="Your last analyses will show up here for quick access."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Bookmark;
  title: string;
  body: string;
}) {
  return (
    <div className="surface mt-4 flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
