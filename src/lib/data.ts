import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "crew" | "manager" | "general_manager" | "market_admin";

export type Profile = {
  id: string;
  user_id: string;
  market_id: string | null;
  store_id: string | null;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  job_title: string | null;
  daily_goal: number;
  participates_in_challenges: boolean;
  account_status: string;
};

export type Store = {
  id: string;
  market_id: string;
  store_name: string;
  store_number: string;
  city: string | null;
  province: string | null;
  store_image_url: string | null;
  /** Only retrievable by managers through the get_store_invitation_code RPC. */
  invitation_code?: string | null;
  is_active: boolean;
};

export type Entry = {
  id: string;
  user_id: string;
  store_id: string | null;
  challenge_id: string | null;
  entry_date: string;
  step_count: number;
  entry_method: string;
  proof_url: string | null;
  approval_status: "approved" | "pending" | "rejected";
  rejection_reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
};

export type Challenge = {
  id: string;
  market_id: string;
  title: string;
  description: string | null;
  challenge_level: "store" | "market";
  challenge_type: string;
  scoring_method: string;
  start_date: string;
  end_date: string;
  status: string;
  personal_step_goal: number;
  store_step_goal: number;
  maximum_daily_steps: number;
  reward_title: string | null;
  reward_description: string | null;
  rules: string | null;
  image_url: string | null;
};

export type Announcement = {
  id: string;
  market_id: string | null;
  store_id: string | null;
  audience_type: string;
  title: string;
  message: string;
  created_at: string;
};

export const MANAGER_ROLES: Role[] = ["manager", "general_manager", "market_admin"];
export const isManagerRole = (role?: Role | null) => !!role && MANAGER_ROLES.includes(role);

export const ROLE_LABEL: Record<Role, string> = {
  crew: "Crew Member",
  manager: "Manager",
  general_manager: "General Manager",
  market_admin: "Market Administrator",
};

export const SCORING_LABEL: Record<string, string> = {
  total_steps: "Total restaurant steps",
  avg_per_active_participant: "Average steps per active participant",
  participation_rate: "Participation percentage",
  goal_completion_rate: "Percentage reaching their goal",
  avg_daily_steps: "Average daily steps",
  most_improved: "Most improved restaurant",
};

export const CHALLENGE_TYPE_LABEL: Record<string, string> = {
  individual_step_champion: "Individual Step Champion",
  restaurant_vs_restaurant: "Restaurant vs Restaurant",
  crew_manager_team: "Crew & Manager Team Challenge",
  weekly_step_challenge: "Weekly Step Challenge",
  monthly_step_challenge: "Monthly Step Challenge",
  weekend_challenge: "Weekend Challenge",
  personal_goal_challenge: "Personal Goal Challenge",
  participation_challenge: "Participation Challenge",
  most_improved_restaurant: "Most Improved Restaurant",
  restaurant_streak_challenge: "Restaurant Streak Challenge",
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Session ------------------------------------------------------------- */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useProfile() {
  const { user, loading } = useSession();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Profile | null;
    },
  });
  return { ...query, user, sessionLoading: loading };
}

/**
 * Shared page guard: sends signed-out visitors to /auth and members who have
 * not joined a restaurant yet to /join, so pages never hang on a spinner.
 */
export function useAppGuard() {
  const navigate = useNavigate();
  const query = useProfile();
  const { user, sessionLoading, isLoading, data } = query;

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!isLoading && data && !data.market_id) {
      navigate({ to: "/join", replace: true });
    }
  }, [sessionLoading, user, isLoading, data, navigate]);

  return query;
}



/** Paged fetch to get past PostgREST row caps */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let page = 0; page < 12; page++) {
    const { data, error } = await build(page * size, page * size + size - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

export type MemberStats = {
  profile: Profile;
  total: number;
  today: number;
  week: number;
  month: number;
  activeDays: number;
  dailyAverage: number;
  best: number;
  streak: number;
  marketRank: number;
  storeRank: number;
  goalProgress: number;
  rankChange: number;
  byDate: Record<string, number>;
};

export type StoreStats = {
  store: Store;
  total: number;
  eligible: number;
  active: number;
  participation: number;
  avgPerActive: number;
  avgDaily: number;
  goalProgress: number;
  rank: number;
  rankChange: number;
  topMember: MemberStats | null;
  crewActive: number;
  managerActive: number;
  crewTotal: number;
  managerTotal: number;
  weekSeries: { date: string; steps: number }[];
  improvement: number;
  goalReachedRate: number;
};

export type MarketData = {
  market: { id: string; market_name: string; market_code: string; region: string | null };
  stores: Store[];
  profiles: Profile[];
  entries: Entry[];
  challenges: Challenge[];
  announcements: Announcement[];
  members: MemberStats[];
  memberById: Record<string, MemberStats>;
  storeStats: StoreStats[];
  storeStatsById: Record<string, StoreStats>;
  totals: {
    steps: number;
    participants: number;
    eligible: number;
    participation: number;
    weekSeries: { date: string; steps: number }[];
  };
};

export function scoreForMethod(s: StoreStats, method: string): number {
  switch (method) {
    case "total_steps":
      return s.total;
    case "participation_rate":
      return s.participation;
    case "goal_completion_rate":
      return s.goalReachedRate;
    case "avg_daily_steps":
      return s.avgDaily;
    case "most_improved":
      return s.improvement;
    default:
      return s.avgPerActive;
  }
}

function buildMarketData(
  market: MarketData["market"],
  stores: Store[],
  profiles: Profile[],
  entries: Entry[],
  challenges: Challenge[],
  announcements: Announcement[],
): MarketData {
  const approved = entries.filter((e) => e.approval_status === "approved");
  const today = todayISO();
  const weekStart = daysAgoISO(6);
  const monthStart = daysAgoISO(29);
  const last7 = Array.from({ length: 7 }, (_, i) => daysAgoISO(6 - i));

  const base: Record<string, MemberStats> = {};
  for (const p of profiles) {
    base[p.user_id] = {
      profile: p,
      total: 0,
      today: 0,
      week: 0,
      month: 0,
      activeDays: 0,
      dailyAverage: 0,
      best: 0,
      streak: 0,
      marketRank: 0,
      storeRank: 0,
      goalProgress: 0,
      rankChange: 0,
      byDate: {},
    };
  }

  for (const e of approved) {
    const m = base[e.user_id];
    if (!m) continue;
    m.total += e.step_count;
    m.byDate[e.entry_date] = (m.byDate[e.entry_date] ?? 0) + e.step_count;
    if (e.entry_date === today) m.today += e.step_count;
    if (e.entry_date >= weekStart) m.week += e.step_count;
    if (e.entry_date >= monthStart) m.month += e.step_count;
    m.best = Math.max(m.best, e.step_count);
  }

  for (const m of Object.values(base)) {
    const dates = Object.keys(m.byDate);
    m.activeDays = dates.length;
    m.dailyAverage = dates.length ? Math.round(m.total / dates.length) : 0;
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = daysAgoISO(i);
      if (m.byDate[d]) streak++;
      else if (i > 0 || !m.byDate[today]) {
        if (i === 0) continue;
        break;
      }
    }
    m.streak = streak;
    m.goalProgress = m.profile.daily_goal ? Math.min(1, m.today / m.profile.daily_goal) : 0;
  }

  const members = Object.values(base);
  const ranked = [...members].sort((a, b) => b.total - a.total);
  ranked.forEach((m, i) => (m.marketRank = i + 1));
  const yesterdayRanked = [...members]
    .map((m) => ({ m, v: m.total - (m.byDate[today] ?? 0) }))
    .sort((a, b) => b.v - a.v);
  yesterdayRanked.forEach(({ m }, i) => (m.rankChange = i + 1 - m.marketRank));

  for (const store of stores) {
    const inStore = members
      .filter((m) => m.profile.store_id === store.id)
      .sort((a, b) => b.total - a.total);
    inStore.forEach((m, i) => (m.storeRank = i + 1));
  }

  const storeStats: StoreStats[] = stores.map((store) => {
    const roster = members.filter((m) => m.profile.store_id === store.id);
    const activeMembers = roster.filter((m) => m.total > 0);
    const total = roster.reduce((s, m) => s + m.total, 0);
    const daySet = new Set<string>();
    roster.forEach((m) => Object.keys(m.byDate).forEach((d) => daySet.add(d)));
    const weekSeries = last7.map((date) => ({
      date,
      steps: roster.reduce((s, m) => s + (m.byDate[date] ?? 0), 0),
    }));
    const prevWeek = Array.from({ length: 7 }, (_, i) => daysAgoISO(13 - i)).reduce(
      (s, date) => s + roster.reduce((x, m) => x + (m.byDate[date] ?? 0), 0),
      0,
    );
    const thisWeek = weekSeries.reduce((s, d) => s + d.steps, 0);
    const crew = roster.filter((m) => m.profile.role === "crew");
    const mgrs = roster.filter((m) => m.profile.role !== "crew");
    return {
      store,
      total,
      eligible: roster.length,
      active: activeMembers.length,
      participation: roster.length ? (activeMembers.length / roster.length) * 100 : 0,
      avgPerActive: activeMembers.length ? total / activeMembers.length : 0,
      avgDaily: daySet.size ? total / daySet.size : 0,
      goalProgress: 0,
      rank: 0,
      rankChange: 0,
      topMember: activeMembers[0] ?? null,
      crewActive: crew.filter((m) => m.total > 0).length,
      managerActive: mgrs.filter((m) => m.total > 0).length,
      crewTotal: crew.length,
      managerTotal: mgrs.length,
      weekSeries,
      improvement: prevWeek ? ((thisWeek - prevWeek) / prevWeek) * 100 : 0,
      goalReachedRate: roster.length
        ? (roster.filter((m) => m.week >= m.profile.daily_goal * 7).length / roster.length) * 100
        : 0,
    };
  });

  const goal = challenges[0]?.store_step_goal ?? 1_000_000;
  storeStats.forEach((s) => (s.goalProgress = Math.min(1, s.total / goal)));

  const byAvg = [...storeStats].sort((a, b) => b.avgPerActive - a.avgPerActive);
  byAvg.forEach((s, i) => (s.rank = i + 1));
  const yesterdayStores = [...storeStats]
    .map((s) => {
      const roster = members.filter((m) => m.profile.store_id === s.store.id);
      const activePrev = roster.filter((m) => m.total - (m.byDate[today] ?? 0) > 0).length;
      const totalPrev = roster.reduce((x, m) => x + m.total - (m.byDate[today] ?? 0), 0);
      return { s, v: activePrev ? totalPrev / activePrev : 0 };
    })
    .sort((a, b) => b.v - a.v);
  yesterdayStores.forEach(({ s }, i) => (s.rankChange = i + 1 - s.rank));

  const activeTotal = members.filter((m) => m.total > 0).length;
  const marketWeek = last7.map((date) => ({
    date,
    steps: members.reduce((s, m) => s + (m.byDate[date] ?? 0), 0),
  }));

  return {
    market,
    stores,
    profiles,
    entries,
    challenges,
    announcements,
    members: ranked,
    memberById: Object.fromEntries(members.map((m) => [m.profile.user_id, m])),
    storeStats: byAvg,
    storeStatsById: Object.fromEntries(storeStats.map((s) => [s.store.id, s])),
    totals: {
      steps: members.reduce((s, m) => s + m.total, 0),
      participants: activeTotal,
      eligible: members.length,
      participation: members.length ? (activeTotal / members.length) * 100 : 0,
      weekSeries: marketWeek,
    },
  };
}

export function useMarketData(marketId?: string | null) {
  return useQuery({
    queryKey: ["market-data", marketId],
    enabled: !!marketId,
    staleTime: 30_000,
    queryFn: async (): Promise<MarketData> => {
      const [marketRes, storesRes, profilesRes, challengesRes, annRes] = await Promise.all([
        supabase.from("markets").select("*").eq("id", marketId!).single(),
        supabase
          .from("stores")
          .select(
            "id, market_id, store_name, store_number, city, province, store_image_url, is_active",
          )
          .eq("market_id", marketId!)
          .order("store_number"),
        supabase.from("profiles").select("*").eq("market_id", marketId!),
        supabase
          .from("challenges")
          .select("*")
          .eq("market_id", marketId!)
          .order("start_date", { ascending: false }),
        supabase
          .from("announcements")
          .select("*")
          .eq("market_id", marketId!)
          .order("created_at", { ascending: false }),
      ]);
      if (marketRes.error) throw marketRes.error;
      if (storesRes.error) throw storesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const stores = (storesRes.data ?? []) as unknown as Store[];
      const storeIds = stores.map((s) => s.id);
      const entries = await fetchAll<Entry>((from, to) =>
        supabase
          .from("step_entries")
          .select("*")
          .in("store_id", storeIds)
          .order("entry_date", { ascending: false })
          .range(from, to),
      );

      return buildMarketData(
        marketRes.data as unknown as MarketData["market"],
        stores,
        (profilesRes.data ?? []) as unknown as Profile[],
        entries,
        (challengesRes.data ?? []) as unknown as Challenge[],
        (annRes.data ?? []) as unknown as Announcement[],
      );
    },
  });
}
