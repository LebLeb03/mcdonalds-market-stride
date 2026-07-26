import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketData, useProfile, todayISO, fmt } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/kit";

export const Route = createFileRoute("/add-steps")({
  head: () => ({
    meta: [
      { title: "Add steps — McSteps Market Challenge" },
      {
        name: "description",
        content: "Log your daily steps for the market step challenge and keep your streak alive.",
      },
      { property: "og:title", content: "Add steps — McSteps" },
      { property: "og:description", content: "Submit your daily steps in seconds." },
    ],
  }),
  component: AddStepsPage,
});

const REVIEW_THRESHOLD = 60000;

function AddStepsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, user, sessionLoading } = useProfile();
  const { data: market } = useMarketData(profile?.market_id);
  const [date, setDate] = useState(todayISO());
  const [steps, setSteps] = useState("");
  const [method] = useState("manual");
  const [proof, setProof] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ steps: number; pending: boolean } | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) navigate({ to: "/auth", replace: true });
  }, [sessionLoading, user, navigate]);

  useEffect(() => {
    if (!challengeId && market?.challenges[0]) setChallengeId(market.challenges[0].id);
  }, [market, challengeId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    const count = Number(steps);
    if (!Number.isFinite(count) || count < 0) {
      toast.error("Steps must be a positive number.");
      return;
    }
    if (date > todayISO()) {
      toast.error("You can't log steps for a future date.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("step_entries").insert({
        user_id: user.id,
        store_id: profile.store_id,
        challenge_id: challengeId || null,
        entry_date: date,
        step_count: Math.round(count),
        entry_method: method as "manual",
        proof_url: proof || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("You already logged steps for that date in this challenge.");
          return;
        }
        throw error;
      }
      await qc.invalidateQueries();
      setDone({ steps: Math.round(count), pending: count > REVIEW_THRESHOLD });
      setSteps("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your steps");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AppShell title="Steps submitted" subtitle="Nice work — keep the team moving.">
        <Card className="animate-pop text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <p className="mt-3 text-3xl font-black tabular-nums">{fmt(done.steps)}</p>
          <p className="text-sm text-muted-foreground">steps logged for {date}</p>
          {done.pending ? (
            <p className="mt-3 rounded-xl bg-accent p-3 text-xs font-bold text-accent-foreground">
              Over {fmt(REVIEW_THRESHOLD)} steps — marked Pending Manager Review.
            </p>
          ) : (
            <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Counted toward your total, your restaurant total and the market rankings.
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setDone(null)}
              className="rounded-xl bg-muted px-4 py-3 text-sm font-black"
            >
              Add more
            </button>
            <Link
              to="/"
              className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
            >
              Back to my steps
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Add steps" subtitle="Manual entry — every step counts for your store.">
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Date
            </span>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Steps
            </span>
            <input
              type="number"
              min={0}
              max={300000}
              required
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="12,480"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-center text-2xl font-black tabular-nums outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Challenge
            </span>
            <select
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {(market?.challenges ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Entry method
            </span>
            <input
              readOnly
              value="Manual entry"
              className="mt-1 w-full rounded-xl border border-input bg-muted px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Proof screenshot link (optional, private)
            </span>
            <input
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Entries above {fmt(REVIEW_THRESHOLD)} steps are flagged Pending Manager Review. Future
            dates, negative values and duplicate dates are blocked.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Saving…" : "Submit steps"}
          </button>
        </form>
      </Card>

      <Card>
        <SectionTitle title="Automatic step syncing coming soon" />
        <div className="space-y-2">
          {["Apple Health", "Google Health Connect", "Fitbit"].map((p) => (
            <div key={p} className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{p}</span>
              <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Step history"
          right={
            <Link to="/history" className="text-xs font-bold text-primary">
              View all
            </Link>
          }
        />
        <p className="text-xs text-muted-foreground">
          See every entry you've submitted and its approval status.
        </p>
      </Card>
    </AppShell>
  );
}
