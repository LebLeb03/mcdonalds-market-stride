import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fmt } from "@/lib/data";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">

      <h2 className="truncate text-base font-black uppercase tracking-wide">{title}</h2>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "primary";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accent text-accent-foreground"
      : tone === "primary"
        ? "bg-primary text-primary-foreground"
        : "bg-card text-card-foreground";
  return (
    <div className={`surface-card p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums sm:text-2xl">
        {typeof value === "number" ? fmt(value) : value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] opacity-70">{hint}</p> : null}
    </div>
  );
}

export function ProgressRing({
  progress,
  label,
  sublabel,
  size = 148,
}: {
  progress: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={12}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          className="fill-none stroke-primary transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-black tabular-nums">{label}</p>
          {sublabel ? <p className="text-[11px] text-muted-foreground">{sublabel}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="gold-gradient h-full rounded-full transition-all duration-700"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  );
}

export function RankMove({ change }: { change: number }) {
  if (!change)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  const up = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-success" : "text-primary"}`}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(change)}
    </span>
  );
}

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return url ? (
    <img
      src={url}
      alt={name}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-primary font-black text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StepsChart({ data }: { data: { date: string; steps: number }[] }) {
  const shaped = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
  }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={shaped} margin={{ left: -18, right: 6, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="stepFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={44}
          />
          <Tooltip
            formatter={(v: number) => [fmt(v), "Steps"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
            }}
          />
          <Area
            type="monotone"
            dataKey="steps"
            stroke="var(--color-primary)"
            strokeWidth={3}
            fill="url(#stepFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card className="text-center">
      <p className="text-base font-black">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

export function Loading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="surface-card h-24 animate-pulse bg-muted" />
      ))}
    </div>
  );
}
