import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { createCampaign, getMyCampaigns, updateCampaign } from "@/lib/marketplace.functions";
import { CATEGORIES, DELIVERABLES, OBJECTIVES, formatBudget, type Campaign } from "@/lib/marketplace-types";
import { useViewer } from "@/hooks/use-viewer";
import { canCreateCampaign, upgradeMessage } from "@/lib/entitlements";

export const Route = createFileRoute("/_authenticated/marketplace/manage")({
  head: () => ({
    meta: [
      { title: "My Campaigns | CreatorIQ Marketplace" },
      { name: "description", content: "Create briefs, track applicants and manage every campaign you run." },
      { property: "og:title", content: "My Campaigns | CreatorIQ" },
      { property: "og:description", content: "Create briefs and manage creator applications." },
    ],
  }),
  component: ManagePage,
});

const EMPTY = {
  title: "",
  description: "",
  category: "",
  platforms: [] as string[],
  deliverables: [] as string[],
  objectives: [] as string[],
  budget_min: "",
  budget_max: "",
  payment_model: "fixed",
  location: "",
  location_type: "remote",
  min_followers: "",
  min_engagement_rate: "",
  creators_needed: "1",
  application_deadline: "",
  target_audience: "",
  expected_content: "",
};

function ManagePage() {
  const { viewer } = useViewer();
  const queryClient = useQueryClient();
  const fetchCampaigns = useServerFn(getMyCampaigns);
  const create = useServerFn(createCampaign);
  const update = useServerFn(updateCampaign);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const campaigns = useQuery({
    queryKey: ["my-campaigns"],
    queryFn: () => fetchCampaigns({ data: undefined as never }),
  });

  const publish = useMutation({
    mutationFn: (status: "draft" | "open") =>
      create({
        data: {
          title: form.title,
          description: form.description,
          category: form.category || null,
          platforms: form.platforms,
          deliverables: form.deliverables,
          objectives: form.objectives,
          budget_min: Number(form.budget_min) || 0,
          budget_max: Number(form.budget_max) || Number(form.budget_min) || 0,
          payment_model: form.payment_model,
          location: form.location || null,
          location_type: form.location_type,
          min_followers: Number(form.min_followers) || 0,
          min_engagement_rate: Number(form.min_engagement_rate) || 0,
          creators_needed: Number(form.creators_needed) || 1,
          application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : null,
          target_audience: form.target_audience || null,
          expected_content: form.expected_content || null,
          status,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      setOpen(false);
      setForm({ ...EMPTY });
      toast.success("Campaign saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: string }) => update({ data: { id: vars.id, patch: { status: vars.status } } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-campaigns"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = campaigns.data ?? [];
  const allowed = canCreateCampaign(viewer);

  function toggleIn(key: "platforms" | "deliverables" | "objectives", value: string) {
    setForm((f) => {
      const list = f[key];
      return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  return (
    <MarketplaceShell
      title="My campaigns"
      subtitle="Publish briefs and review the creators who apply."
      action={
        allowed ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ember px-4 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" aria-hidden /> New
          </button>
        ) : null
      }
    >
      {!allowed ? (
        <div className="surface mb-4 p-4 text-sm text-muted-foreground">{upgradeMessage("create_campaign")}</div>
      ) : null}

      {campaigns.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="surface h-28 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-semibold">No campaigns yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Publish your first brief to start receiving applications.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((c: Campaign) => (
            <li key={c.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    to="/marketplace/manage/$campaignId"
                    params={{ campaignId: c.id }}
                    className="font-display text-base font-semibold hover:underline"
                  >
                    {c.title}
                  </Link>
                  <p className="text-xs capitalize text-muted-foreground">
                    {c.status} · {c.applicantsCount} applicant{c.applicantsCount === 1 ? "" : "s"} ·{" "}
                    {formatBudget(c.budgetMin, c.budgetMax, c.currency)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.status !== "open" ? (
                    <button
                      onClick={() => setStatus.mutate({ id: c.id, status: "open" })}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium"
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus.mutate({ id: c.id, status: "closed" })}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium"
                    >
                      Close
                    </button>
                  )}
                  <Link
                    to="/marketplace/manage/$campaignId"
                    params={{ campaignId: c.id }}
                    className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                  >
                    Applicants
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift sm:max-w-xl sm:rounded-3xl">
            <h2 className="font-display text-lg font-semibold">New campaign</h2>

            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-base"
                placeholder="Spring skincare launch — Reels + Stories"
              />
            </Field>

            <Field label="Brief">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-base py-3"
                placeholder="What you are launching, the tone you want and what success looks like."
              />
            </Field>

            <Group label="Platforms">
              {["instagram", "tiktok"].map((p) => (
                <Toggle key={p} active={form.platforms.includes(p)} onClick={() => toggleIn("platforms", p)}>
                  {p}
                </Toggle>
              ))}
            </Group>

            <Group label="Deliverables">
              {DELIVERABLES.map((d) => (
                <Toggle key={d} active={form.deliverables.includes(d)} onClick={() => toggleIn("deliverables", d)}>
                  {d}
                </Toggle>
              ))}
            </Group>

            <Group label="Objectives">
              {OBJECTIVES.map((o) => (
                <Toggle key={o} active={form.objectives.includes(o)} onClick={() => toggleIn("objectives", o)}>
                  {o}
                </Toggle>
              ))}
            </Group>

            <Group label="Category">
              {CATEGORIES.map((c) => (
                <Toggle key={c} active={form.category === c} onClick={() => setForm({ ...form, category: form.category === c ? "" : c })}>
                  {c}
                </Toggle>
              ))}
            </Group>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget min">
                <input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} className="input-base" />
              </Field>
              <Field label="Budget max">
                <input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} className="input-base" />
              </Field>
              <Field label="Min followers">
                <input type="number" value={form.min_followers} onChange={(e) => setForm({ ...form, min_followers: e.target.value })} className="input-base" />
              </Field>
              <Field label="Min engagement %">
                <input type="number" step="0.1" value={form.min_engagement_rate} onChange={(e) => setForm({ ...form, min_engagement_rate: e.target.value })} className="input-base" />
              </Field>
              <Field label="Creators needed">
                <input type="number" min={1} value={form.creators_needed} onChange={(e) => setForm({ ...form, creators_needed: e.target.value })} className="input-base" />
              </Field>
              <Field label="Deadline">
                <input type="date" value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} className="input-base" />
              </Field>
              <Field label="Location">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-base" placeholder="Remote / Berlin" />
              </Field>
              <Field label="Location type">
                <select value={form.location_type} onChange={(e) => setForm({ ...form, location_type: e.target.value })} className="input-base">
                  <option value="remote">Remote</option>
                  <option value="in_person">In person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field label="Payment model">
                <select value={form.payment_model} onChange={(e) => setForm({ ...form, payment_model: e.target.value })} className="input-base">
                  <option value="fixed">Fixed fee</option>
                  <option value="per_deliverable">Per deliverable</option>
                  <option value="per_post">Per post</option>
                  <option value="gifted">Gifted</option>
                  <option value="commission">Commission</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
            </div>

            <Field label="Target audience">
              <input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="input-base" placeholder="Women 25–40, US and UK" />
            </Field>

            <div className="mt-5 flex gap-2">
              <button onClick={() => publish.mutate("draft")} disabled={publish.isPending} className="h-11 flex-1 rounded-full border border-border text-sm font-medium">
                Save draft
              </button>
              <button
                onClick={() => publish.mutate("open")}
                disabled={publish.isPending}
                className="h-11 flex-1 rounded-full bg-ember text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {publish.isPending ? "Saving…" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketplaceShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
        active ? "bg-foreground text-background" : "border border-border bg-background text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
