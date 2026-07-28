import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ImagePlus, MapPin, Users, Flame, Megaphone, Trophy } from "lucide-react";
import { fmt, isManagerRole, ROLE_LABEL, useMarketData, useAppGuard } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import {
  Avatar,
  Card,
  Loading,
  Pills,
  ProgressBar,
  RankMove,
  SectionTitle,
  Stat,
  StepsChart,
} from "@/components/kit";

export const Route = createFileRoute("/restaurants/$storeId")({
  head: () => ({
    meta: [
      { title: "Restaurant dashboard — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Restaurant team page: total steps, participation, internal leaderboard, announcements and challenge progress.",
      },
      { property: "og:title", content: "Restaurant dashboard — McSteps" },
      {
        property: "og:description",
        content: "Everyone on the restaurant team contributes, including managers.",
      },
    ],
  }),
  component: RestaurantDashboard,
});

type Group = "everyone" | "crew" | "managers";
type Period = "today" | "week" | "challenge";

function RestaurantDashboard() {
  const { storeId } = Route.useParams();
  const navigate = useNavigate();
  const { data: profile, user, sessionLoading } = useAppGuard();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [group, setGroup] = useState<Group>("everyone");
  const [period, setPeriod] = useState<Period>("challenge");

  if (isLoading || !market) {
    return (
      <AppShell title="Restaurant">
        <Loading />
      </AppShell>
    );
  }

  const stats = market.storeStatsById[storeId];
  if (!stats) {
    return (
      <AppShell title="Restaurant not found">
        <Card>
          <p className="text-sm">That restaurant isn't part of your market.</p>
          <Link to="/restaurants" className="mt-2 inline-block text-sm font-bold text-primary">
            Back to directory
          </Link>
        </Card>
      </AppShell>
    );
  }

  const value = (m: (typeof market.members)[number]) =>
    period === "today" ? m.today : period === "week" ? m.week : m.total;

  const roster = market.members
    .filter((m) => m.profile.store_id === storeId)
    .filter((m) =>
      group === "everyone"
        ? true
        : group === "crew"
          ? m.profile.role === "crew"
          : isManagerRole(m.profile.role),
    )
    .sort((a, b) => value(b) - value(a));

  const top5 = market.members
    .filter((m) => m.profile.store_id === storeId)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const announcements = market.announcements.filter((a) => a.store_id === storeId);
  const challenge = market.challenges[0];

  return (
    <AppShell
      title={stats.store.store_name}
      subtitle={`#${stats.store.store_number} · ${stats.store.city}, ${stats.store.province}`}
      action={
        <span className="inline-flex h-10 items-center rounded-2xl bg-accent px-3 text-sm font-black text-accent-foreground">
          Rank #{stats.rank}
        </span>
      }
    >
      <Card>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-muted text-center text-[9px] font-bold text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            Upload image
          </div>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {stats.store.city} · Store #{stats.store.store_number}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-black tabular-nums">#{stats.rank}</span>
              <RankMove change={stats.rankChange} />
              <span className="text-xs text-muted-foreground">since yesterday</span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Total team steps" value={stats.total} tone="primary" />
          <Stat
            label="Avg / active participant"
            value={Math.round(stats.avgPerActive)}
            tone="accent"
          />
          <Stat label="Active participants" value={`${stats.active}/${stats.eligible}`} />
          <Stat label="Participation" value={`${Math.round(stats.participation)}%`} />
          <Stat label="Average daily steps" value={Math.round(stats.avgDaily)} />
          <Stat label="Challenge" value={challenge ? "Active" : "None"} />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Restaurant goal progress</span>
            <span>{Math.round(stats.goalProgress * 100)}%</span>
          </div>
          <ProgressBar progress={stats.goalProgress} className="mt-1.5" />
        </div>

        <p className="mt-3 rounded-xl bg-accent/30 p-3 text-xs font-bold text-accent-foreground">
          Everyone on the restaurant team contributes, including managers.
        </p>
      </Card>

      <Card>
        <SectionTitle title="Daily restaurant totals (7 days)" />
        <StepsChart data={stats.weekSeries} />
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <SectionTitle title="Crew vs manager participation" />
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Crew
                </span>
                <span>
                  {stats.crewActive}/{stats.crewTotal}
                </span>
              </div>
              <ProgressBar
                progress={stats.crewTotal ? stats.crewActive / stats.crewTotal : 0}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" /> Managers
                </span>
                <span>
                  {stats.managerActive}/{stats.managerTotal}
                </span>
              </div>
              <ProgressBar
                progress={stats.managerTotal ? stats.managerActive / stats.managerTotal : 0}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Top five participants" />
          <ul className="space-y-2">
            {top5.map((m, i) => (
              <li key={m.profile.user_id} className="flex items-center gap-3">
                <span className="w-4 text-sm font-black text-muted-foreground">{i + 1}</span>
                <Avatar name={m.profile.full_name} url={m.profile.avatar_url} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {m.profile.full_name}
                </span>
                <span className="shrink-0 text-sm font-black tabular-nums">{fmt(m.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Restaurant leaderboard" />
        <div className="space-y-2">
          <Pills
            value={group}
            onChange={setGroup}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "crew", label: "Crew" },
              { value: "managers", label: "Managers" },
            ]}
          />
          <Pills
            value={period}
            onChange={setPeriod}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This week" },
              { value: "challenge", label: "Entire challenge" },
            ]}
          />
        </div>
        <ul className="mt-3 divide-y divide-border">
          {roster.map((m, i) => (
            <li
              key={m.profile.user_id}
              className="grid grid-cols-[24px_auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5"
            >
              <span className="text-sm font-black tabular-nums text-muted-foreground">{i + 1}</span>
              <Avatar name={m.profile.full_name} url={m.profile.avatar_url} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{m.profile.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.profile.job_title ?? ROLE_LABEL[m.profile.role]} · avg {fmt(m.dailyAverage)} ·{" "}
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="h-3 w-3" />
                    {m.streak}
                  </span>
                </p>
                <ProgressBar progress={m.goalProgress} className="mt-1 h-1.5" />
              </div>
              <div className="text-right">
                <p className="text-sm font-black tabular-nums">{fmt(value(m))}</p>
                <RankMove change={m.rankChange} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title="Restaurant announcements" />
        {announcements.length ? (
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-2xl bg-muted p-3">
                <p className="inline-flex items-center gap-1.5 text-sm font-black">
                  <Megaphone className="h-3.5 w-3.5 text-primary" /> {a.title}
                </p>
                <p className="text-xs text-muted-foreground">{a.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No announcements yet.</p>
        )}
      </Card>
    </AppShell>
  );
}
