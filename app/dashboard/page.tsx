import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currencySymbol } from "@/lib/money";
import { InsightsSection } from "@/components/InsightsSection";
import { GlobalSearch } from "@/components/GlobalSearch";
import { DashboardClient } from "@/components/DashboardClient";

export const metadata = { title: "Dashboard — Splitwiz" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "there";

  const { data: trips } = await supabase
    .from("trips")
    .select("id, code, name, currency, created_at, members(count), expenses(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const tripList = trips ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Real-time smart dashboard (greeting, stat cards, alerts, quick actions, charts) */}
      <DashboardClient userId={user.id} displayName={displayName} />

      {/* Search */}
      <div className="mb-6">
        <GlobalSearch />
      </div>

      {/* AI Insights */}
      <div id="insights" className="mb-8">
        <InsightsSection />
      </div>

      {/* Trips */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Your trips</h3>
        {tripList.length > 0 && (
          <span className="text-xs text-muted">{tripList.length} total</span>
        )}
      </div>

      {tripList.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tripList.map((trip) => {
            const memberCount =
              (trip.members as unknown as { count: number }[])[0]?.count ?? 0;
            const expenseCount =
              (trip.expenses as unknown as { count: number }[])[0]?.count ?? 0;

            return (
              <Link
                key={trip.id}
                href={`/trip/${trip.code}`}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:border-accent hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold leading-tight group-hover:text-accent transition-colors">
                    {trip.name}
                  </span>
                  <span className="shrink-0 rounded-md bg-background px-2 py-0.5 font-mono text-xs text-muted">
                    {trip.code}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{memberCount} {memberCount === 1 ? "person" : "people"}</span>
                  <span className="text-border">·</span>
                  <span>{expenseCount} {expenseCount === 1 ? "expense" : "expenses"}</span>
                  <span className="text-border">·</span>
                  <span>{currencySymbol(trip.currency)} {trip.currency}</span>
                </div>
                <p className="text-xs text-muted">
                  {new Date(trip.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">No trips yet</p>
            <p className="mt-1 text-sm text-muted">
              Create your first trip and start splitting expenses with friends.
            </p>
          </div>
          <Link
            href="/dashboard/trips"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Create a trip
          </Link>
        </div>
      )}
    </div>
  );
}
