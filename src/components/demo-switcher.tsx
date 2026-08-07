import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";

import { DEMO_PERSONAS, isDemoMode, personaFor } from "@/lib/demo";
import { seedDemoCampaigns, switchDemoPersona } from "@/lib/marketplace.functions";
import { useViewer } from "@/hooks/use-viewer";

/** Development-only persona switcher. Hidden unless VITE_DEMO_MODE=true. */
export function DemoSwitcher() {
  const { viewer } = useViewer();
  const queryClient = useQueryClient();
  const switchPersona = useServerFn(switchDemoPersona);
  const seed = useServerFn(seedDemoCampaigns);
  const [open, setOpen] = useState(false);

  const switchTo = useMutation({
    mutationFn: (persona: string) => switchPersona({ data: { persona } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries();
      toast.success(`Switched to ${result.role} · ${result.plan}`);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadDemo = useMutation({
    mutationFn: () => seed({ data: undefined as never }),
    onSuccess: async (r) => {
      await queryClient.invalidateQueries();
      toast.success(`Added ${r.inserted} demo campaigns`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = isDemoMode();
  const active = personaFor(viewer.role, viewer.plan);
  if (!enabled || !viewer.userId) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-6">
      {open ? (
        <div className="mb-2 w-64 rounded-2xl border border-border bg-popover p-2 shadow-lift">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Test accounts
          </p>
          {DEMO_PERSONAS.map((p) => (
            <button
              key={p.key}
              onClick={() => switchTo.mutate(p.key)}
              disabled={switchTo.isPending}
              className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted ${
                active?.key === p.key ? "bg-muted" : ""
              }`}
            >
              <span className="text-sm font-medium text-foreground">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.description}</span>
            </button>
          ))}
          <button
            onClick={() => loadDemo.mutate()}
            disabled={loadDemo.isPending}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {loadDemo.isPending ? "Adding…" : "Load demo campaigns"}
          </button>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-dusk px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lift"
      >
        <FlaskConical className="h-4 w-4" aria-hidden />
        {active?.label ?? "Demo mode"}
      </button>
    </div>
  );
}
