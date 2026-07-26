import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Timer, Flag, TrendingUp, Percent, Trophy } from "lucide-react";
import {
  fmt,
  SCORING_LABEL,
  scoreForMethod,
  useMarketData,
  useProfile,
  type StoreStats,
} from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Loading,
  Pills,
  ProgressBar,
  RankMove,
  SectionTitle,
  Stat,
  StepsChart,
} from "@/components/kit";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market dashboard — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Market-wide step competition overview: restaurant rankings, participation, leading store and most improved restaurant.",
      },
      { property: "og:title", content: "Market dashboard — McSteps" },
      {
        property: "og:description",
        content: "See every restaurant in the market ranked by steps and participation.",
      },
    ],
  }),
  component: MarketPage,
});

const METHODS = [
  "avg_per_active_participant",
  "total_steps",
  "participation_rate",
  "goal_completion_rate",
  "avg_daily_steps",
  "most_improved",
] as const;

function MarketPage() {
  const navigate = useNavigate();
  const { data: profile, user, sessionLoading } = useProfile();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [method, setMethod] = useState<string>("avg_per_active_participant");
  const [period, setPeriod] = useState<"challenge" | "week" | "today">("challenge");

  useEffect(() => {
    if (!sessionLoading && !user) navigate({ to: "/auth", replace: true });
  }, [sessionLoading, user, navigate]);

  useEffect(() => {
    const official = market?.challenges[0]?.scoring_method;
    if (official) setMethod(official);
  }, [market?.challenges]);

  if (isLoading || !market) {
    return (
      <AppShell title="Market dashboard">
        <Loading />
      </AppShell>
    );
  }

  const challenge = market.challenges[0];
  const daysLeft = challenge
    ? Math.max(
        0,
        Math.ceil(
          (new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const format = (s: StoreStats) => {
    const v = scoreForMethod(s, method);
    if (method === "participation_rate" || method === "goal_completion_rate")
      return `${Math.round(v)}%`;
    if (method === "most_improved") return `${v > 0 ? "+" : ""}${Math.round(v)}%`;
    return fmt(v);
  };

  const ranked = [...market.storeStats].sort(
    (a, b) => scoreForMethod(b, method) - scoreForMethod(a, method),
  );
  const leading = ranked[0];
  const mostImproved = [...market.storeStats].sort((a, b) => b.improvement - a.improvement)[0];
  const bestParticipation = [...market.storeStats].sort(
    (a, b) => b.participation - a.participation,
  )[0];

  return (
    <AppShell
      title={market.market.market_name}
      subtitle={`${market.stores.length} restaurants · ${fmt(market.totals.eligible)} team members`}
    >
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Market steps" value={market.totals.steps} tone="primary" />
          <Stat label="Active participants" value={market.totals.participants} tone="accent" />
          <Stat label="Participation" value={`${Math.round(market.totals.participation)}%`} />
          <Stat label="Restaurants" value={market.stores.length} />
        </div>
        {challenge ? (
          <div className="mt-3 rounded-2xl bg-muted p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <p className="truncate text-sm font-black">{challenge.title}</p>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-black text-primary-foreground">
                <Timer className="h-3 w-3" /> {daysLeft} days left
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Official scoring: {SCORING_LABEL[challenge.scoring_method]}
            </p>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[11px] font-black uppercase text-muted-foreground">Leading restaurant</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black">
            <Trophy className="h-4 w-4 text-accent" /> {leading?.store.store_name}
          </p>
          <p className="text-xs text-muted-foreground">{format(leading)}</p>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase text-muted-foreground">Most improved</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black">
            <TrendingUp className="h-4 w-4 text-success" /> {mostImproved?.store.store_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {mostImproved ? `${Math.round(mostImproved.improvement)}% vs last week` : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-black uppercase text-muted-foreground">
            Highest participation
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black">
            <Percent className="h-4 w-4 text-primary" /> {bestParticipation?.store.store_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {bestParticipation ? `${Math.round(bestParticipation.participation)}% active` : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Market progress (7 days)" />
        <StepsChart data={market.totals.weekSeries} />
      </Card>

      <Card>
        <SectionTitle title="Market store leaderboard" />
        <div className="space-y-2">
          <Pills
            value={period}
            onChange={setPeriod}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This week" },
              { value: "challenge", label: "Current challenge" },
            ]}
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {SCORING_LABEL[m]}
                {m === "avg_per_active_participant" ? " (recommended)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Currently scoring by <span className="font-bold">{SCORING_LABEL[method]}</span>.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ranked.map((s, i) => (
          <Card key={s.store.id} className="animate-pop">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className="gold-gradient grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black text-accent-foreground">
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{s.store.store_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  #{s.store.store_number} · {s.store.city}
                </p>
              </div>
              <RankMove change={s.rankChange} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="Total steps" value={s.total} />
              <Stat label="Avg / active" value={Math.round(s.avgPerActive)} />
              <Stat label="Participation" value={`${Math.round(s.participation)}%`} />
              <Stat label="Participating" value={`${s.active}/${s.eligible}`} />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>Restaurant goal</span>
                <span>{Math.round(s.goalProgress * 100)}%</span>
              </div>
              <ProgressBar progress={s.goalProgress} className="mt-1" />
            </div>

            <p className="mt-2 truncate text-xs text-muted-foreground">
              Top participant: {s.topMember?.profile.full_name ?? "—"} ·{" "}
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3 w-3" /> {challenge ? "Challenge active" : "No active challenge"}
              </span>
            </p>

            <Link
              to="/restaurants/$storeId"
              params={{ storeId: s.store.id }}
              className="mt-3 block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-black text-primary-foreground"
            >
              View Restaurant
            </Link>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle title="Market announcements" />
        <ul className="space-y-3">
          {market.announcements
            .filter((a) => a.audience_type === "market")
            .map((a) => (
              <li key={a.id} className="rounded-2xl bg-muted p-3">
                <p className="text-sm font-black">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.message}</p>
              </li>
            ))}
        </ul>
      </Card>
    </AppShell>
  );
}
