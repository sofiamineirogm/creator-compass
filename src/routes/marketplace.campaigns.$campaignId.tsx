import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, CalendarDays, MapPin, Users, Wallet } from "lucide-react";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { getCampaign, submitApplication, toggleSavedCampaign } from "@/lib/marketplace.functions";
import { daysUntil, formatBudget, formatMoney } from "@/lib/marketplace-types";
import { useViewer } from "@/hooks/use-viewer";
import { canApplyToCampaign, isSignedIn, upgradeMessage } from "@/lib/entitlements";

export const Route = createFileRoute("/marketplace/campaigns/$campaignId")({
  loader: async ({ params }) => {
    const campaign = await getCampaign({ data: { id: params.campaignId } });
    if (!campaign) throw notFound();
    return { campaign };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Campaign unavailable | CreatorIQ" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.campaign;
    const title = `${c.title} — ${c.brand.companyName} | CreatorIQ`;
    const description = c.description.slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  errorComponent: () => (
    <div className="px-6 py-32 text-center text-sm text-muted-foreground">This campaign could not be loaded.</div>
  ),
  notFoundComponent: () => (
    <div className="px-6 py-32 text-center text-sm text-muted-foreground">This campaign is no longer listed.</div>
  ),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { campaign } = Route.useLoaderData();
  const { viewer } = useViewer();
  const queryClient = useQueryClient();
  const apply = useServerFn(submitApplication);
  const toggleSaved = useServerFn(toggleSavedCampaign);

  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [price, setPrice] = useState(String(campaign.budgetMin || ""));
  const [availability, setAvailability] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      apply({
        data: {
          campaign_id: campaign.id,
          cover_message: pitch,
          proposed_price: Number(price) || 0,
          currency: campaign.currency,
          availability,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      setOpen(false);
      toast.success("Application sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => toggleSaved({ data: { campaignId: campaign.id } }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["saved-campaigns"] });
      toast.success(r.saved ? "Saved" : "Removed");
    },
    onError: () => toast.error("Sign in to save campaigns."),
  });

  const days = daysUntil(campaign.applicationDeadline);
  const allowed = canApplyToCampaign(viewer);

  return (
    <MarketplaceShell title={campaign.title} subtitle={campaign.brand.companyName}>
      <Link to="/marketplace" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All campaigns
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-muted text-sm font-semibold text-muted-foreground">
                {campaign.brand.logoUrl ? (
                  <img src={campaign.brand.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  campaign.brand.companyName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  {campaign.brand.companyName}
                  {campaign.brand.isVerified ? <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified brand" /> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {campaign.brand.industry ?? "Brand"}
                  {campaign.brand.location ? ` · ${campaign.brand.location}` : ""}
                </p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">{campaign.description}</p>
          </section>

          {campaign.objectives.length > 0 || campaign.targetAudience || campaign.expectedContent ? (
            <section className="surface space-y-4 p-5">
              <h2 className="font-display text-lg font-semibold">The brief</h2>
              {campaign.objectives.length > 0 ? (
                <Detail label="Objectives" value={campaign.objectives.join(" · ")} />
              ) : null}
              {campaign.targetAudience ? <Detail label="Target audience" value={campaign.targetAudience} /> : null}
              {campaign.expectedContent ? <Detail label="Expected content" value={campaign.expectedContent} /> : null}
              {campaign.deliverables.length > 0 ? (
                <Detail label="Deliverables" value={campaign.deliverables.join(", ")} />
              ) : null}
            </section>
          ) : null}

          <section className="surface space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">Creator requirements</h2>
            <Detail
              label="Audience size"
              value={`${campaign.minFollowers.toLocaleString()}+${campaign.maxFollowers ? ` up to ${campaign.maxFollowers.toLocaleString()}` : ""} followers`}
            />
            <Detail label="Minimum engagement" value={`${campaign.minEngagementRate}%`} />
            {campaign.creatorCategories.length > 0 ? (
              <Detail label="Niches" value={campaign.creatorCategories.join(", ")} />
            ) : null}
            {campaign.languages.length > 0 ? <Detail label="Languages" value={campaign.languages.join(", ")} /> : null}
            {campaign.audienceRequirements ? <Detail label="Audience notes" value={campaign.audienceRequirements} /> : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="surface space-y-3 p-5">
            <Stat icon={Wallet} label="Budget" value={formatBudget(campaign.budgetMin, campaign.budgetMax, campaign.currency)} />
            <Stat icon={Users} label="Creators needed" value={`${campaign.creatorsNeeded} · ${campaign.applicantsCount} applied`} />
            <Stat
              icon={MapPin}
              label="Location"
              value={`${campaign.location ?? "Anywhere"} (${campaign.locationType.replace("_", " ")})`}
            />
            <Stat
              icon={CalendarDays}
              label="Deadline"
              value={days === null ? "Open" : days > 0 ? `${days} days left` : "Closing today"}
            />

            <div className="space-y-2 pt-2">
              {allowed ? (
                <button
                  onClick={() => setOpen(true)}
                  className="h-11 w-full rounded-full bg-ember text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Apply to campaign
                </button>
              ) : isSignedIn(viewer) ? (
                <div className="rounded-2xl bg-muted p-3 text-center text-xs text-muted-foreground">
                  {upgradeMessage("apply")}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex h-11 w-full items-center justify-center rounded-full bg-ember text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Sign in to apply
                </Link>
              )}
              <button
                onClick={() => save.mutate()}
                className="h-11 w-full rounded-full border border-border text-sm font-medium"
              >
                Save for later
              </button>
            </div>
          </div>
        </aside>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift sm:max-w-lg sm:rounded-3xl">
            <h2 className="font-display text-lg font-semibold">Apply to {campaign.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Budget guide: {formatBudget(campaign.budgetMin, campaign.budgetMax, campaign.currency)}
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="pitch">
              Your pitch
            </label>
            <textarea
              id="pitch"
              rows={5}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Why you, what you would make, and how you would deliver it."
              className="mt-2 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="price">
                  Your rate
                </label>
                <input
                  id="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {price ? formatMoney(Number(price), campaign.currency) : "Enter an amount"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="availability">
                  Availability
                </label>
                <input
                  id="availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. from 12 May"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setOpen(false)} className="h-11 flex-1 rounded-full border border-border text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="h-11 flex-1 rounded-full bg-ember text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {submit.isPending ? "Sending…" : "Send application"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MarketplaceShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-foreground">{value}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize text-foreground">{value}</p>
      </div>
    </div>
  );
}
