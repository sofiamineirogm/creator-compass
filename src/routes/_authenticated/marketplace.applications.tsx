import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { getMyApplications, withdrawApplication } from "@/lib/marketplace.functions";
import { APPLICATION_LABELS, formatMoney, timeAgo, type ApplicationStatus } from "@/lib/marketplace-types";

export const Route = createFileRoute("/_authenticated/marketplace/applications")({
  head: () => ({
    meta: [
      { title: "My Applications | CreatorIQ Marketplace" },
      { name: "description", content: "Track every campaign application, from applied through to completed." },
      { property: "og:title", content: "My Applications | CreatorIQ" },
      { property: "og:description", content: "Track every campaign application in one place." },
    ],
  }),
  component: ApplicationsPage,
});

const TONE: Record<ApplicationStatus, string> = {
  applied: "bg-secondary text-secondary-foreground",
  shortlisted: "bg-accent text-accent-foreground",
  negotiation: "bg-accent text-accent-foreground",
  accepted: "bg-success text-success-foreground",
  rejected: "bg-muted text-muted-foreground",
  completed: "bg-success text-success-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};

function ApplicationsPage() {
  const queryClient = useQueryClient();
  const fetchApplications = useServerFn(getMyApplications);
  const withdraw = useServerFn(withdrawApplication);

  const applications = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => fetchApplications({ data: undefined as never }),
  });

  const pull = useMutation({
    mutationFn: (id: string) => withdraw({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success("Application withdrawn");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = applications.data ?? [];

  return (
    <MarketplaceShell title="My applications" subtitle="Every brief you have pitched, and where it stands.">
      {applications.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-28 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-semibold">No applications yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Find a brief that fits and send your first pitch.</p>
          <Link
            to="/marketplace"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground"
          >
            Discover campaigns
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {a.campaign ? (
                    <Link
                      to="/marketplace/campaigns/$campaignId"
                      params={{ campaignId: a.campaignId }}
                      className="font-display text-base font-semibold text-foreground hover:underline"
                    >
                      {a.campaign.title}
                    </Link>
                  ) : (
                    <p className="font-display text-base font-semibold">Campaign removed</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {a.campaign?.brand.companyName ?? "—"} · applied {timeAgo(a.createdAt)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${TONE[a.status]}`}>
                  {APPLICATION_LABELS[a.status]}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.coverMessage}</p>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-sunset">{formatMoney(a.proposedPrice, a.currency)}</span>
                {a.status === "applied" || a.status === "shortlisted" ? (
                  <button
                    onClick={() => pull.mutate(a.id)}
                    className="text-xs font-medium text-muted-foreground hover:text-destructive"
                  >
                    Withdraw
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MarketplaceShell>
  );
}
