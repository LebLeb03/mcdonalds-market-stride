import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { MapPin, ImagePlus } from "lucide-react";
import { fmt, useMarketData, useProfile } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Card, Loading, Pills, ProgressBar, RankMove, SectionTitle } from "@/components/kit";

export const Route = createFileRoute("/restaurants")({
  head: () => ({
    meta: [
      { title: "Restaurant directory — McSteps Market Challenge" },
      {
        name: "description",
        content:
          "Browse every restaurant in the market, compare team steps and participation, and open any restaurant team page.",
      },
      { property: "og:title", content: "Restaurant directory — McSteps" },
      { property: "og:description", content: "Every restaurant team in the market, ranked." },
    ],
  }),
  component: RestaurantsPage,
});

function RestaurantsPage() {
  const navigate = useNavigate();
  const { data: profile, user, sessionLoading } = useProfile();
  const { data: market, isLoading } = useMarketData(profile?.market_id);
  const [sort, setSort] = useState<"rank" | "name" | "participation">("rank");

  useEffect(() => {
    if (!sessionLoading && !user) navigate({ to: "/auth", replace: true });
  }, [sessionLoading, user, navigate]);

  if (isLoading || !market) {
    return (
      <AppShell title="Restaurants">
        <Loading />
      </AppShell>
    );
  }

  const stores = [...market.storeStats].sort((a, b) =>
    sort === "name"
      ? a.store.store_name.localeCompare(b.store.store_name)
      : sort === "participation"
        ? b.participation - a.participation
        : a.rank - b.rank,
  );

  return (
    <AppShell
      title="Restaurant directory"
      subtitle={`${market.stores.length} restaurants in ${market.market.market_name}`}
      action={
        <Link
          to="/market"
          className="inline-flex h-10 items-center rounded-2xl bg-accent px-3 text-sm font-black text-accent-foreground"
        >
          Market
        </Link>
      }
    >
      <Card>
        <Pills
          value={sort}
          onChange={setSort}
          options={[
            { value: "rank", label: "By rank" },
            { value: "participation", label: "By participation" },
            { value: "name", label: "A–Z" },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stores.map((s) => (
          <Card key={s.store.id}>
            <div className="step-track mb-3 h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{s.store.store_name}</p>
                <p className="inline-flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> #{s.store.store_number} · {s.store.city},{" "}
                  {s.store.province}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black">#{s.rank}</p>
                <RankMove change={s.rankChange} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted p-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Steps</p>
                <p className="text-sm font-black tabular-nums">{fmt(s.total)}</p>
              </div>
              <div className="rounded-xl bg-muted p-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg/active</p>
                <p className="text-sm font-black tabular-nums">{fmt(s.avgPerActive)}</p>
              </div>
              <div className="rounded-xl bg-muted p-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Active</p>
                <p className="text-sm font-black tabular-nums">
                  {s.active}/{s.eligible}
                </p>
              </div>
            </div>

            <ProgressBar progress={s.goalProgress} className="mt-3" />

            <Link
              to="/restaurants/$storeId"
              params={{ storeId: s.store.id }}
              className="mt-3 block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-black text-primary-foreground"
            >
              View Restaurant
            </Link>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle title="Brand assets" />
        <p className="text-xs text-muted-foreground">
          Placeholder imagery is used until approved assets are supplied: Upload Approved Market
          Logo · Upload Approved Restaurant Image · Upload Approved Brand Font · Upload Approved
          Crew Photo.
        </p>
      </Card>
    </AppShell>
  );
}
