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

const TYPES = Object.keys(CHALLENGE_TYPE_LABEL);
const METHODS = Object.keys(SCORING_LABEL);

const addDaysISO = (from: string, n: number) => {
  const d = new Date(`${from}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

type Draft = {
  title: string;
  description: string;
  challenge_type: string;
  challenge_level: "market" | "store";
  scoring_method: string;
  start_date: string;
  end_date: string;
  personal_step_goal: number;
  store_step_goal: number;
  maximum_daily_steps: number;
  reward_title: string;
  reward_description: string;
  rules: string;
};

const emptyDraft = (): Draft => ({
  title: "",
  description: "",
  challenge_type: "weekly_step_challenge",
  challenge_level: "market",
  scoring_method: "avg_per_active_participant",
  start_date: todayISO(),
  end_date: addDaysISO(todayISO(), 6),
  personal_step_goal: 70000,
  store_step_goal: 1000000,
  maximum_daily_steps: 60000,
  reward_title: "",
  reward_description: "",
  rules: "",
});

const field =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring";
const label = "text-[11px] font-black uppercase tracking-wide text-muted-foreground";

function CreateChallenge({ marketId, userId }: { marketId: string; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>(emptyDraft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!d.title.trim()) throw new Error("Give the challenge a title");
      if (d.end_date < d.start_date) throw new Error("End date must be after the start date");
      const { error } = await supabase.from("challenges").insert({
        market_id: marketId,
        created_by: userId,
        title: d.title.trim(),
        description: d.description.trim() || null,
        challenge_type: d.challenge_type,
        challenge_level: d.challenge_level,
        scoring_method: d.scoring_method,
        start_date: d.start_date,
        end_date: d.end_date,
        status: d.start_date > todayISO() ? "upcoming" : "active",
        personal_step_goal: d.personal_step_goal,
        store_step_goal: d.store_step_goal,
        maximum_daily_steps: d.maximum_daily_steps,
        reward_title: d.reward_title.trim() || null,
        reward_description: d.reward_description.trim() || null,
        rules: d.rules.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge created");
      setD(emptyDraft());
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["market-data"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create challenge"),
  });

  const preset = (days: number) => {
    const start = todayISO();
    setD((p) => ({ ...p, start_date: start, end_date: addDaysISO(start, days - 1) }));
  };

  return (
    <Card>
      <SectionTitle
        title="Create a challenge"
        right={
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
          >
            {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {open ? "Close" : "New challenge"}
          </button>
        }
      />
      {!open ? (
        <p className="text-xs text-muted-foreground">
          Set a title, a start and end date, and the goals your teams are chasing.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className={label}>Title</p>
            <input
              className={field}
              value={d.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="August Step Sprint"
            />
          </div>
          <div>
            <p className={label}>Description</p>
            <textarea
              className={`${field} min-h-20`}
              value={d.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this challenge is about"
            />
          </div>

          <div>
            <p className={label}>Challenge period</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {[
                { d: 7, l: "1 week" },
                { d: 14, l: "2 weeks" },
                { d: 30, l: "30 days" },
              ].map((p) => (
                <button
                  key={p.d}
                  onClick={() => preset(p.d)}
                  className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-black"
                >
                  {p.l}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                className={field}
                value={d.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
              <input
                type="date"
                className={field}
                value={d.end_date}
                min={d.start_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className={label}>Type</p>
              <select
                className={field}
                value={d.challenge_type}
                onChange={(e) => set("challenge_type", e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CHALLENGE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className={label}>Level</p>
              <select
                className={field}
                value={d.challenge_level}
                onChange={(e) => set("challenge_level", e.target.value as Draft["challenge_level"])}
              >
                <option value="market">Market wide</option>
                <option value="store">Restaurant</option>
              </select>
            </div>
          </div>

          <div>
            <p className={label}>Scoring</p>
            <select
              className={field}
              value={d.scoring_method}
              onChange={(e) => set("scoring_method", e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {SCORING_LABEL[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <p className={label}>Personal goal</p>
              <input
                type="number"
                className={field}
                value={d.personal_step_goal}
                onChange={(e) => set("personal_step_goal", Number(e.target.value))}
              />
            </div>
            <div>
              <p className={label}>Restaurant goal</p>
              <input
                type="number"
                className={field}
                value={d.store_step_goal}
                onChange={(e) => set("store_step_goal", Number(e.target.value))}
              />
            </div>
            <div>
              <p className={label}>Daily review over</p>
              <input
                type="number"
                className={field}
                value={d.maximum_daily_steps}
                onChange={(e) => set("maximum_daily_steps", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className={label}>Reward title</p>
              <input
                className={field}
                value={d.reward_title}
                onChange={(e) => set("reward_title", e.target.value)}
                placeholder="Team lunch"
              />
            </div>
            <div>
              <p className={label}>Reward details</p>
              <input
                className={field}
                value={d.reward_description}
                onChange={(e) => set("reward_description", e.target.value)}
                placeholder="Winning restaurant gets…"
              />
            </div>
          </div>

          <div>
            <p className={label}>Rules</p>
            <textarea
              className={`${field} min-h-20`}
              value={d.rules}
              onChange={(e) => set("rules", e.target.value)}
              placeholder="One entry per day, manager approval over the daily cap…"
            />
          </div>

          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create challenge"}
          </button>
        </div>
      )}
    </Card>
  );
}

function ChallengesPage() {
  const qc = useQueryClient();
  const { data: profile, user } = useAppGuard();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [tab, setTab] = useState<"active" | "upcoming" | "completed">("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const canManage = isManagerRole(profile?.role);

  const endNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("challenges")
        .update({ end_date: todayISO(), status: "completed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge closed");
      qc.invalidateQueries({ queryKey: ["market-data"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not close challenge"),
  });

  if (isLoading || !market) {
    return (
      <AppShell title="Challenges">
        <Loading />
      </AppShell>
    );
  }

  const today = todayISO();
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
      {canManage && profile?.market_id && user ? (
        <CreateChallenge marketId={profile.market_id} userId={user.id} />
      ) : null}

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
