import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ code: string }> };

export default async function TripReportPage({ params }: Params) {
  const { code } = await params;
  const admin = createAdminClient();

  // Look up the trip by its share code
  const { data: trip } = await admin
    .from("trips")
    .select("id, name, currency, created_at")
    .eq("code", code)
    .maybeSingle();

  if (!trip) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          color: "var(--foreground)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔍</p>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Trip not found
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            The link may be invalid or the trip may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  // Members
  const { data: membersData } = await admin
    .from("trip_members")
    .select("id, name")
    .eq("trip_id", trip.id)
    .order("joined_at", { ascending: true });
  const members = membersData ?? [];

  // Expenses (most recent first for display)
  const { data: expensesData } = await admin
    .from("expenses")
    .select(
      "id, title, description, amount, amount_cents, category, date, paid_by_member_id"
    )
    .eq("trip_id", trip.id)
    .order("date", { ascending: false });
  const expenses = expensesData ?? [];

  // Expense splits for balance calculation
  const expenseIds = expenses.map((e) => e.id);
  let splits: { expense_id: string; member_id: string; amount: number }[] = [];
  if (expenseIds.length > 0) {
    const { data: splitsData } = await admin
      .from("expense_splits")
      .select("expense_id, member_id, amount")
      .in("expense_id", expenseIds);
    splits = (splitsData ?? []).map((s) => ({
      expense_id: s.expense_id,
      member_id: s.member_id,
      amount: Number(s.amount),
    }));
  }

  // Normalize helpers
  const normalizeAmt = (e: {
    amount: number | string | null | undefined;
    amount_cents: number | null | undefined;
  }): number => {
    if (e.amount != null) return Number(e.amount);
    if (e.amount_cents) return e.amount_cents / 100;
    return 0;
  };

  const normalizeTitle = (e: {
    title: string | null | undefined;
    description: string | null | undefined;
  }): string => e.title ?? e.description ?? "Expense";

  // Calculate per-member paid and owed
  const memberBalanceMap = new Map(
    members.map((m) => [m.id, { name: m.name, paid: 0, owed: 0 }])
  );

  for (const e of expenses) {
    if (e.paid_by_member_id && memberBalanceMap.has(e.paid_by_member_id)) {
      memberBalanceMap.get(e.paid_by_member_id)!.paid += normalizeAmt(e);
    }
  }
  for (const s of splits) {
    if (memberBalanceMap.has(s.member_id)) {
      memberBalanceMap.get(s.member_id)!.owed += s.amount;
    }
  }

  const balances = [...memberBalanceMap.values()].map((m) => ({
    name: m.name,
    paid: m.paid,
    owed: m.owed,
    balance: m.paid - m.owed,
  }));

  const totalSpent = expenses.reduce((sum, e) => sum + normalizeAmt(e), 0);

  const top5 = expenses.slice(0, 5).map((e) => ({
    title: normalizeTitle(e),
    amount: normalizeAmt(e),
    paidByName:
      e.paid_by_member_id
        ? (memberBalanceMap.get(e.paid_by_member_id)?.name ?? "Unknown")
        : "Unknown",
  }));

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const tripDate = new Date(trip.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            marginBottom: "2rem",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                📊 {trip.name} — Trip Report
              </h1>
              <p
                style={{
                  margin: "0.4rem 0 0",
                  color: "var(--muted)",
                  fontSize: "0.875rem",
                }}
              >
                Created {tripDate} · {trip.currency}
              </p>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "9999px",
                padding: "0.25rem 0.75rem",
                whiteSpace: "nowrap",
                alignSelf: "flex-start",
              }}
            >
              Powered by SplitWiz
            </span>
          </div>
        </div>

        {/* Summary cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <SummaryCard
            label="Currency"
            value={trip.currency}
          />
          <SummaryCard
            label="Total Spent"
            value={`${trip.currency} ${fmt(totalSpent)}`}
          />
          <SummaryCard
            label="Expenses"
            value={String(expenses.length)}
          />
          <SummaryCard
            label="Members"
            value={String(members.length)}
          />
        </div>

        {/* Member balances table */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              margin: "0 0 1rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted)",
            }}
          >
            Member Balances
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr>
                  {["Name", "Paid", "Owed", "Balance"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === "Name" ? "left" : "right",
                        padding: "0.5rem 0.75rem",
                        color: "var(--muted)",
                        fontWeight: 500,
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.name}>
                    <td
                      style={{
                        padding: "0.625rem 0.75rem",
                        fontWeight: 500,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {b.name}
                    </td>
                    <td
                      style={{
                        padding: "0.625rem 0.75rem",
                        textAlign: "right",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {fmt(b.paid)}
                    </td>
                    <td
                      style={{
                        padding: "0.625rem 0.75rem",
                        textAlign: "right",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {fmt(b.owed)}
                    </td>
                    <td
                      style={{
                        padding: "0.625rem 0.75rem",
                        textAlign: "right",
                        fontWeight: 600,
                        borderBottom: "1px solid var(--border)",
                        color:
                          b.balance > 0.005
                            ? "var(--positive)"
                            : b.balance < -0.005
                            ? "var(--negative)"
                            : "var(--muted)",
                      }}
                    >
                      {b.balance >= 0 ? "+" : ""}
                      {fmt(b.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            style={{
              margin: "0.75rem 0 0",
              fontSize: "0.75rem",
              color: "var(--muted)",
            }}
          >
            Positive balance = owed money back · Negative = owes money
          </p>
        </section>

        {/* Top 5 expenses */}
        {top5.length > 0 && (
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                margin: "0 0 1rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
              }}
            >
              Top Expenses
            </h2>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {top5.map((e, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0",
                    borderBottom:
                      i < top5.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: "1.5rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                      background: "var(--background)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--muted)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      Paid by {e.paidByName}
                    </p>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {trip.currency} {fmt(e.amount)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--muted)",
            marginTop: "2rem",
          }}
        >
          View full report at{" "}
          <span style={{ color: "var(--accent)" }}>splitwiz.app</span>
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.875rem",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <span
        style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
