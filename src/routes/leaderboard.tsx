import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { fmt, isManagerRole, ROLE_LABEL, useMarketData, useAppGuard } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Avatar, Card, Loading, Pills, RankMove, SectionTitle } from "@/components/kit";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Individual leaderboard — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "See how every crew member and manager in the market ranks by steps, streaks and daily average.",
      },
      { property: "og:title", content: "Individual leaderboard — McSteps" },
      {
        property: "og:description",
        content: "Crew and managers compete on one leaderboard across the whole market.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Group = "everyone" | "crew" | "managers";
type Period = "today" | "week" | "challenge";

function LeaderboardPage() {
  const navigate = useNavigate();
  const { data: profile, user, sessionLoading } = useAppGuard();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [group, setGroup] = useState<Group>("everyone");
  const [period, setPeriod] = useState<Period>("challenge");
  const [scope, setScope] = useState<"market" | "store">("market");


  if (isLoading || !market) {
    return (
      <AppShell title="Leaderboards">
        <Loading />
      </AppShell>
    );
  }

  const value = (m: (typeof market.members)[number]) =>
    period === "today" ? m.today : period === "week" ? m.week : m.total;

  const rows = market.members
    .filter((m) => (scope === "store" ? m.profile.store_id === profile?.store_id : true))
    .filter((m) =>
      group === "everyone"
        ? true
        : group === "crew"
          ? m.profile.role === "crew"
          : isManagerRole(m.profile.role),
    )
    .sort((a, b) => value(b) - value(a));

  const podium = rows.slice(0, 3);

  return (
    <AppShell title="Individual leaderboard" subtitle={market.market.market_name}>
      <Card>
        <div className="space-y-2">
          <Pills
            value={scope}
            onChange={setScope}
            options={[
              { value: "market", label: "Whole market" },
              { value: "store", label: "My restaurant" },
            ]}
          />
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
        <p className="mt-3 text-xs text-muted-foreground">
          Crew and managers are ranked together by default — management permissions never remove
          anyone from the leaderboard.
        </p>
      </Card>

      {podium.length === 3 ? (
        <Card>
          <SectionTitle title="Podium" />
          <div className="grid grid-cols-3 items-end gap-2">
            {[podium[1], podium[0], podium[2]].map((m, i) => {
              const heights = ["h-16", "h-24", "h-12"];
              const place = [2, 1, 3][i];
              return (
                <div key={m.profile.user_id} className="text-center">
                  <Avatar name={m.profile.full_name} url={m.profile.avatar_url} size={44} />
                  <p className="mt-1 truncate text-[11px] font-bold">{m.profile.full_name}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{fmt(value(m))}</p>
                  <div
                    className={`gold-gradient mt-1 grid ${heights[i]} place-items-center rounded-t-2xl text-lg font-black text-accent-foreground`}
                  >
                    {place === 1 ? <Crown className="h-5 w-5" /> : place}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card>
        <SectionTitle title={`${rows.length} participants`} />
        <ul className="divide-y divide-border">
          {rows.map((m, i) => {
            const store = market.stores.find((s) => s.id === m.profile.store_id);
            const mine = m.profile.user_id === profile?.user_id;
            return (
              <li
                key={m.profile.user_id}
                className={`grid grid-cols-[28px_auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5 ${mine ? "rounded-xl bg-accent/25 px-2" : ""}`}
              >
                <span className="text-sm font-black tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar name={m.profile.full_name} url={m.profile.avatar_url} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{m.profile.full_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.profile.job_title ?? ROLE_LABEL[m.profile.role]} ·{" "}
                    {store ? (
                      <Link
                        to="/restaurants/$storeId"
                        params={{ storeId: store.id }}
                        className="font-semibold text-primary"
                      >
                        {store.store_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Avg {fmt(m.dailyAverage)} · {m.streak}-day streak
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black tabular-nums">{fmt(value(m))}</p>
                  <RankMove change={m.rankChange} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </AppShell>
  );
}
