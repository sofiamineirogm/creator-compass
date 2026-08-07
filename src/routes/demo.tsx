import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";

import { DEMO_PERSONAS, isDemoMode } from "@/lib/demo";
import { loadDemoWorld, loginAsDemoUser, provisionDemoAccounts } from "@/lib/demo.functions";
import { supabase } from "@/integrations/supabase/client";
import { useViewer } from "@/hooks/use-viewer";
import {
  PLAN_LABELS,
  ROLE_LABELS,
  canApplyToCampaign,
  canCreateCampaign,
  canManageApplicants,
  canManageCreators,
} from "@/lib/entitlements";

const TITLE = "Demo Console — CreatorIQ";
const DESCRIPTION = "One-click access to CreatorIQ test personas: creator, pro creator, brand and agency.";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const enabled = isDemoMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { viewer } = useViewer();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const provision = useServerFn(provisionDemoAccounts);
  const login = useServerFn(loginAsDemoUser);
  const seed = useServerFn(loadDemoWorld);

  const createAccounts = useMutation({
    mutationFn: () => provision({ data: undefined as never }),
    onSuccess: async (rows) => {
      await queryClient.invalidateQueries();
      const created = rows.filter((r) => r.created).length;
      toast.success(created ? `Created ${created} demo accounts` : "Demo accounts are up to date");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signInAs = useMutation({
    mutationFn: async (key: string) => {
      setBusyKey(key);
      const result = await login({ data: { key } });
      const { error } = await supabase.auth.setSession(result.session);
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`Signed in as ${result.label}`);
      setBusyKey(null);
      void navigate({ to: result.role === "creator" ? "/marketplace" : "/marketplace/manage" });
    },
    onError: (e: Error) => {
      setBusyKey(null);
      toast.error(e.message);
    },
  });

  const loadWorld = useMutation({
    mutationFn: () => seed({ data: undefined as never }),
    onSuccess: async (r) => {
      await queryClient.invalidateQueries();
      toast.success(`${r.insertedCampaigns} campaigns · ${r.insertedApplications} applications added`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!enabled) void navigate({ to: "/", replace: true });
  }, [enabled, navigate]);

  if (!enabled) return null;

  const signedIn = Boolean(viewer.userId);

  return (
    <main className="min-h-screen bg-haze px-5 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-dusk px-3 py-1 text-xs font-semibold text-primary-foreground">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Demo environment
          </span>
          <h1 className="font-display text-3xl font-semibold">Demo console</h1>
          <p className="text-sm text-muted-foreground">
            Test accounts for every role. Tap a persona to sign in instantly — no typing, no setup.
            This page only exists while demo mode is on.
          </p>
        </header>

        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">1. Prepare the environment</p>
              <p className="text-sm text-muted-foreground">
                Creates the four test users (skipped if they already exist) and fills the marketplace
                with campaigns and applications.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => createAccounts.mutate()}
              disabled={createAccounts.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold disabled:opacity-60"
            >
              {createAccounts.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden />
              )}
              Create demo accounts
            </button>
            <button
              onClick={() => loadWorld.mutate()}
              disabled={loadWorld.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loadWorld.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              Load demo campaigns
            </button>
          </div>
        </section>

        <section className="surface p-5">
          <p className="font-display text-lg font-semibold">2. Demo accounts</p>
          <p className="text-sm text-muted-foreground">
            One click signs you in as that persona and applies the matching plan.
          </p>
          <ul className="mt-4 space-y-3">
            {DEMO_PERSONAS.map((p) => (
              <li
                key={p.key}
                className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{p.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                </div>
                <button
                  onClick={() => signInAs.mutate(p.key)}
                  disabled={signInAs.isPending}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-dusk px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busyKey === p.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <LogIn className="h-4 w-4" aria-hidden />
                  )}
                  Login as {p.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-5">
          <p className="font-display text-lg font-semibold">3. Current session</p>
          {signedIn ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {viewer.email} · {ROLE_LABELS[viewer.role]} · {PLAN_LABELS[viewer.plan]}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <Check ok={canApplyToCampaign(viewer)} label="Can apply to campaigns" />
                <Check ok={canCreateCampaign(viewer)} label="Can create campaigns" />
                <Check ok={canManageApplicants(viewer)} label="Can manage applicants" />
                <Check ok={canManageCreators(viewer)} label="Can access agency roster tools" />
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <Link to="/marketplace" className="underline underline-offset-4">
                  Marketplace
                </Link>
                <Link to="/marketplace/manage" className="underline underline-offset-4">
                  Brand dashboard
                </Link>
                <Link to="/dashboard" className="underline underline-offset-4">
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    await queryClient.invalidateQueries();
                    toast.success("Signed out");
                  }}
                  className="underline underline-offset-4"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Not signed in yet — pick a persona above.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
          ok ? "bg-ember text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
        aria-hidden
      >
        {ok ? "✓" : "—"}
      </span>
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
