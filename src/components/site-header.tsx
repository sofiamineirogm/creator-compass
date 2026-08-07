import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onHero = pathname === "/";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const tone = onHero ? "text-primary-foreground" : "text-foreground";

  return (
    <header className={`absolute inset-x-0 top-0 z-20 ${onHero ? "" : "relative border-b border-border bg-card/70 backdrop-blur"}`}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className={`font-display text-base font-semibold tracking-tight ${tone}`}>
          CreatorIQ
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/marketplace"
            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 ${tone}`}
          >
            Marketplace
          </Link>
        </nav>

        {loading ? (
          <div className="h-9 w-24" />
        ) : user ? (
          <nav className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 ${tone}`}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              onClick={signOut}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 ${tone}`}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        ) : (
          <Link
            to="/auth"
            className={
              onHero
                ? "inline-flex h-9 items-center rounded-full bg-card px-5 text-sm font-semibold text-foreground shadow-lift"
                : "inline-flex h-9 items-center rounded-full bg-ember px-5 text-sm font-semibold text-primary-foreground shadow-glow"
            }
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
