import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Layers, ShieldCheck, Zap } from "lucide-react";

import heroImage from "@/assets/sunset-hero.jpg";
import { CreatorSearch } from "@/components/creator-search";

const TITLE = "CreatorIQ — Instagram & TikTok creator analytics";
const DESCRIPTION =
  "Analyse any public Instagram or TikTok creator with live data. Engagement, brand strength, accessibility and growth scores in seconds.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PILLARS = [
  {
    icon: Zap,
    title: "Live data, never mocked",
    body: "Every analysis pulls the creator's real public profile and recent posts at request time, then caches it for 24 hours.",
  },
  {
    icon: Gauge,
    title: "A scoring engine, not a vibe",
    body: "Brand, engagement, accessibility and growth are computed from configurable formulas kept entirely outside the interface.",
  },
  {
    icon: Layers,
    title: "Benchmarked against peers",
    body: "Percentile ranking against the platform, category and follower band the creator actually competes in.",
  },
  {
    icon: ShieldCheck,
    title: "Built for partnership decisions",
    body: "Strengths, weaknesses and prioritised recommendations with modelled impact — the detail a brief needs.",
  },
];

function Index() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt=""
          aria-hidden
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

        <div className="relative mx-auto w-full max-w-4xl px-5 pb-16 pt-24 text-center sm:px-8 sm:pb-24 sm:pt-32">
          <p className="animate-rise text-xs font-semibold uppercase tracking-[0.28em] text-primary-foreground/90">
            CreatorIQ
          </p>
          <h1 className="animate-rise mt-6 text-4xl font-semibold leading-[1.05] text-primary-foreground sm:text-6xl">
            Know exactly what a creator is worth
          </h1>
          <p className="animate-rise mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
            Enter any public Instagram or TikTok handle. CreatorIQ fetches live profile data and returns a
            scored performance report in seconds.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-12 w-full max-w-3xl px-5 sm:px-8">
        <CreatorSearch />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Try <span className="font-medium text-foreground">@mrbeast</span> ·{" "}
          <span className="font-medium text-foreground">@zendaya</span> ·{" "}
          <span className="font-medium text-foreground">@nasa</span>
        </p>
      </div>

      <section aria-labelledby="how-heading" className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 id="how-heading" className="max-w-lg text-2xl font-semibold sm:text-3xl">
          Analysis that holds up in a pitch deck
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="surface p-7">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ember text-primary-foreground">
                <pillar.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground sm:px-8">
          CreatorIQ · Creator intelligence for brands, agencies and creators.
        </div>
      </footer>
    </main>
  );
}
