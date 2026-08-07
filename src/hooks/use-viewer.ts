import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "./use-auth";
import { getViewer } from "@/lib/marketplace.functions";
import { ANONYMOUS_VIEWER, type Viewer } from "@/lib/entitlements";

/** Session + role + plan, the single source of truth for permission checks. */
export function useViewer(): { viewer: Viewer; loading: boolean } {
  const { user, loading } = useAuth();
  const fetchViewer = useServerFn(getViewer);

  const { data, isLoading } = useQuery({
    queryKey: ["viewer", user?.id ?? "anon"],
    queryFn: () => fetchViewer({ data: undefined as never }),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  if (!user) return { viewer: ANONYMOUS_VIEWER, loading };
  return { viewer: data ?? { ...ANONYMOUS_VIEWER, userId: user.id, email: user.email ?? null }, loading: loading || isLoading };
}
