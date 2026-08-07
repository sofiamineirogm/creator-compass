import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { CampaignCard } from "@/components/marketplace/campaign-card";
import { getCampaigns, getSavedCampaigns, toggleSavedCampaign } from "@/lib/marketplace.functions";
import {
  CATEGORIES,
  DELIVERABLES,
  FOLLOWER_BANDS,
  SORT_LABELS,
  type CampaignFilters,
  type CampaignSort,
} from "@/lib/marketplace-types";
import { useViewer } from "@/hooks/use-viewer";
import { canCreateCampaign } from "@/lib/entitlements";

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Creator Marketplace — Discover Campaigns | CreatorIQ" },
      {
        name: "description",
        content:
          "Browse paid Instagram and TikTok campaigns from vetted brands. Filter by budget, category, platform and audience size.",
      },
      { property: "og:title", content: "Creator Marketplace — Discover Campaigns" },
      {
        property: "og:description",
        content: "Paid Instagram and TikTok campaigns from vetted brands, matched to your audience.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { viewer } = useViewer();
  const queryClient = useQueryClient();
  const fetchCampaigns = useServerFn(getCampaigns);
  const fetchSaved = useServerFn(getSavedCampaigns);
  const toggleSaved = useServerFn(toggleSavedCampaign);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CampaignFilters>({ sort: "newest" });
  const [sheetOpen, setSheetOpen] = useState(false);

  const query = useMemo<CampaignFilters>(() => ({ ...filters, search: search.trim() || undefined }), [filters, search]);

  const campaigns = useQuery({
    queryKey: ["campaigns", query],
    queryFn: () => fetchCampaigns({ data: query }),
  });

  const saved = useQuery({
    queryKey: ["saved-campaigns", viewer.userId],
    queryFn: () => fetchSaved({ data: undefined as never }),
    enabled: Boolean(viewer.userId),
  });

  const savedIds = new Set((saved.data ?? []).map((c) => c.id));

  const save = useMutation({
    mutationFn: (campaignId: string) => toggleSaved({ data: { campaignId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-campaigns"] }),
    onError: () => toast.error("Sign in to save campaigns."),
  });

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "sort" && v !== undefined && v !== "").length;

  function patch(next: Partial<CampaignFilters>) {
    setFilters((f) => ({ ...f, ...next }));
  }

  return (
    <MarketplaceShell
      title="Discover campaigns"
      subtitle="Live briefs from brands looking for Instagram and TikTok creators."
      action={
        canCreateCampaign(viewer) ? (
          <Link
            to="/marketplace/manage"
            className="inline-flex h-9 items-center rounded-full bg-ember px-4 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            New campaign
          </Link>
        ) : null
      }
    >
      <div className="sticky top-0 z-20 -mx-4 mb-4 bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search briefs, brands, categories"
              aria-label="Search campaigns"
              className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{activeCount}</span>
            ) : null}
          </button>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(SORT_LABELS) as CampaignSort[]).slice(1).map((s) => (
            <button
              key={s}
              onClick={() => patch({ sort: s })}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.sort === s ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {campaigns.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="surface h-56 animate-pulse" />
          ))}
        </div>
      ) : (campaigns.data ?? []).length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-semibold text-foreground">No campaigns match yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Try widening the filters, or check back soon — new briefs are published every week.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(campaigns.data ?? []).map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              saved={savedIds.has(c.id)}
              onToggleSave={viewer.userId ? (id) => save.mutate(id) : undefined}
            />
          ))}
        </div>
      )}

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <button
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift sm:max-w-lg sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filters</h2>
              <button onClick={() => setSheetOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-muted-foreground" aria-hidden />
              </button>
            </div>

            <FilterGroup label="Platform">
              {["instagram", "tiktok"].map((p) => (
                <Chip key={p} active={filters.platform === p} onClick={() => patch({ platform: filters.platform === p ? undefined : p })}>
                  {p}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Category">
              {CATEGORIES.map((c) => (
                <Chip key={c} active={filters.category === c} onClick={() => patch({ category: filters.category === c ? undefined : c })}>
                  {c}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Deliverable">
              {DELIVERABLES.map((d) => (
                <Chip key={d} active={filters.deliverable === d} onClick={() => patch({ deliverable: filters.deliverable === d ? undefined : d })}>
                  {d}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Audience size">
              {FOLLOWER_BANDS.map((b) => (
                <Chip
                  key={b.key}
                  active={filters.followerBand === b.key}
                  onClick={() => patch({ followerBand: filters.followerBand === b.key ? undefined : b.key })}
                >
                  {b.label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Location type">
              {(["remote", "in_person", "hybrid"] as const).map((t) => (
                <Chip key={t} active={filters.locationType === t} onClick={() => patch({ locationType: filters.locationType === t ? undefined : t })}>
                  {t.replace("_", " ")}
                </Chip>
              ))}
            </FilterGroup>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="minBudget">
                Minimum budget
              </label>
              <input
                id="minBudget"
                type="number"
                min={0}
                step={100}
                value={filters.minBudget ?? ""}
                onChange={(e) => patch({ minBudget: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Any"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setFilters({ sort: filters.sort })}
                className="h-11 flex-1 rounded-full border border-border text-sm font-medium"
              >
                Clear
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-11 flex-1 rounded-full bg-ember text-sm font-semibold text-primary-foreground"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketplaceShell>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
        active ? "bg-foreground text-background" : "border border-border bg-background text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
