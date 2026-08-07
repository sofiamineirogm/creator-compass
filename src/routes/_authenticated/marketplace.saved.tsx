import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { CampaignCard } from "@/components/marketplace/campaign-card";
import { getSavedCampaigns, toggleSavedCampaign } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/marketplace/saved")({
  head: () => ({
    meta: [
      { title: "Saved Campaigns | CreatorIQ Marketplace" },
      { name: "description", content: "Your shortlist of campaigns to revisit and apply to later." },
      { property: "og:title", content: "Saved Campaigns | CreatorIQ" },
      { property: "og:description", content: "Your shortlist of brand campaigns." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const queryClient = useQueryClient();
  const fetchSaved = useServerFn(getSavedCampaigns);
  const toggleSaved = useServerFn(toggleSavedCampaign);

  const saved = useQuery({
    queryKey: ["saved-campaigns", "page"],
    queryFn: () => fetchSaved({ data: undefined as never }),
  });

  const remove = useMutation({
    mutationFn: (campaignId: string) => toggleSaved({ data: { campaignId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-campaigns"] }),
  });

  const rows = saved.data ?? [];

  return (
    <MarketplaceShell title="Saved" subtitle="Campaigns you bookmarked for later.">
      {saved.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-56 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-semibold">Nothing saved yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Tap the bookmark on any campaign to keep it here.</p>
          <Link
            to="/marketplace"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground"
          >
            Browse campaigns
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <CampaignCard key={c.id} campaign={c} saved onToggleSave={(id) => remove.mutate(id)} />
          ))}
        </div>
      )}
    </MarketplaceShell>
  );
}
