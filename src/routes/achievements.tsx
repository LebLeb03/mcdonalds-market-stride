import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppGuard } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Card, Loading, SectionTitle } from "@/components/kit";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Badges you have earned for step streaks, personal goals and restaurant milestones, plus the ones still to unlock.",
      },
      { property: "og:title", content: "Achievements — McSteps" },
      { property: "og:description", content: "Earn badges for streaks, goals and teamwork." },
    ],
  }),
  component: AchievementsPage,
});

type Achievement = {
  id: string;
  title: string;
  description: string | null;
  badge_icon: string;
  achievement_level: string;
  requirement_value: number | null;
};

function AchievementsPage() {
  const navigate = useNavigate();
  const { user, sessionLoading } = useAppGuard();


  const { data, isLoading } = useQuery({
    queryKey: ["achievements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [all, mine] = await Promise.all([
        supabase.from("achievements").select("*").order("achievement_level"),
        supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user!.id),
      ]);
      if (all.error) throw all.error;
      const earned = new Map<string, string>(
        ((mine.data ?? []) as { achievement_id: string; earned_at: string }[]).map((r) => [
          r.achievement_id,
          r.earned_at,
        ]),
      );
      return { list: (all.data ?? []) as unknown as Achievement[], earned };
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Achievements">
        <Loading />
      </AppShell>
    );
  }

  const earnedList = data.list.filter((a) => data.earned.has(a.id));
  const lockedList = data.list.filter((a) => !data.earned.has(a.id));

  const Badge = ({ a, locked }: { a: Achievement; locked: boolean }) => (
    <div
      className={`rounded-2xl p-3 text-center ${locked ? "bg-muted opacity-70" : "gold-gradient text-accent-foreground"}`}
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-background/70 text-xl">
        {locked ? <Lock className="h-5 w-5 text-muted-foreground" /> : a.badge_icon}
      </div>
      <p className="mt-2 text-xs font-black leading-tight">{a.title}</p>
      <p className="mt-0.5 text-[10px] leading-tight opacity-80">{a.description}</p>
      {!locked ? (
        <p className="mt-1 text-[10px] font-bold">
          Earned {new Date(data.earned.get(a.id)!).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );

  return (
    <AppShell
      title="Achievements"
      subtitle={`${earnedList.length} of ${data.list.length} badges earned`}
    >
      <Card>
        <SectionTitle
          title="Earned"
          right={
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> {earnedList.length}
            </span>
          }
        />
        {earnedList.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {earnedList.map((a) => (
              <Badge key={a.id} a={a} locked={false} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Log steps every day to start unlocking badges.
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle title="Still to unlock" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {lockedList.map((a) => (
            <Badge key={a.id} a={a} locked />
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
