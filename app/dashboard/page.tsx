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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {greeting}, {displayName} 👋
          </h2>
          <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening with your trips.</p>
        </div>
        <Link
          href="/dashboard/trips/new"
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
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
          sub={trips.length === 0 ? "No trips yet" : trips.length === 1 ? "1 trip" : `${trips.length} trips`}
          color="#6366f1"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/budgets"
          label="Budgets"
          value={String(budgets.length)}
          sub={budgets.length === 0 ? "None yet" : `${budgets.length} active`}
          color="#8b5cf6"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/savings"
          label="Savings"
          value={savingsPct !== null ? `${savingsPct}%` : "—"}
          sub={goals.length === 0 ? "No goals yet" : `${goals.length} goal${goals.length !== 1 ? "s" : ""}`}
          color="#10b981"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/subscriptions"
          label="Monthly subs"
          value={subs.length > 0 ? `$${fromCents(monthlySubCost).toFixed(0)}` : "—"}
          sub={
            nextBill?.next_billing_date
              ? `Next: ${new Date(nextBill.next_billing_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : subs.length === 0
              ? "None active"
              : `${subs.length} active`
          }
          color="#f59e0b"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          }
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <GlobalSearch />
      </div>

      {/* AI Insights */}
      <div className="mb-8">
        <InsightsSection />
      </div>

      {/* Trips */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Your trips</h3>
        {trips.length > 0 && (
          <span className="text-xs text-muted">{trips.length} total</span>
        )}
      </div>

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
            href="/dashboard/trips/new"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Create a trip
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  sub,
  icon,
  color,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:border-accent hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </span>
      </div>
      <div>
        <span className="text-2xl font-bold leading-none tracking-tight">{value}</span>
        <p className="mt-1 text-xs text-muted">{sub}</p>
      </div>
    </Link>
  );
}
