import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home,
  Trophy,
  ListOrdered,
  Store as StoreIcon,
  User as UserIcon,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { isManagerRole, useProfile } from "@/lib/data";
import wordmark from "@/assets/mcd-wordmark.png.asset.json";

const NAV = [
  { to: "/", label: "Home", shortLabel: "Home", icon: Home },
  { to: "/challenges", label: "Challenges", shortLabel: "Goals", icon: Trophy },
  { to: "/leaderboard", label: "Leaderboards", shortLabel: "Ranks", icon: ListOrdered },
  { to: "/restaurants", label: "Restaurants", shortLabel: "Stores", icon: StoreIcon },
  { to: "/profile", label: "Profile", shortLabel: "You", icon: UserIcon },
] as const;

export function AppShell({
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
  const { data: profile } = useProfile();
  const manager = isManagerRole(profile?.role);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="hero-arches px-4 pb-20 pt-6 text-primary-foreground sm:px-8 sm:pb-20">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
          <div className="min-w-0">
            <img
              src={wordmark.url}
              alt="McDonald's"
              className="h-6 w-auto sm:h-8"
              loading="eager"
            />
            <h1 className="mt-3 truncate text-xl leading-tight sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-[13px] leading-snug text-primary-foreground/80 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {profile?.role === "market_admin" ? (
              <Link
                to="/admin"
                className="grid h-10 w-10 place-items-center rounded-2xl bg-card text-primary shadow-sm"
                aria-label="Market admin console"
              >
                <Settings className="h-5 w-5" />
              </Link>
            ) : null}
            {manager ? (
              <Link
                to="/manager"
                className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm"
                aria-label="Manager tools"
              >
                <ShieldCheck className="h-5 w-5" />
              </Link>
            ) : null}
            {action}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-8 max-w-6xl space-y-4 px-4 pb-4 sm:space-y-6 sm:px-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-stretch gap-1 px-1.5 py-1.5 sm:gap-2 sm:px-3">
          {NAV.map(({ to, label, shortLabel, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-center text-[10px] font-semibold leading-none text-muted-foreground transition-colors data-[status=active]:bg-muted data-[status=active]:text-primary sm:text-[11px]"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate sm:hidden">{shortLabel}</span>
              <span className="hidden w-full truncate sm:inline">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
