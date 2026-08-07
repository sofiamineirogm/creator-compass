import { Link } from "@tanstack/react-router";
import { Bookmark, MapPin, Users } from "lucide-react";

import { formatBudget, daysUntil, type Campaign } from "@/lib/marketplace-types";

export function CampaignCard({
  campaign,
  saved,
  onToggleSave,
}: {
  campaign: Campaign;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const days = daysUntil(campaign.applicationDeadline);

  return (
    <article className="surface relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-lift">
      {onToggleSave ? (
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save campaign"}
          onClick={() => onToggleSave(campaign.id)}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current text-primary" : ""}`} aria-hidden />
        </button>
      ) : null}

      <div className="flex items-center gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
          {campaign.brand.logoUrl ? (
            <img src={campaign.brand.logoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            campaign.brand.companyName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{campaign.brand.companyName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {campaign.category ?? "General"}
            {campaign.location ? ` · ${campaign.location}` : ""}
          </p>
        </div>
      </div>

      <Link
        to="/marketplace/campaigns/$campaignId"
        params={{ campaignId: campaign.id }}
        className="font-display text-base font-semibold leading-snug text-foreground hover:underline"
      >
        {campaign.title}
      </Link>

      <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {campaign.platforms.map((p) => (
          <span key={p} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium capitalize text-secondary-foreground">
            {p}
          </span>
        ))}
        {campaign.deliverables.slice(0, 3).map((d) => (
          <span key={d} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-sm font-semibold text-sunset">
          {formatBudget(campaign.budgetMin, campaign.budgetMax, campaign.currency)}
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {campaign.applicantsCount}
          </span>
          <span className="inline-flex items-center gap-1 capitalize">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {campaign.locationType.replace("_", " ")}
          </span>
          {days !== null ? (
            <span className={days <= 3 ? "font-medium text-primary" : ""}>
              {days > 0 ? `${days}d left` : "Closing"}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
