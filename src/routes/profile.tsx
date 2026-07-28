import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Award, Store as StoreIcon, Target, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmt, ROLE_LABEL, useMarketData, useAppGuard } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Avatar, Card, Loading, SectionTitle, Stat } from "@/components/kit";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Manage your daily step goal, challenge participation and restaurant details, and review your personal totals.",
      },
      { property: "og:title", content: "Your profile — McSteps" },
      {
        property: "og:description",
        content: "Set your daily goal and manage your challenge participation.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, user, sessionLoading } = useAppGuard();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [goal, setGoal] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.daily_goal) setGoal(String(profile.daily_goal));
  }, [profile?.daily_goal]);

  const save = useMutation({
    mutationFn: async (patch: { daily_goal?: number; participates_in_challenges?: boolean }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["market-data"] });
    },
  });

  if (isLoading || !profile || !market) {
    return (
      <AppShell title="Profile">
        <Loading />
      </AppShell>
    );
  }

  const me = market.memberById[profile.user_id];
  const store = profile.store_id ? market.storeStatsById[profile.store_id] : null;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <AppShell title="Your profile" subtitle={ROLE_LABEL[profile.role]}>
      <Card>
        <div className="flex items-center gap-3">
          <Avatar name={profile.full_name} url={profile.avatar_url} size={56} />
          <div className="min-w-0">
            <p className="truncate text-base font-black">{profile.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.job_title ?? ROLE_LABEL[profile.role]}
              {store ? ` · ${store.store.store_name}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Challenge steps" value={me?.total ?? 0} tone="primary" />
          <Stat label="Market rank" value={`#${me?.marketRank ?? "—"}`} tone="accent" />
          <Stat label="Daily average" value={me?.dailyAverage ?? 0} />
          <Stat label="Best day" value={me?.best ?? 0} />
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Flame className="h-4 w-4 text-primary" /> {me?.streak ?? 0} day streak ·{" "}
          {me?.activeDays ?? 0} active days
        </p>
      </Card>

      <Card>
        <SectionTitle title="Daily step goal" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => save.mutate({ daily_goal: Number(goal) || 10000 })}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"
          >
            <Target className="mr-1 inline h-4 w-4" /> Save
          </button>
        </div>
        {saved ? <p className="mt-2 text-xs font-bold text-success">Saved.</p> : null}
      </Card>

      <Card>
        <SectionTitle title="Challenge participation" />
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            Include me in restaurant and market leaderboards
          </span>
          <input
            type="checkbox"
            checked={profile.participates_in_challenges}
            onChange={(e) => save.mutate({ participates_in_challenges: e.target.checked })}
            className="h-6 w-6 shrink-0 accent-[var(--primary)]"
          />
        </label>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/achievements" className="block">
          <Card className="h-full">
            <p className="inline-flex items-center gap-2 text-sm font-black">
              <Award className="h-4 w-4 text-accent" /> Achievements
            </p>
            <p className="text-xs text-muted-foreground">View all badges you can earn.</p>
          </Card>
        </Link>
        {store ? (
          <Link to="/restaurants/$storeId" params={{ storeId: store.store.id }} className="block">
            <Card className="h-full">
              <p className="inline-flex items-center gap-2 text-sm font-black">
                <StoreIcon className="h-4 w-4 text-primary" /> {store.store.store_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Rank #{store.rank} · {fmt(store.total)} team steps
              </p>
            </Card>
          </Link>
        ) : null}
      </div>

      <button
        onClick={signOut}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-input bg-background px-4 py-3 text-sm font-black"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </AppShell>
  );
}
