import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  Instagram,
  Link2,
  Loader2,
  Music2,
  RefreshCw,

  Trash2,
  Users,
} from "lucide-react";

import {
  connectMySocialAccount,
  disconnectMySocialAccount,
  getMyCreatorIdentity,
  saveMyCreatorProfile,
  syncMySocialAccount,
} from "@/lib/creator-identity.functions";
import {
  MINIMUM_BENCHMARK_PEERS,
  ONBOARDING_STEPS,
  PLATFORM_LABELS,
  nextOnboardingStep,
  type CreatorIdentity,
} from "@/lib/creator-identity";
import type { Platform } from "@/lib/creator-types";
import { formatCompact } from "@/lib/creator-types";
import { CATEGORIES } from "@/lib/marketplace-types";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreDial } from "@/components/score-dial";

const TITLE = "My Creator | CreatorIQ";
const DESCRIPTION =
  "Your CreatorIQ creator profile, connected social accounts, performance metrics and benchmarks.";

export const Route = createFileRoute("/_authenticated/my-creator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyCreatorPage,
});

function MyCreatorPage() {
  const queryClient = useQueryClient();
  const fetchIdentity = useServerFn(getMyCreatorIdentity);

  const identityQuery = useQuery({
    queryKey: ["creator-identity"],
    queryFn: () => fetchIdentity({ data: undefined as never }),
  });

  const identity = identityQuery.data as CreatorIdentity | undefined;
  const step = nextOnboardingStep(identity);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["creator-identity"] });

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto w-full max-w-5xl px-4 pt-20 sm:px-8 sm:pt-24">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">My Creator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your creator identity: profile, connected social accounts and performance.
          </p>
        </header>

        {identityQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : step === "done" && identity ? (
          <CreatorDashboard identity={identity} onChanged={refresh} />
        ) : (
          <Onboarding identity={identity ?? null} step={step} onChanged={refresh} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------- onboarding ------------------------------ */

function Onboarding({
  identity,
  step,
  onChanged,
}: {
  identity: CreatorIdentity | null;
  step: string;
  onChanged: () => void;
}) {
  const activeIndex = ONBOARDING_STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-5">
      <ol className="grid gap-2 sm:grid-cols-4">
        {ONBOARDING_STEPS.map((s, i) => (
          <li
            key={s.key}
            className={`rounded-2xl border p-3 ${
              i === activeIndex ? "border-primary bg-card" : "border-border bg-card/50"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  i < activeIndex
                    ? "bg-primary text-primary-foreground"
                    : i === activeIndex
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < activeIndex ? "✓" : i + 1}
              </span>
              Step {i + 1}
            </div>
            <p className="mt-1.5 text-sm font-medium leading-tight">{s.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
          </li>
        ))}
      </ol>

      {step === "profile" ? <ProfileForm identity={identity} onChanged={onChanged} /> : null}
      {step === "connect" ? <ConnectForm onChanged={onChanged} /> : null}
      {step === "confirm" ? <ConfirmStep identity={identity!} onChanged={onChanged} /> : null}
    </div>
  );
}

function ProfileForm({ identity, onChanged }: { identity: CreatorIdentity | null; onChanged: () => void }) {
  const save = useServerFn(saveMyCreatorProfile);
  const [form, setForm] = useState({
    displayName: "",
    headline: "",
    bio: "",
    category: "",
    location: "",
    profileImage: "",
  });

  useEffect(() => {
    const p = identity?.profile;
    if (!p) return;
    setForm({
      displayName: p.displayName ?? "",
      headline: p.headline ?? "",
      bio: p.bio ?? "",
      category: p.category ?? "",
      location: p.location ?? "",
      profileImage: p.profileImage ?? "",
    });
  }, [identity?.profile]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          displayName: form.displayName,
          headline: form.headline || null,
          bio: form.bio || null,
          category: form.category || null,
          location: form.location || null,
          profileImage: form.profileImage || null,
        },
      }),
    onSuccess: () => {
      toast.success("Creator profile saved");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Create your creator profile</h2>
        <p className="text-sm text-muted-foreground">
          This is your CreatorIQ identity — separate from your login and from any social account.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Display name">
          <input
            className="input-base"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Maya Okafor"
          />
        </Field>
        <Field label="Primary category">
          <select
            className="input-base"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            className="input-base"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Lisbon, Portugal"
          />
        </Field>
        <Field label="Profile image URL">
          <input
            className="input-base"
            value={form.profileImage}
            onChange={(e) => setForm({ ...form, profileImage: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Headline" className="sm:col-span-2">
          <input
            className="input-base"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            placeholder="Beauty & skincare storyteller"
          />
        </Field>
        <Field label="Bio" className="sm:col-span-2">
          <textarea
            className="input-base min-h-24"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="What you make, who you make it for."
          />
        </Field>
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !form.displayName.trim()}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save and continue
      </button>
    </section>
  );
}

function ConnectForm({ onChanged }: { onChanged: () => void }) {
  const connect = useServerFn(connectMySocialAccount);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [handle, setHandle] = useState("");

  const mutation = useMutation({
    mutationFn: () => connect({ data: { platform, handle } }),
    onSuccess: () => {
      toast.success("Social account connected");
      setHandle("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Connect your social account</h2>
        <p className="text-sm text-muted-foreground">
          Enter your <strong>public</strong> handle. This links your public profile for analysis — it is not
          an official login, and it does not grant access to private insights.
        </p>
      </div>
      <div className="flex gap-2">
        {(["instagram", "tiktok"] as Platform[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
              platform === p ? "border-primary bg-card text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {p === "instagram" ? <Instagram className="h-4 w-4" aria-hidden /> : <Music2 className="h-4 w-4" aria-hidden />}
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input-base sm:flex-1"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@yourhandle"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !handle.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden />
          )}
          Connect
        </button>
      </div>
    </section>
  );
}

function ConfirmStep({ identity, onChanged }: { identity: CreatorIdentity; onChanged: () => void }) {
  const save = useServerFn(saveMyCreatorProfile);
  const profile = identity.profile!;

  const publish = useMutation({
    mutationFn: () =>
      save({
        data: {
          displayName: profile.displayName,
          headline: profile.headline,
          bio: profile.bio,
          category: profile.category,
          location: profile.location,
          profileImage: profile.profileImage,
          isPublished: true,
        },
      }),
    onSuccess: () => {
      toast.success("Profile confirmed");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Confirm your profile</h2>
        <p className="text-sm text-muted-foreground">Review, then publish to unlock your creator dashboard.</p>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Row label="Display name" value={profile.displayName} />
        <Row label="Category" value={profile.category ?? "—"} />
        <Row label="Location" value={profile.location ?? "—"} />
        <Row
          label="Connected accounts"
          value={identity.socialAccounts.map((a) => `${PLATFORM_LABELS[a.platform]} @${a.handle}`).join(", ")}
        />
      </dl>
      <button
        onClick={() => publish.mutate()}
        disabled={publish.isPending}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {publish.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        )}
        Confirm and open dashboard
      </button>
    </section>
  );
}

/** Never render an invented score: show a dash when the report has no value. */
function scoreLabel(value: number | null): string {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}/100` : "—";
}

/* ------------------------------- dashboard ------------------------------- */

function CreatorDashboard({ identity, onChanged }: { identity: CreatorIdentity; onChanged: () => void }) {
  const profile = identity.profile!;
  const { metrics, benchmark } = identity;

  return (
    <div className="space-y-5">
      <section className="surface flex flex-wrap items-center gap-4 p-5">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
          {profile.profileImage ? (
            <img src={profile.profileImage} alt={`${profile.displayName} profile picture`} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{profile.displayName}</h2>
            {profile.isPublished ? <BadgeCheck className="h-4 w-4 text-primary" aria-hidden /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {[profile.headline, profile.category, profile.location].filter(Boolean).join(" · ") || "Creator"}
          </p>
        </div>
        <Link
          to="/marketplace/profile"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          Edit profile
        </Link>
      </section>

      <section className="surface p-5">
        <h3 className="font-display text-lg font-semibold">Connected social accounts</h3>
        <ul className="mt-3 space-y-3">
          {identity.socialAccounts.map((account) => (
            <SocialRow key={account.id} account={account} onChanged={onChanged} />
          ))}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Connect another account
          </summary>
          <div className="mt-3">
            <ConnectForm onChanged={onChanged} />
          </div>
        </details>
      </section>

      <section className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Overview metrics</h3>
          {identity.isPlaceholderData ? (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              No analysis yet
            </span>
          ) : null}
        </div>
        {metrics ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Followers" value={formatCompact(metrics.followers)} />
              <Stat label="Engagement" value={`${metrics.engagementRate.toFixed(2)}%`} />
              <Stat label="Avg likes" value={formatCompact(Math.round(metrics.avgLikes))} />
              <Stat label="Posts" value={formatCompact(metrics.postsCount)} />
              <Stat label="Following" value={formatCompact(metrics.following)} />
              <Stat label="Avg comments" value={formatCompact(Math.round(metrics.avgComments))} />
              {metrics.avgViews > 0 ? (
                <Stat label="Avg views" value={formatCompact(Math.round(metrics.avgViews))} />
              ) : null}
            </div>
            {metrics.overallScore !== null ? (
              <div className="mt-5 flex flex-wrap items-center gap-6">
                <ScoreDial value={metrics.overallScore} label="Overall" size={132} />
                <ul className="grid flex-1 gap-2 text-sm sm:grid-cols-2">
                  <Row label="Brand" value={scoreLabel(metrics.brandScore)} />
                  <Row label="Engagement" value={scoreLabel(metrics.engagementScore)} />
                  <Row label="Accessibility" value={scoreLabel(metrics.accessibilityScore)} />
                  <Row label="Growth" value={scoreLabel(metrics.growthScore)} />
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Run a sync on a connected account to pull live public metrics into your dashboard.
          </p>
        )}
      </section>

      <section className="surface p-5">
        <h3 className="font-display text-lg font-semibold">Benchmark</h3>
        {benchmark ? (
          benchmark.percentile !== null && benchmark.standing ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-muted-foreground">{benchmark.peerGroup}</p>
              <p className="font-display text-2xl font-semibold">
                {benchmark.standing} · {benchmark.percentile}th percentile
              </p>
              <ul className="grid gap-2 sm:grid-cols-3">
                <Row label="Peer average" value={`${benchmark.averageEngagement}%`} />
                <Row label="Top 25%" value={`${benchmark.top25Engagement}%`} />
                <Row label="Top 10%" value={`${benchmark.top10Engagement}%`} />
              </ul>
            </div>
          ) : (
            /* Below the peer threshold: no peer statistics at all — they would
               imply a comparison that does not exist. */
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-display text-lg font-semibold text-muted-foreground">
                Not enough comparable creators yet
              </p>
              <p className="text-xs text-muted-foreground">
                {benchmark.peerCount} of {MINIMUM_BENCHMARK_PEERS} analysed peers found.
              </p>
              <p className="text-xs text-muted-foreground">
                We need more comparable creators before calculating your percentile. Your CreatorIQ
                scores above are real and unaffected.
              </p>
            </div>
          )
        ) : (

          <p className="mt-2 text-sm text-muted-foreground">
            Not enough data yet — benchmarks appear once a real analysis with scores exists for a
            connected account.
          </p>
        )}
      </section>

      <section className="surface p-5">
        <h3 className="font-display text-lg font-semibold">Similar creators</h3>
        {identity.similar.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {identity.similar.map((c) => (
              <li key={`${c.platform}-${c.username}`}>
                <Link
                  to="/creator/$platform/$username"
                  params={{ platform: c.platform, username: c.username }}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">@{c.username}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatCompact(c.followers)} followers · {c.engagementRate.toFixed(2)}%
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{c.reason}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Not enough similar creators yet</p>
        )}
      </section>
    </div>
  );
}

function SocialRow({
  account,
  onChanged,
}: {
  account: CreatorIdentity["socialAccounts"][number];
  onChanged: () => void;
}) {
  const sync = useServerFn(syncMySocialAccount);
  const disconnect = useServerFn(disconnectMySocialAccount);

  const syncing = useMutation({
    mutationFn: () => sync({ data: { id: account.id } }),
    onSuccess: () => {
      toast.success("Account synced");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removing = useMutation({
    mutationFn: () => disconnect({ data: { id: account.id } }),
    onSuccess: () => {
      toast.success("Account disconnected");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        {account.platform === "instagram" ? (
          <Instagram className="h-4 w-4" aria-hidden />
        ) : (
          <Music2 className="h-4 w-4" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {PLATFORM_LABELS[account.platform]} · @{account.handle}
        </span>
        <span className="block text-xs text-muted-foreground">
          Public profile link · last synced{" "}
          {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : "never"}
        </span>
      </span>
      <button
        onClick={() => syncing.mutate()}
        disabled={syncing.isPending}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold disabled:opacity-60"
      >
        {syncing.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden />
        )}
        Sync
      </button>
      <button
        onClick={() => removing.mutate()}
        disabled={removing.isPending}
        aria-label={`Disconnect ${account.handle}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

/* --------------------------------- bits ---------------------------------- */

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

