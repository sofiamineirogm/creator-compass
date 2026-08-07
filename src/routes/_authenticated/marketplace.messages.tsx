import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { getConversations, getMessages, sendMessage } from "@/lib/marketplace.functions";
import { timeAgo } from "@/lib/marketplace-types";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/_authenticated/marketplace/messages")({
  head: () => ({
    meta: [
      { title: "Messages | CreatorIQ Marketplace" },
      { name: "description", content: "Talk directly with brands and creators about live campaigns." },
      { property: "og:title", content: "Messages | CreatorIQ" },
      { property: "og:description", content: "Campaign conversations between brands and creators." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { viewer } = useViewer();
  const queryClient = useQueryClient();
  const fetchConversations = useServerFn(getConversations);
  const fetchMessages = useServerFn(getMessages);
  const send = useServerFn(sendMessage);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations({ data: undefined as never }),
  });

  const messages = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => fetchMessages({ data: { conversationId: activeId as string } }),
    enabled: Boolean(activeId),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!activeId && conversations.data?.[0]) setActiveId(conversations.data[0].id);
  }, [conversations.data, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data]);

  const post = useMutation({
    mutationFn: () => send({ data: { conversationId: activeId as string, body: draft } }),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = conversations.data ?? [];
  const active = list.find((c) => c.id === activeId) ?? null;

  return (
    <MarketplaceShell title="Messages" subtitle="Campaign conversations, in one thread per collaboration.">
      {list.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="font-display text-lg font-semibold">No conversations yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Conversations open automatically when a brand messages an applicant.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className={`space-y-2 ${active ? "hidden lg:block" : ""}`}>
            {list.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    c.id === activeId ? "border-primary bg-card" : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-foreground">{c.counterpartName}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.campaignTitle ?? "Direct message"}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="surface flex min-h-[60vh] flex-col p-0">
            {active ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{active.counterpartName}</p>
                    <p className="text-xs text-muted-foreground">{active.campaignTitle ?? "Direct message"}</p>
                  </div>
                  <button onClick={() => setActiveId(null)} className="text-xs text-muted-foreground lg:hidden">
                    Back
                  </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {(messages.data ?? []).map((m) => {
                    const mine = m.senderUserId === viewer.userId;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine ? "bg-ember text-primary-foreground" : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-line">{m.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {timeAgo(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim()) post.mutate();
                  }}
                  className="flex items-center gap-2 border-t border-border p-3"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message"
                    aria-label="Message"
                    className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={post.isPending || !draft.trim()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ember text-primary-foreground disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Pick a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </MarketplaceShell>
  );
}
