import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare } from "lucide-react";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import {
  getCampaignApplicants,
  startConversation,
  updateApplicationStatus,
} from "@/lib/marketplace.functions";
import { APPLICATION_LABELS, APPLICATION_STAGES, formatMoney, timeAgo } from "@/lib/marketplace-types";

export const Route = createFileRoute("/_authenticated/marketplace/manage/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign Applicants | CreatorIQ Marketplace" },
      { name: "description", content: "Review creators who applied, move them through stages and start a conversation." },
      { property: "og:title", content: "Campaign Applicants | CreatorIQ" },
      { property: "og:description", content: "Review and shortlist creators for your campaign." },
    ],
  }),
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchApplicants = useServerFn(getCampaignApplicants);
  const setStatus = useServerFn(updateApplicationStatus);
  const openChat = useServerFn(startConversation);

  const applicants = useQuery({
    queryKey: ["applicants", campaignId],
    queryFn: () => fetchApplicants({ data: { campaignId } }),
  });

  const move = useMutation({
    mutationFn: (vars: { id: string; status: string }) => setStatus({ data: vars }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applicants", campaignId] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const message = useMutation({
    mutationFn: (vars: { creatorUserId: string; applicationId: string }) =>
      openChat({ data: { creatorUserId: vars.creatorUserId, campaignId, applicationId: vars.applicationId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void navigate({ to: "/marketplace/messages" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = applicants.data ?? [];

  return (
    <MarketplaceShell title="Applicants" subtitle="Shortlist, negotiate and confirm the creators you want.">
      <Link to="/marketplace/manage" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My campaigns
      </Link>

      {applicants.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="surface h-32 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-semibold">No applications yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Share the brief — applications will appear here in real time.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {a.creator?.avatarUrl ? (
                      <img src={a.creator.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (a.creator?.displayName ?? "C").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.creator?.displayName ?? "Creator"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.creator?.handle ? `@${a.creator.handle} · ` : ""}applied {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
                  {APPLICATION_LABELS[a.status]}
                </span>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{a.coverMessage}</p>
              <p className="mt-2 text-sm font-semibold text-sunset">{formatMoney(a.proposedPrice, a.currency)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {APPLICATION_STAGES.filter((s) => s !== a.status && s !== "completed").map((s) => (
                  <button
                    key={s}
                    onClick={() => move.mutate({ id: a.id, status: s })}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium capitalize text-muted-foreground hover:text-foreground"
                  >
                    {APPLICATION_LABELS[s]}
                  </button>
                ))}
                <button
                  onClick={() => message.mutate({ creatorUserId: a.creatorUserId, applicationId: a.id })}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Message
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MarketplaceShell>
  );
}
