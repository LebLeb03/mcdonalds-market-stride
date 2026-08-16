import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Gift, Trophy, Info, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CHALLENGE_TYPE_LABEL,
  SCORING_LABEL,
  fmt,
  isManagerRole,
  scoreForMethod,
  todayISO,
  useMarketData,
  useAppGuard,
  type Challenge,
} from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, Loading, Pills, ProgressBar, SectionTitle } from "@/components/kit";


export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Active, upcoming and completed step challenges with rules, rewards, scoring method and live standings.",
      },
      { property: "og:title", content: "Challenges — McSteps" },
      {
        property: "og:description",
        content: "Track every market and restaurant step challenge in one place.",
      },
    ],
  }),
  component: ChallengesPage,
});

function daysLeft(c: Challenge) {
  return Math.max(
    0,
    Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

function ChallengesPage() {
  const navigate = useNavigate();
  const { data: profile, user, sessionLoading } = useAppGuard();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [tab, setTab] = useState<"active" | "upcoming" | "completed">("active");
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading || !market) {
    return (
      <AppShell title="Challenges">
        <Loading />
      </AppShell>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const list = market.challenges.filter((c) =>
    tab === "active"
      ? c.start_date <= today && c.end_date >= today
      : tab === "upcoming"
        ? c.start_date > today
        : c.end_date < today,
  );

  const me = user ? market.memberById[user.id] : null;

  return (
    <AppShell title="Challenges" subtitle={market.market.market_name}>
      <Card>
        <Pills
          value={tab}
          onChange={setTab}
          options={[
            { value: "active", label: "Active" },
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </Card>

      {list.length === 0 ? (
        <EmptyState title="Nothing here yet" message="No challenges in this category right now." />
      ) : null}

      {list.map((c) => {
        const open = openId === c.id;
        const standings = [...market.storeStats]
          .sort((a, b) => scoreForMethod(b, c.scoring_method) - scoreForMethod(a, c.scoring_method))
          .slice(0, 5);
        const personalProgress = me ? Math.min(1, me.total / Math.max(1, c.personal_step_goal)) : 0;

        return (
          <Card key={c.id}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black">{c.title}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {CHALLENGE_TYPE_LABEL[c.challenge_type] ?? c.challenge_type} ·{" "}
                  {c.challenge_level === "market" ? "Market wide" : "Restaurant"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-black text-primary-foreground">
                {tab === "active" ? `${daysLeft(c)} days left` : c.status}
              </span>
            </div>

            {c.description ? (
              <p className="mt-2 text-xs text-muted-foreground">{c.description}</p>
            ) : null}

            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> {c.start_date} → {c.end_date}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted p-2.5">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Personal goal
                </p>
                <p className="text-sm font-black tabular-nums">{fmt(c.personal_step_goal)}</p>
              </div>
              <div className="rounded-xl bg-muted p-2.5">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Restaurant goal
                </p>
                <p className="text-sm font-black tabular-nums">{fmt(c.store_step_goal)}</p>
              </div>
            </div>

            {me ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Your progress</span>
                  <span>
                    {fmt(me.total)} / {fmt(c.personal_step_goal)}
                  </span>
                </div>
                <ProgressBar progress={personalProgress} className="mt-1" />
              </div>
            ) : null}

            <button
              onClick={() => setOpenId(open ? null : c.id)}
              className="mt-3 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-accent-foreground"
            >
              {open ? "Hide details" : "View details"}
            </button>

            {open ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl bg-muted p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-black">
                    <Info className="h-3.5 w-3.5" /> Scoring
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {SCORING_LABEL[c.scoring_method] ?? c.scoring_method}. Daily entries above{" "}
                    {fmt(c.maximum_daily_steps)} steps are held for manager approval.
                  </p>
                </div>
                {c.rules ? (
                  <div className="rounded-2xl bg-muted p-3">
                    <p className="text-xs font-black">Rules</p>
                    <p className="whitespace-pre-line text-xs text-muted-foreground">{c.rules}</p>
                  </div>
                ) : null}
                {c.reward_title ? (
                  <div className="rounded-2xl bg-accent/30 p-3">
                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-accent-foreground">
                      <Gift className="h-3.5 w-3.5" /> {c.reward_title}
                    </p>
                    <p className="text-xs text-accent-foreground/80">{c.reward_description}</p>
                  </div>
                ) : null}
                <div>
                  <SectionTitle title="Current standings" />
                  <ul className="space-y-1.5">
                    {standings.map((s, i) => (
                      <li
                        key={s.store.id}
                        className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-muted px-3 py-2"
                      >
                        <span className="text-xs font-black text-muted-foreground">{i + 1}</span>
                        <span className="truncate text-sm font-bold">{s.store.store_name}</span>
                        <span className="text-sm font-black tabular-nums">
                          {c.scoring_method === "participation_rate" ||
                          c.scoring_method === "goal_completion_rate"
                            ? `${Math.round(scoreForMethod(s, c.scoring_method))}%`
                            : fmt(scoreForMethod(s, c.scoring_method))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" /> Winners are announced at the end of the
                  challenge period.
                </p>
              </div>
            ) : null}
          </Card>
        );
      })}
    </AppShell>
  );
}
