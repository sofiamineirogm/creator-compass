import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bookmark, Compass, FileText, MessageSquare, Megaphone, UserRound } from "lucide-react";

import { useViewer } from "@/hooks/use-viewer";
import { isBrandSide, PLAN_LABELS, ROLE_LABELS } from "@/lib/entitlements";
import { DemoSwitcher } from "@/components/demo-switcher";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Compass;
}

const CREATOR_NAV: NavItem[] = [
  { to: "/marketplace", label: "Discover", icon: Compass },
  { to: "/marketplace/applications", label: "Applied", icon: FileText },
  { to: "/marketplace/saved", label: "Saved", icon: Bookmark },
  { to: "/marketplace/messages", label: "Inbox", icon: MessageSquare },
  { to: "/my-creator", label: "My Creator", icon: UserRound },
];

const BRAND_NAV: NavItem[] = [
  { to: "/marketplace", label: "Discover", icon: Compass },
  { to: "/marketplace/manage", label: "Campaigns", icon: Megaphone },
  { to: "/marketplace/messages", label: "Inbox", icon: MessageSquare },
  { to: "/marketplace/profile", label: "Profile", icon: UserRound },
];

export function MarketplaceShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { viewer } = useViewer();
  const nav = isBrandSide(viewer) ? BRAND_NAV : CREATOR_NAV;

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-8 sm:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {viewer.userId ? (
              <span className="hidden rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:inline">
                {ROLE_LABELS[viewer.role]} · {PLAN_LABELS[viewer.plan]}
              </span>
            ) : null}
            {action}
          </div>
        </div>

        <nav className="mt-5 hidden gap-1 border-b border-border sm:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/marketplace" }}
              activeProps={{ className: "border-primary text-foreground" }}
              inactiveProps={{ className: "border-transparent text-muted-foreground" }}
              className="border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="mt-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <ul className="flex items-stretch justify-around">
          {nav.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/marketplace" }}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <DemoSwitcher />
    </div>
  );
}
