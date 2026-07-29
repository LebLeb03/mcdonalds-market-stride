import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Flame,
  Trophy,
  Medal,
  Users,
  ClipboardCheck,
  Megaphone,
  BarChart3,
  UserCog,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { fmt, isManagerRole, ROLE_LABEL, useMarketData, useAppGuard, daysAgoISO } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import {
  Avatar,
  Card,
  Loading,
  ProgressBar,
  ProgressRing,
  RankMove,
  SectionTitle,
  Stat,
  StepsChart,
} from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Steps — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Your personal step dashboard: today's steps, streaks, restaurant rank and market rank in the crew and manager step challenge.",
      },
      { property: "og:title", content: "My Steps — McSteps Market Challenge" },
      {
        property: "og:description",
        content: "Track your steps, your restaurant team and your market rank.",
      },
    ],
  }),
  component: PersonalDashboard,
});

function PersonalDashboard() {
  const navigate = useNavigate();
  const { data: profile, isLoading, user, sessionLoading } = useAppGuard();
  const { data: market, isLoading: marketLoading } = useMarketData(profile?.market_id);

  useEffect(() => {
    if (profile && !profile.store_id) navigate({ to: "/join", replace: true });
  }, [profile, navigate]);

  if (sessionLoading || isLoading || marketLoading || !profile || !market) {
    return (
      <AppShell title="My Steps">
        <Loading />
      </AppShell>
    );
  }

  const me = market.memberById[profile.user_id];
  const store = market.stores.find((s) => s.id === profile.store_id);
  const storeStats = store ? market.storeStatsById[store.id] : undefined;
  const challenge = market.challenges[0];
  const manager = isManagerRole(profile.role);
  const last7 = Array.from({ length: 7 }, (_, i) => daysAgoISO(6 - i)).map((date) => ({
    date,
    steps: me?.byDate[date] ?? 0,
  }));
  const personalGoal = challenge?.personal_step_goal ?? 70000;
  const encouragement = market.members
    .filter((m) => m.profile.store_id === profile.store_id && m.total > 0)
    .slice(0, 3);

  return (
    <AppShell
      title={profile.full_name}
      subtitle={`${store?.store_name ?? "No restaurant"} · #${store?.store_number ?? "—"} · ${profile.job_title ?? ROLE_LABEL[profile.role]}`}
      action={
        <Link
          to="/add-steps"
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-accent px-3 text-sm font-black text-accent-foreground shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add
        </Link>
      }
    >
      <Card className="animate-pop">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between">
          <ProgressRing
            progress={(me?.today ?? 0) / (profile.daily_goal || 10000)}
            label={fmt(me?.today ?? 0)}
            sublabel={`of ${fmt(profile.daily_goal)} daily goal`}
          />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
            <Stat label="This week" value={me?.week ?? 0} />
            <Stat label="This month" value={me?.month ?? 0} />
            <Stat label="Challenge total" value={me?.total ?? 0} tone="accent" />
            <Stat label="Daily average" value={me?.dailyAverage ?? 0} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-muted px-3 py-3.5 text-center">
            <p className="text-[11px] font-bold uppercase leading-tight text-muted-foreground">
              Market rank
            </p>
            <p className="mt-1.5 text-lg font-black leading-none">#{me?.marketRank ?? "—"}</p>
            <div className="mt-1.5">
              <RankMove change={me?.rankChange ?? 0} />
            </div>
          </div>
          <div className="rounded-2xl bg-muted px-3 py-3.5 text-center">
            <p className="text-[11px] font-bold uppercase leading-tight text-muted-foreground">
              Store rank
            </p>
            <p className="mt-1.5 text-lg font-black leading-none">#{me?.storeRank ?? "—"}</p>
          </div>
          <div className="rounded-2xl bg-muted px-3 py-3.5 text-center">
            <p className="text-[11px] font-bold uppercase leading-tight text-muted-foreground">
              Streak
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-lg font-black leading-none">
              <Flame className="h-4 w-4 text-primary" />
              {me?.streak ?? 0}
            </p>
          </div>
        </div>
      </Card>


      <Card>
        <SectionTitle title="Last 7 days" />
        <StepsChart data={last7} />
      </Card>

      {challenge ? (
        <Card>
          <SectionTitle
            title="Active challenge"
            right={
              <Link to="/challenges" className="text-xs font-bold text-primary">
                All challenges
              </Link>
            }
          />
          <p className="text-sm font-black leading-snug">{challenge.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {challenge.description}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold">
            <span>Personal goal progress</span>
            <span className="tabular-nums">
              {fmt(me?.total ?? 0)} / {fmt(personalGoal)}
            </span>
          </div>
          <ProgressBar progress={(me?.total ?? 0) / personalGoal} className="mt-2" />
        </Card>
      ) : null}

      {store && storeStats ? (
        <Card>
          <SectionTitle
            title="My restaurant"
            right={
              <Link
                to="/restaurants/$storeId"
                params={{ storeId: store.id }}
                className="text-xs font-bold text-primary"
              >
                View team page
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Market rank" value={`#${storeStats.rank}`} tone="primary" />
            <Stat label="Team steps" value={storeStats.total} />
            <Stat label="Participation" value={`${Math.round(storeStats.participation)}%`} />
          </div>
          <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Everyone on the restaurant team contributes, including managers.
          </p>
        </Card>
      ) : null}

      <Card>
        <SectionTitle
          title="Recent achievements"
          right={
            <Link to="/achievements" className="text-xs font-bold text-primary">
              All badges
            </Link>
          }
        />
        <div className="flex flex-wrap gap-2.5">
          {[
            { icon: Trophy, label: "Team Contributor" },
            {
              icon: Medal,
              label: (me?.marketRank ?? 99) <= 10 ? "Market Top Ten" : "Personal Best",
            },
            { icon: Flame, label: `${me?.streak ?? 0}-day streak` },
            ...(manager ? [{ icon: Sparkles, label: "Manager on the Move" }] : []),
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="gold-gradient inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-accent-foreground"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Encouragement from your team" />
        <ul className="space-y-3">
          {encouragement.map((m) => (
            <li key={m.profile.user_id} className="flex items-center gap-3">
              <Avatar name={m.profile.full_name} url={m.profile.avatar_url} size={34} />
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-bold">{m.profile.full_name.split(" ")[0]}</span>{" "}
                <span className="text-muted-foreground">said “Way to represent our store!”</span>
              </p>
              <ThumbsUp className="h-4 w-4 shrink-0 text-accent" />
            </li>
          ))}
        </ul>
      </Card>

      {manager ? (
        <Card className="border-2 border-accent">
          <SectionTitle title="Manager Tools" />
          <p className="mb-3 text-xs text-muted-foreground">
            Your personal competition stats stay above — these are your store leader tools.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: "/manager", label: "Pending approvals", icon: ClipboardCheck },
              { to: "/manager", label: "Crew participation", icon: Users },
              { to: "/manager", label: "Create a challenge", icon: Trophy },
              { to: "/manager", label: "Post announcement", icon: Megaphone },
              { to: "/manager", label: "Manage members", icon: UserCog },
              { to: "/manager", label: "Restaurant analytics", icon: BarChart3 },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-2 rounded-2xl bg-muted p-3 text-xs font-bold"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
