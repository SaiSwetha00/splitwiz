import { NextRequest, NextResponse } from "next/server";
import { loadTripState } from "@/lib/tripService";
import { fromCents, formatMoney } from "@/lib/money";

type TripState = NonNullable<Awaited<ReturnType<typeof loadTripState>>>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  const trip = await loadTripState(code);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  if (format === "html") {
    return new NextResponse(buildHtml(trip), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const csv = buildCsv(trip);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${trip.code}-expenses.csv"`,
    },
  });
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function escape(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(fields: (string | number | null | undefined)[]): string {
  return fields.map(escape).join(",");
}

function buildCsv(trip: TripState): string {
  const memberMap = new Map(trip.members.map((m) => [m.id, m.name]));
  const memberNames = trip.members.map((m) => m.name);
  const lines: string[] = [];

  // Trip metadata
  lines.push(`# SplitWiz Trip Export`);
  lines.push(`# Trip: ${trip.name}`);
  lines.push(`# Code: ${trip.code}`);
  lines.push(`# Currency: ${trip.currency}`);
  lines.push(`# Exported: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(``);

  // Expenses
  lines.push(`EXPENSES`);
  lines.push(
    row(["Date", "Description", "Amount", "Category", "Paid By", "Split Type", ...memberNames])
  );
  for (const e of trip.expenses) {
    const shareMap = new Map(e.shares.map((s) => [s.memberId, s.amount]));
    const memberAmounts = trip.members.map((m) =>
      fromCents(shareMap.get(m.id) ?? 0).toFixed(2)
    );
    lines.push(
      row([
        e.createdAt.slice(0, 10),
        e.description,
        fromCents(e.amount).toFixed(2),
        e.category ?? "",
        e.paidByName,
        e.splitType,
        ...memberAmounts,
      ])
    );
  }
  lines.push(`TOTAL,,${fromCents(trip.totalSpent).toFixed(2)}`);
  lines.push(``);

  // Balances
  lines.push(`BALANCES`);
  lines.push(row(["Member", "Paid", "Share", "Net"]));
  for (const b of trip.balances) {
    const name = memberMap.get(b.memberId) ?? b.memberId;
    lines.push(
      row([
        name,
        fromCents(b.paid).toFixed(2),
        fromCents(b.owed).toFixed(2),
        fromCents(b.net).toFixed(2),
      ])
    );
  }
  lines.push(``);

  // Settlements
  lines.push(`SETTLEMENTS`);
  if (trip.settlements.length === 0) {
    lines.push(`# All settled up — no transfers needed`);
  } else {
    lines.push(row(["From", "To", "Amount"]));
    for (const s of trip.settlements) {
      lines.push(row([s.fromName, s.toName, fromCents(s.amount).toFixed(2)]));
    }
  }

  return lines.join("\r\n");
}

// ─── HTML print report ────────────────────────────────────────────────────────

function buildHtml(trip: TripState): string {
  const memberNames = trip.members.map((m) => m.name);
  const expenseRows = trip.expenses
    .map((e) => {
      const shareMap = new Map(e.shares.map((s) => [s.memberId, s.amount]));
      const shareCols = trip.members
        .map(
          (m) =>
            `<td class="amount">${formatMoney(shareMap.get(m.id) ?? 0, trip.currency)}</td>`
        )
        .join("");
      return `<tr>
        <td>${e.createdAt.slice(0, 10)}</td>
        <td>${h(e.description)}</td>
        <td>${h(e.category ?? "—")}</td>
        <td>${h(e.paidByName)}</td>
        <td class="amount">${formatMoney(e.amount, trip.currency)}</td>
        ${shareCols}
      </tr>`;
    })
    .join("\n");

  const memberHeaders = memberNames
    .map((n) => `<th class="amount">${h(n)}</th>`)
    .join("");

  const balanceRows = trip.balances
    .map((b) => {
      const memberMap = new Map(trip.members.map((m) => [m.id, m.name]));
      const name = memberMap.get(b.memberId) ?? b.memberId;
      const netClass = b.net > 0 ? "positive" : b.net < 0 ? "negative" : "";
      const netLabel =
        b.net === 0
          ? "settled"
          : b.net > 0
          ? `+${formatMoney(b.net, trip.currency)}`
          : formatMoney(b.net, trip.currency);
      return `<tr>
        <td>${h(name)}</td>
        <td class="amount">${formatMoney(b.paid, trip.currency)}</td>
        <td class="amount">${formatMoney(b.owed, trip.currency)}</td>
        <td class="amount ${netClass}">${netLabel}</td>
      </tr>`;
    })
    .join("\n");

  const settlementSection =
    trip.settlements.length === 0
      ? `<p class="dim">Everyone is settled up — no transfers needed.</p>`
      : `<ul class="settle-list">${trip.settlements
          .map(
            (s) =>
              `<li><strong>${h(s.fromName)}</strong> pays <strong>${h(s.toName)}</strong> <span class="settle-amount">${formatMoney(s.amount, trip.currency)}</span></li>`
          )
          .join("\n")}</ul>`;

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${h(trip.name)} — SplitWiz Trip Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 28px 32px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #888; margin: 24px 0 8px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 4px; }
  .total-box { margin: 12px 0 0; padding: 14px 18px; background: #f5f5f5; border-radius: 10px; }
  .total-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .05em; }
  .total-value { font-size: 26px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 5px 8px; border-bottom: 2px solid #e0e0e0; font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .amount { text-align: right; font-variant-numeric: tabular-nums; }
  .positive { color: #16a34a; font-weight: 600; }
  .negative { color: #dc2626; font-weight: 600; }
  .dim { color: #888; font-size: 12px; }
  .settle-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .settle-list li { padding: 10px 14px; background: #f5f5f5; border-radius: 8px; font-size: 13px; }
  .settle-amount { font-weight: 700; margin-left: 4px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; color: #aaa; font-size: 11px; }
  .print-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 24px; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 0; }
    .total-box { background: #f9f9f9; }
  }
</style>
</head>
<body>
<div class="no-print">
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>

<h1>${h(trip.name)}</h1>
<p class="meta">Code <strong>${h(trip.code)}</strong> · ${h(trip.currency)} · ${trip.members.length} ${trip.members.length === 1 ? "person" : "people"}</p>
<p class="meta">${trip.expenses.length} expense${trip.expenses.length !== 1 ? "s" : ""}</p>
<div class="total-box">
  <p class="total-label">Total spent</p>
  <p class="total-value">${formatMoney(trip.totalSpent, trip.currency)}</p>
</div>

<h2>Expenses</h2>
<table>
  <thead>
    <tr>
      <th>Date</th><th>Description</th><th>Category</th><th>Paid By</th>
      <th class="amount">Amount</th>${memberHeaders}
    </tr>
  </thead>
  <tbody>${expenseRows}</tbody>
</table>

<h2>Balances</h2>
<table>
  <thead><tr><th>Member</th><th class="amount">Paid</th><th class="amount">Share</th><th class="amount">Net</th></tr></thead>
  <tbody>${balanceRows}</tbody>
</table>

<h2>How to Settle Up</h2>
${settlementSection}

<div class="footer">Generated by SplitWiz · ${generatedDate}</div>
</body>
</html>`;
}

function h(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
