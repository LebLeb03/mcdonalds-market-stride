import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode, Store as StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, ROLE_LABEL, type Role } from "@/lib/data";
import { Card } from "@/components/kit";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join your restaurant — McSteps Market Challenge" },
      {
        name: "description",
        content: "Enter your restaurant's store code to join the market step challenge team.",
      },
      { property: "og:title", content: "Join your restaurant — McSteps" },
      { property: "og:description", content: "Use your store code to join your restaurant team." },
    ],
  }),
  component: JoinPage,
});

const ROLES: Role[] = ["crew", "manager", "general_manager", "market_admin"];

function JoinPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, user, sessionLoading } = useProfile();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("crew");
  const [jobTitle, setJobTitle] = useState("Crew Member");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !user) navigate({ to: "/auth", replace: true });
  }, [sessionLoading, user, navigate]);

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile?.full_name]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("join_store_with_code", {
        _code: code.trim().toUpperCase(),
        _full_name: name || null,
        _job_title: jobTitle || null,
      });
      if (error) throw error;
      const store = Array.isArray(data) ? data[0] : null;
      if (!store) {
        toast.error("We couldn't find a restaurant with that code.");
        return;
      }
      await qc.invalidateQueries();
      toast.success(`Welcome to ${store.store_name}!`);
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join restaurant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-primary text-primary-foreground">
            <StoreIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl">Join your restaurant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask your manager for the store code, or scan the store QR poster.
          </p>
        </div>

        <Card>
          <form onSubmit={join} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Store code
              </span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RIVER42"
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-center text-lg font-black tracking-[0.25em] outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Your name
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Role
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Position
                </span>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Managers compete too — your steps always count toward your personal total, your
              restaurant total and the market rankings.
            </p>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Joining…" : "Join restaurant"}
            </button>
          </form>
        </Card>

        <Card className="flex items-center gap-3">
          <QrCode className="h-9 w-9 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-bold">QR code onboarding</p>
            <p className="text-xs text-muted-foreground">
              Scanning a store QR poster opens this page with the code pre-filled.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
