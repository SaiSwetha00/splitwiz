"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Analytics2Response = {
  currency: string;
  totalSpent: number;
  expenseCount: number;
  avgPerDay: number;
  biggestExpense: { amount: number; title: string } | null;
  categories: { name: string; amount: number }[];
  expenses: {
    date: string;
    title: string;
    amount: number;
    category: string | null;
    tripName: string;
    paidByName: string;
    note: string | null;
  }[];
};

type TripDetail = {
  trip: {
    id: string;
    name: string;
    currency: string;
    code: string;
    created_at: string;
  };
  members: { id: string; name: string; paid: number; owed: number }[];
  debts: { from: string; to: string; amount: number }[];
  expenseCount: number;
  totalSpent: number;
  categories: { name: string; amount: number }[];
};

type TripOption = {
  id: string;
  name: string;
  code: string;
  currency: string;
};

// Raw shapes returned by the API, kept narrow to avoid `any`
type RawTripMember = { id: string; name: string };
type RawExpense = {
  id: string;
  amount: number | null;
  paid_by_member_id: string | null;
  category: string | null;
  title: string | null;
  date: string;
  splits: { member_id: string; amount: number }[];
};
type RawBalance = { member_id: string; net_balance: number };
type RawDebt = {
  from_member_id: string;
  to_member_id: string;
  amount: number;
  from_member?: { name: string } | null;
  to_member?: { name: string } | null;
};
type RawTripApiResponse = {
  trip: {
    id: string;
    name: string;
    currency: string;
    code: string;
    created_at: string;
    members: RawTripMember[];
  };
  expenses: RawExpense[];
  balances: RawBalance[];
  debts: RawDebt[];
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [monthlyData, setMonthlyData] = useState<Analytics2Response | null>(null);
  const [tripData, setTripData] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch trip list on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/trips2");
        if (!res.ok) throw new Error("Failed to load trips");
        const json = (await res.json()) as { trips: TripOption[] };
        setTrips(json.trips ?? []);
      } catch {
        // non-fatal; trip selector just stays empty
      }
    }
    void load();
  }, []);

  // Fetch monthly analytics when selectedMonth changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [y, m] = selectedMonth.split("-").map(Number);
        const from = `${y}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const res = await fetch(`/api/analytics2?from=${from}&to=${to}`);
        if (!res.ok) throw new Error("Failed to load monthly data");
        const json = (await res.json()) as Analytics2Response;
        setMonthlyData(json);
      } catch {
        setError("Failed to load monthly report. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [selectedMonth]);

  // Fetch trip detail when selectedTripId changes
  useEffect(() => {
    if (!selectedTripId) {
      const frame = requestAnimationFrame(() => setTripData(null));
      return () => cancelAnimationFrame(frame);
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips2/${selectedTripId}`);
        if (!res.ok) throw new Error("Failed to load trip");
        const raw = (await res.json()) as RawTripApiResponse;
        setTripData(mapTripDetailResponse(raw));
      } catch {
        setError("Failed to load trip report. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [selectedTripId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  // ── Export handlers ──────────────────────────────────────────────────────────

  async function handleExportPDF() {
    const { default: JsPDF } = await import("jspdf");

    const doc = new JsPDF();
    const currency = monthlyData?.currency ?? tripData?.trip.currency ?? "";
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SplitWiz Report", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const subtitle = tripData
      ? `Trip: ${tripData.trip.name}`
      : `Month: ${formatMonthLabel(selectedMonth)}`;
    doc.text(subtitle, pageWidth / 2, y, { align: "center" });
    y += 14;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Summary stats
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 15, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    const total = monthlyData?.totalSpent ?? tripData?.totalSpent ?? 0;
    const count = monthlyData?.expenseCount ?? tripData?.expenseCount ?? 0;
    const avg = monthlyData?.avgPerDay ?? 0;

    doc.text(`Total Spent: ${currency} ${fmt(total)}`, 15, y);
    y += 6;
    doc.text(`Expense Count: ${count}`, 15, y);
    y += 6;
    if (monthlyData) {
      doc.text(`Avg per Day: ${currency} ${fmt(avg)}`, 15, y);
      y += 6;
    }
    if (monthlyData?.biggestExpense) {
      doc.text(
        `Biggest Expense: ${currency} ${fmt(monthlyData.biggestExpense.amount)} — ${monthlyData.biggestExpense.title}`,
        15,
        y
      );
      y += 6;
    }
    y += 6;

    // Expense list (first 50)
    const expList = monthlyData?.expenses ?? [];
    if (expList.length > 0) {
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Expenses", 15, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const shown = expList.slice(0, 50);
      for (const e of shown) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const line = `${e.date}  ${e.title}  ${currency} ${fmt(e.amount)}`;
        doc.text(line, 15, y);
        y += 5.5;
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(
        `Generated by SplitWiz  ·  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
      doc.setTextColor(0);
    }

    doc.save(`splitwiz-report-${selectedMonth}.pdf`);
  }

  function handleExportCSV() {
    if (!monthlyData) return;
    const rows: string[][] = [
      ["Date", "Description", "Category", "Amount", "Trip", "Paid By", "Note"],
    ];
    for (const e of monthlyData.expenses) {
      rows.push([
        e.date,
        csvEscape(e.title),
        csvEscape(e.category ?? ""),
        String(e.amount),
        csvEscape(e.tripName),
        csvEscape(e.paidByName),
        csvEscape(e.note ?? ""),
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `splitwiz-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShareTrip() {
    if (!tripData) {
      alert("Please select a trip first");
      return;
    }
    const shareUrl = `${window.location.origin}/report/${tripData.trip.code}`;
    await navigator.clipboard.writeText(shareUrl);
    showToast("Link copied!");
  }

  function handleWhatsApp() {
    if (!tripData) return;
    const { trip, debts, totalSpent } = tripData;
    const lines: string[] = [
      `SplitWiz Trip Summary — ${trip.name} 🧳`,
      `Total: ${trip.currency} ${fmt(totalSpent)}`,
      "",
    ];
    for (const d of debts) {
      lines.push(`${d.from} pays ${d.to}: ${trip.currency} ${fmt(d.amount)}`);
    }
    lines.push("", "Split fairly with SplitWiz ✨");
    const message = lines.join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Generate and export financial reports
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {error}
        </div>
      )}

      {/* ── Section 1: Monthly Report ── */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Monthly Report
        </h2>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="month-picker">
            Select month
          </label>
          <input
            id="month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {loading && !tripData ? (
          <SkeletonBlock />
        ) : monthlyData ? (
          <div>
            <h3 className="mb-4 text-base font-semibold">
              {monthLabel}
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label="Total Spent"
                value={`${monthlyData.currency} ${fmt(monthlyData.totalSpent)}`}
              />
              <MiniStat
                label="Expenses"
                value={String(monthlyData.expenseCount)}
              />
              <MiniStat
                label="Avg / Day"
                value={`${monthlyData.currency} ${fmt(monthlyData.avgPerDay)}`}
              />
              <MiniStat
                label="Biggest"
                value={
                  monthlyData.biggestExpense
                    ? `${monthlyData.currency} ${fmt(monthlyData.biggestExpense.amount)}`
                    : "—"
                }
              />
            </div>
            {monthlyData.biggestExpense && (
              <p className="mb-4 text-xs text-muted">
                Biggest expense:{" "}
                <span className="font-medium text-foreground">
                  {monthlyData.biggestExpense.title}
                </span>
              </p>
            )}
            {monthlyData.categories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Top Categories
                </p>
                <ul className="flex flex-col gap-2">
                  {monthlyData.categories.slice(0, 3).map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="ml-3 shrink-0 text-xs text-muted">
                        {monthlyData.currency} {fmt(c.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {monthlyData.expenseCount === 0 && (
              <p className="text-sm text-muted">
                No expenses recorded for {monthLabel}.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Select a month to see the report.</p>
        )}
      </section>

      {/* ── Section 2: Trip Report ── */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Trip Report
        </h2>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="trip-select">
            Select trip
          </label>
          <select
            id="trip-select"
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">— Choose a trip —</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.currency})
              </option>
            ))}
          </select>
        </div>

        {loading && selectedTripId ? (
          <SkeletonBlock />
        ) : tripData ? (
          <div>
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <h3 className="text-base font-semibold">{tripData.trip.name}</h3>
              <span className="text-xs text-muted">
                {tripData.trip.currency} ·{" "}
                {new Date(tripData.trip.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat
                label="Total Spent"
                value={`${tripData.trip.currency} ${fmt(tripData.totalSpent)}`}
              />
              <MiniStat
                label="Expenses"
                value={String(tripData.expenseCount)}
              />
              <MiniStat
                label="Members"
                value={String(tripData.members.length)}
              />
            </div>

            {/* Member balances */}
            {tripData.members.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {["Name", "Paid", "Owed", "Balance"].map((h) => (
                        <th
                          key={h}
                          className={`border-b border-border pb-2 text-xs font-medium text-muted ${
                            h === "Name" ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tripData.members.map((m) => {
                      const balance = m.paid - m.owed;
                      return (
                        <tr key={m.id}>
                          <td className="border-b border-border py-2 font-medium">
                            {m.name}
                          </td>
                          <td className="border-b border-border py-2 text-right">
                            {fmt(m.paid)}
                          </td>
                          <td className="border-b border-border py-2 text-right">
                            {fmt(m.owed)}
                          </td>
                          <td
                            className={`border-b border-border py-2 text-right font-semibold ${
                              balance > 0.005
                                ? "text-positive"
                                : balance < -0.005
                                ? "text-negative"
                                : "text-muted"
                            }`}
                          >
                            {balance >= 0 ? "+" : ""}
                            {fmt(balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top 5 expenses */}
            {tripData.categories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  By Category
                </p>
                <ul className="flex flex-col gap-1.5">
                  {tripData.categories.slice(0, 5).map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="ml-3 shrink-0 text-xs text-muted">
                        {tripData.trip.currency} {fmt(c.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : selectedTripId ? null : (
          <p className="text-sm text-muted">Select a trip to see the report.</p>
        )}
      </section>

      {/* ── Section 3: Export Options ── */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Export Options
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ExportButton
            onClick={handleExportPDF}
            disabled={!monthlyData}
            label="Export PDF"
            icon="📄"
            description="Download report as PDF"
          />
          <ExportButton
            onClick={handleExportCSV}
            disabled={!monthlyData || monthlyData.expenses.length === 0}
            label="Export CSV"
            icon="📊"
            description="Download expenses as spreadsheet"
          />
          <ExportButton
            onClick={handleShareTrip}
            disabled={!tripData}
            label="Share Trip Report"
            icon="📱"
            description="Copy shareable link to clipboard"
          />
          <ExportButton
            onClick={handleWhatsApp}
            disabled={!tripData}
            label="WhatsApp Summary"
            icon="💬"
            description="Send trip summary via WhatsApp"
          />
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-background p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="truncate text-sm font-semibold">{value}</span>
    </div>
  );
}

function ExportButton({
  onClick,
  disabled,
  label,
  icon,
  description,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  icon: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-accent hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="text-xl leading-none">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
    </button>
  );
}

function SkeletonBlock() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-8 w-full animate-pulse rounded-lg bg-border"
          style={{ width: `${70 + i * 10}%` }}
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function mapTripDetailResponse(raw: RawTripApiResponse): TripDetail {
  const memberMap = new Map(
    (raw.trip.members ?? []).map((m) => [
      m.id,
      { id: m.id, name: m.name, paid: 0, owed: 0 },
    ])
  );

  for (const e of raw.expenses ?? []) {
    const amt = e.amount != null ? Number(e.amount) : 0;
    if (e.paid_by_member_id && memberMap.has(e.paid_by_member_id)) {
      memberMap.get(e.paid_by_member_id)!.paid += amt;
    }
    for (const s of e.splits ?? []) {
      if (memberMap.has(s.member_id)) {
        memberMap.get(s.member_id)!.owed += Number(s.amount);
      }
    }
  }

  const members = [...memberMap.values()];

  const debts: TripDetail["debts"] = (raw.debts ?? []).map((d) => ({
    from: d.from_member?.name ?? d.from_member_id,
    to: d.to_member?.name ?? d.to_member_id,
    amount: Number(d.amount),
  }));

  // Category breakdown from expenses
  const catMap = new Map<string, number>();
  for (const e of raw.expenses ?? []) {
    const cat = e.category ?? "Uncategorized";
    catMap.set(cat, (catMap.get(cat) ?? 0) + (e.amount != null ? Number(e.amount) : 0));
  }
  const categories = [...catMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpent = (raw.expenses ?? []).reduce(
    (sum, e) => sum + (e.amount != null ? Number(e.amount) : 0),
    0
  );

  return {
    trip: {
      id: raw.trip.id,
      name: raw.trip.name,
      currency: raw.trip.currency,
      code: raw.trip.code,
      created_at: raw.trip.created_at,
    },
    members,
    debts,
    expenseCount: (raw.expenses ?? []).length,
    totalSpent,
    categories,
  };
}
