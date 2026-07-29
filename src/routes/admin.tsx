import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMarketData, useAppGuard, type Role } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Avatar, Card, EmptyState, Loading, Pills, SectionTitle } from "@/components/kit";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Market admin — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Assign managers to restaurants, change team roles and share restaurant join codes across the market.",
      },
      { property: "og:title", content: "Market admin — McSteps" },
      {
        property: "og:description",
        content: "Assign managers to restaurants and manage restaurant join codes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const ROLES: Role[] = ["crew", "manager", "general_manager", "market_admin"];

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, user, sessionLoading } = useAppGuard();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [tab, setTab] = useState<"people" | "codes">("people");
  const [search, setSearch] = useState("");

  const isAdmin = profile?.role === "market_admin";

  const codeQueries = useQueries({
    queries: (market?.stores ?? []).map((s) => ({
      queryKey: ["store-invite-code", s.id],
      enabled: !!isAdmin,
      queryFn: async (): Promise<string | null> => {
        const { data, error } = await supabase.rpc("get_store_invitation_code", {
          _store_id: s.id,
        });
        if (error) throw error;
        return data ?? null;
      },
    })),
  });

  const setAccess = useMutation({
    mutationFn: async (input: { userId: string; role: Role; storeId: string | null }) => {
      const { error } = await supabase.rpc("admin_set_member_access", {
        _user_id: input.userId,
        _role: input.role,
        _store_id: input.storeId ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access updated");
      qc.invalidateQueries({ queryKey: ["market-data"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update access"),
  });

  const people = useMemo(() => {
    const list = market?.profiles ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (p) =>
            p.full_name.toLowerCase().includes(q) || (p.job_title ?? "").toLowerCase().includes(q),
        )
      : list;
    return [...filtered].sort((a, b) => a.full_name.localeCompare(b.full_name)).slice(0, 200);
  }, [market?.profiles, search]);

  if (isLoading || !market || !profile) {
    return (
      <AppShell title="Market admin">
        <Loading />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Market admin">
        <EmptyState
          title="Market administrators only"
          message="Ask your market administrator to grant you access from the admin console."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Market admin"
      subtitle={`${market.market.market_name} · ${market.profiles.length} people`}
    >
      <Pills
        options={[
          { value: "people", label: "People & access" },
          { value: "codes", label: "Restaurant codes" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {tab === "people" ? (
        <Card>
          <SectionTitle title="Team access" right={<Users className="h-4 w-4 opacity-60" />} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or position"
            className="mb-3 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <ul className="divide-y divide-border">
            {people.map((p) => (
              <li key={p.user_id} className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.full_name} url={p.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABEL[p.role]}
                      {p.store_id
                        ? ` · ${market.storeStatsById[p.store_id]?.store.store_name ?? "—"}`
                        : " · No restaurant"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    aria-label={`Role for ${p.full_name}`}
                    value={p.role}
                    disabled={setAccess.isPending}
                    onChange={(e) =>
                      setAccess.mutate({
                        userId: p.user_id,
                        role: e.target.value as Role,
                        storeId: p.store_id,
                      })
                    }
                    className="rounded-xl border border-input bg-background px-2 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Restaurant for ${p.full_name}`}
                    value={p.store_id ?? ""}
                    disabled={setAccess.isPending}
                    onChange={(e) =>
                      setAccess.mutate({
                        userId: p.user_id,
                        role: p.role,
                        storeId: e.target.value || null,
                      })
                    }
                    className="rounded-xl border border-input bg-background px-2 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">No restaurant</option>
                    {market.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        #{s.store_number} {s.store_name}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
          {people.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No people found.</p>
          ) : null}
        </Card>
      ) : (
        <Card>
          <SectionTitle
            title="Restaurant join codes"
            right={<KeyRound className="h-4 w-4 opacity-60" />}
          />
          <p className="mb-3 text-xs text-muted-foreground">
            Share a code with crew so they can join that restaurant. Managers are assigned here, not
            by code.
          </p>
          <ul className="divide-y divide-border">
            {market.stores.map((s, i) => {
              const code = codeQueries[i]?.data ?? null;
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{s.store_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      #{s.store_number} · {s.city ?? "—"}
                    </p>
                  </div>
                  <code className="rounded-lg bg-muted px-2 py-1 text-xs font-black tracking-widest">
                    {code ?? "…"}
                  </code>
                  <button
                    type="button"
                    aria-label={`Copy code for ${s.store_name}`}
                    disabled={!code}
                    onClick={() => {
                      if (!code) return;
                      void navigator.clipboard.writeText(code);
                      toast.success("Code copied");
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
