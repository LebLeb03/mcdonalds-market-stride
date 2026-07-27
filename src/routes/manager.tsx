import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ShieldAlert, Users, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fmt,
  isManagerRole,
  ROLE_LABEL,
  useMarketData,
  useProfile,
  type Entry,
  type Profile,
} from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Avatar, Card, EmptyState, Loading, Pills, SectionTitle, Stat } from "@/components/kit";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Manager tools — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Approve or reject flagged step entries, review your team roster and share your restaurant join code.",
      },
      { property: "og:title", content: "Manager tools — McSteps" },
      {
        property: "og:description",
        content: "Review flagged step entries and manage your restaurant team.",
      },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, user, sessionLoading } = useProfile();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [tab, setTab] = useState<"pending" | "team" | "reviewed">("pending");
  const [note, setNote] = useState<Record<string, string>>({});

  const inviteCodeQuery = useQuery({
    queryKey: ["store-invite-code", profile?.store_id],
    enabled: !!profile?.store_id,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc("get_store_invitation_code", {
        _store_id: profile!.store_id!,
      });
      if (error) throw error;
      return data ?? null;
    },
  });

  useEffect(() => {
    if (!sessionLoading && !user) navigate({ to: "/auth", replace: true });
  }, [sessionLoading, user, navigate]);

  const isMarketAdmin = profile?.role === "market_admin";
  const scopeStoreIds = useMemo(() => {
    if (!market) return [] as string[];
    if (isMarketAdmin) return market.stores.map((s) => s.id);
    return profile?.store_id ? [profile.store_id] : [];
  }, [market, isMarketAdmin, profile?.store_id]);

  const entriesQuery = useQuery({
    queryKey: ["review-entries", scopeStoreIds.join(",")],
    enabled: scopeStoreIds.length > 0,
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("step_entries")
        .select("*")
        .in("store_id", scopeStoreIds)
        .neq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  const review = useMutation({
    mutationFn: async (input: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase
        .from("step_entries")
        .update({
          approval_status: input.approve ? "approved" : "rejected",
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
          rejection_reason: input.approve ? null : (input.reason ?? "Not verified by manager"),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-entries"] });
      qc.invalidateQueries({ queryKey: ["market-data"] });
    },
  });

  if (isLoading || !market || !profile) {
    return (
      <AppShell title="Manager tools">
        <Loading />
      </AppShell>
    );
  }

  if (!isManagerRole(profile.role)) {
    return (
      <AppShell title="Manager tools">
        <EmptyState
          title="Managers only"
          message="This area is available to managers, general managers and market administrators."
        />
      </AppShell>
    );
  }

  const entries = entriesQuery.data ?? [];
  const pending = entries.filter(
    (e) => e.approval_status === "pending" && e.user_id !== user?.id,
  );
  const ownPending = entries.filter(
    (e) => e.approval_status === "pending" && e.user_id === user?.id,
  );
  const rejected = entries.filter((e) => e.approval_status === "rejected");
  const teamProfiles: Profile[] = market.profiles.filter((p) =>
    scopeStoreIds.includes(p.store_id ?? ""),
  );
  const myStore = profile.store_id ? market.storeStatsById[profile.store_id] : null;

  const nameOf = (uid: string) => market.memberById[uid]?.profile.full_name ?? "Team member";

  const EntryRow = ({ e, actionable }: { e: Entry; actionable: boolean }) => (
    <li className="rounded-2xl bg-muted p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{nameOf(e.user_id)}</p>
          <p className="text-[11px] text-muted-foreground">
            {e.entry_date} · {e.entry_method.replace(/_/g, " ")}
            {e.proof_url ? " · proof attached" : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground tabular-nums">
          {fmt(e.step_count)}
        </span>
      </div>
      {e.approval_status === "rejected" ? (
        <p className="mt-2 text-xs font-semibold text-destructive">
          Rejected: {e.rejection_reason}
        </p>
      ) : null}
      {actionable ? (
        <div className="mt-3 space-y-2">
          <input
            value={note[e.id] ?? ""}
            onChange={(ev) => setNote((n) => ({ ...n, [e.id]: ev.target.value }))}
            placeholder="Optional note for a rejection"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => review.mutate({ id: e.id, approve: true })}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-success px-3 py-2.5 text-sm font-black text-success-foreground"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => review.mutate({ id: e.id, approve: false, reason: note[e.id] })}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive px-3 py-2.5 text-sm font-black text-destructive-foreground"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );

  return (
    <AppShell
      title="Manager tools"
      subtitle={
        isMarketAdmin
          ? `Reviewing all ${market.stores.length} restaurants`
          : (myStore?.store.store_name ?? "Your restaurant")
      }
    >
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Awaiting review" value={pending.length} tone="primary" />
          <Stat label="Team members" value={teamProfiles.length} tone="accent" />
          <Stat label="Team steps" value={myStore?.total ?? market.totals.steps} />
          <Stat
            label="Participation"
            value={`${Math.round(myStore?.participation ?? market.totals.participation)}%`}
          />
        </div>
        {myStore && inviteCodeQuery.data ? (
          <button
            onClick={() => navigator.clipboard?.writeText(inviteCodeQuery.data!)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-black"
          >
            <Copy className="h-4 w-4" /> Join code {inviteCodeQuery.data}
          </button>
        ) : null}
      </Card>

      <Card>
        <Pills
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: `Pending (${pending.length})` },
            { value: "reviewed", label: "Rejected" },
            { value: "team", label: "Team" },
          ]}
        />
      </Card>

      {tab === "pending" ? (
        <Card>
          <SectionTitle title="Entries flagged for review" />
          <p className="mb-3 inline-flex items-start gap-1.5 rounded-xl bg-accent/30 p-2.5 text-xs font-semibold text-accent-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Entries above 60,000 steps are held for manager approval. You cannot review your own
            entries.
          </p>
          {pending.length ? (
            <ul className="space-y-2">
              {pending.map((e) => (
                <EntryRow key={e.id} e={e} actionable />
              ))}
            </ul>
          ) : (
            <EmptyState title="All clear" message="No entries are waiting for your review." />
          )}
          {ownPending.length ? (
            <>
              <SectionTitle title="Your own entries (reviewed by another manager)" />
              <ul className="space-y-2">
                {ownPending.map((e) => (
                  <EntryRow key={e.id} e={e} actionable={false} />
                ))}
              </ul>
            </>
          ) : null}
        </Card>
      ) : null}

      {tab === "reviewed" ? (
        <Card>
          <SectionTitle title="Recently rejected" />
          {rejected.length ? (
            <ul className="space-y-2">
              {rejected.map((e) => (
                <EntryRow key={e.id} e={e} actionable={false} />
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing rejected" message="No rejected entries in your scope." />
          )}
        </Card>
      ) : null}

      {tab === "team" ? (
        <Card>
          <SectionTitle
            title="Team roster"
            right={
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {teamProfiles.length}
              </span>
            }
          />
          <ul className="divide-y divide-border">
            {teamProfiles
              .map((p) => market.memberById[p.user_id])
              .filter(Boolean)
              .sort((a, b) => b.total - a.total)
              .map((m) => (
                <li key={m.profile.user_id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.profile.full_name} url={m.profile.avatar_url} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{m.profile.full_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {ROLE_LABEL[m.profile.role]} · {m.activeDays} active days
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums">{fmt(m.total)}</span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </AppShell>
  );
}
