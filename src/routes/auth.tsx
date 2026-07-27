import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/data";
import mark from "@/assets/mcd-mark.png.asset.json";
import wordmark from "@/assets/mcd-wordmark.png.asset.json";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Sign in to the market step challenge to log your steps, track your restaurant team and climb the leaderboards.",
      },
      { property: "og:title", content: "Sign in — McSteps Market Challenge" },
      {
        property: "og:description",
        content: "Restaurant crew and managers compete together in the market step challenge.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  function friendly(message: string) {
    const m = message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered"))
      return "That email already has an account — try signing in instead.";
    if (m.includes("invalid login")) return "Wrong email or password. Check both and try again.";
    if (m.includes("pwned") || m.includes("weak"))
      return "That password has shown up in a data breach. Pick a stronger one.";
    if (m.includes("at least")) return "Password must be at least 8 characters.";
    if (m.includes("not confirmed")) return "Confirm your email address, then sign in.";
    if (m.includes("rate limit") || m.includes("too many"))
      return "Too many attempts. Wait a minute and try again.";
    return message;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || cleanEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInError) {
            toast.success("Account created. Check your email to confirm, then sign in.");
            setMode("signin");
            return;
          }
        }
        toast.success("Account created. Welcome to the challenge!");
        navigate({ to: "/join", replace: true });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(friendly(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-arches flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-primary-foreground">
          <img
            src={mark.url}
            alt="McDonald's arches"
            className="mx-auto h-20 w-20 rounded-3xl shadow-lg"
          />
          <img
            src={wordmark.url}
            alt="McDonald's"
            className="mx-auto mt-4 h-8 w-auto"
          />
          <h1 className="mt-3 text-3xl">Market Step Challenge</h1>

          <p className="mt-2 text-sm text-primary-foreground/85">
            Crew and managers walking together for restaurant bragging rights.
          </p>
        </div>

        <form onSubmit={submit} className="surface-card space-y-4 p-6">
          <div className="flex rounded-full bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "signup" ? (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Full name
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Jordan Blake"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Work email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@restaurant.com"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            New here? After signing up you'll{" "}
            <Link to="/join" className="font-bold text-primary">
              join your restaurant
            </Link>{" "}
            with a store code.
          </p>
        </form>
      </div>
    </div>
  );
}
