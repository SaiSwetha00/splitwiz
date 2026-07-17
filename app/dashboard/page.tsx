import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currencySymbol, fromCents } from "@/lib/money";
import { InsightsSection } from "@/components/InsightsSection";
import { GlobalSearch } from "@/components/GlobalSearch";

export const metadata = { title: "Dashboard — Splitwiz" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "there";

  const [tripsResult, budgetsResult, goalsResult, subsResult] = await Promise.all([
    supabase
      .from("trips")
      .select("id, code, name, currency, created_at, members(count), expenses(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("budgets")
      .select("id, amount_cents")
      .eq("user_id", user.id),
    supabase
      .from("savings_goals")
      .select("id, target_cents, current_cents")
      .eq("user_id", user.id)
      .eq("completed", false),
    supabase
      .from("subscriptions")
      .select("id, amount_cents, billing_cycle, next_billing_date")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("next_billing_date", { ascending: true, nullsFirst: false }),
  ]);

  const trips = tripsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const subs = subsResult.data ?? [];

  const monthlySubCost = subs.reduce((sum, s) => {
    if (s.billing_cycle === "monthly") return sum + s.amount_cents;
    if (s.billing_cycle === "yearly") return sum + Math.round(s.amount_cents / 12);
    if (s.billing_cycle === "weekly") return sum + s.amount_cents * 4;
    return sum;
  }, 0);

  const nextBill = subs.find((s) => s.next_billing_date);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_cents, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.current_cents, 0);
  const savingsPct =
    totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : null;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hi, {displayName} 👋</h1>
          <p className="mt-1 text-sm text-muted">Your financial overview</p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          + New trip
        </Link>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          href="/dashboard"
          label="Trips"
          value={String(trips.length)}
          sub={trips.length === 1 ? "1 trip" : `${trips.length} trips`}
        />
        <StatCard
          href="/dashboard/budgets"
          label="Budgets"
          value={String(budgets.length)}
          sub={budgets.length === 0 ? "None yet" : budgets.length === 1 ? "1 budget" : `${budgets.length} budgets`}
        />
        <StatCard
          href="/dashboard/savings"
          label="Savings"
          value={savingsPct !== null ? `${savingsPct}%` : goals.length > 0 ? "—" : "0"}
          sub={goals.length === 0 ? "No goals" : `${goals.length} active goal${goals.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          href="/dashboard/subscriptions"
          label="Monthly subs"
          value={subs.length > 0 ? `$${fromCents(monthlySubCost).toFixed(0)}/mo` : "—"}
          sub={
            nextBill?.next_billing_date
              ? `Next: ${new Date(nextBill.next_billing_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : subs.length === 0
              ? "None active"
              : `${subs.length} active`
          }
        />
      </div>

      <div className="mb-6">
        <GlobalSearch />
      </div>

      <InsightsSection />

      {/* Trips section */}
      <h2 className="mb-4 mt-10 font-semibold">Your trips</h2>

      {trips.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip) => {
            const memberCount =
              (trip.members as unknown as { count: number }[])[0]?.count ?? 0;
            const expenseCount =
              (trip.expenses as unknown as { count: number }[])[0]?.count ?? 0;

            return (
              <Link
                key={trip.id}
                href={`/trip/${trip.code}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold leading-tight">{trip.name}</span>
                  <span className="shrink-0 rounded-md bg-background px-2 py-0.5 font-mono text-xs text-muted">
                    {trip.code}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>
                    {currencySymbol(trip.currency)} {trip.currency}
                  </span>
                  <span>
                    {memberCount} {memberCount === 1 ? "person" : "people"}
                  </span>
                  <span>
                    {expenseCount} {expenseCount === 1 ? "expense" : "expenses"}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Created{" "}
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
          <p className="text-3xl">✈️</p>
          <p className="font-medium">No trips yet</p>
          <p className="text-sm text-muted">
            Create your first trip and start splitting expenses with friends.
          </p>
          <Link
            href="/"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Create a trip
          </Link>
        </div>
      )}
    </main>
  );
}

function StatCard({
  href,
  label,
  value,
  sub,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 transition hover:border-accent"
    >
      <span className="text-xs text-muted">{label}</span>
      <span className="text-2xl font-bold leading-tight">{value}</span>
      <span className="text-xs text-muted">{sub}</span>
    </Link>
  );
}
