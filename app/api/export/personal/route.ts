import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { fromCents } from "@/lib/money";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const admin = createAdminClient();

  // All trips the user owns or collaborates on
  const [ownResult, collabResult] = await Promise.all([
    admin
      .from("trips")
      .select("id, name, code, currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    admin.from("trip_collaborators").select("trip_id").eq("user_id", user.id),
  ]);

  const ownTrips = ownResult.data ?? [];
  const collabIds = (collabResult.data ?? []).map((c) => c.trip_id);

  let collabTrips: typeof ownTrips = [];
  if (collabIds.length > 0) {
    const { data } = await admin
      .from("trips")
      .select("id, name, code, currency, created_at")
      .in("id", collabIds)
      .order("created_at", { ascending: false });
    collabTrips = data ?? [];
  }

  const allTrips = [...ownTrips, ...collabTrips];

  if (allTrips.length === 0) {
    const csv = buildEmptyCsv(user.email ?? user.id);
    return csvResponse(csv, "splitwiz-export.csv");
  }

  const tripIds = allTrips.map((t) => t.id);
  const tripMap = new Map(allTrips.map((t) => [t.id, t]));

  // Fetch all expenses + member names
  const [expensesResult, membersResult] = await Promise.all([
    admin
      .from("expenses")
      .select("id, trip_id, description, amount_cents, category, split_type, created_at, paid_by_id")
      .in("trip_id", tripIds)
      .order("created_at", { ascending: false }),
    admin
      .from("members")
      .select("id, name, trip_id")
      .in("trip_id", tripIds),
  ]);

  const allExpenses = expensesResult.data ?? [];
  const memberMap = new Map(
    (membersResult.data ?? []).map((m) => [`${m.trip_id}:${m.id}`, m.name])
  );

  const csv = buildCsv(user.email ?? user.id, allTrips, allExpenses, tripMap, memberMap);
  return csvResponse(csv, "splitwiz-personal-export.csv");
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

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

function buildEmptyCsv(identity: string): string {
  const lines = [
    `# SplitWiz Personal Data Export`,
    `# User: ${identity}`,
    `# Exported: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `Trip,Code,Currency,Date,Description,Amount,Category,Paid By,Split Type`,
    `# No trips found`,
  ];
  return lines.join("\r\n");
}

function buildCsv(
  identity: string,
  allTrips: { id: string; name: string; code: string; currency: string; created_at: string }[],
  allExpenses: {
    id: string;
    trip_id: string;
    description: string;
    amount_cents: number;
    category: string | null;
    split_type: string;
    created_at: string;
    paid_by_id: string;
  }[],
  tripMap: Map<string, { name: string; code: string; currency: string }>,
  memberMap: Map<string, string>
): string {
  const lines: string[] = [
    `# SplitWiz Personal Data Export`,
    `# User: ${identity}`,
    `# Trips: ${allTrips.length}`,
    `# Expenses: ${allExpenses.length}`,
    `# Exported: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    row(["Trip", "Code", "Currency", "Date", "Description", "Amount", "Category", "Paid By", "Split Type"]),
  ];

  for (const e of allExpenses) {
    const trip = tripMap.get(e.trip_id);
    if (!trip) continue;
    const paidByName = memberMap.get(`${e.trip_id}:${e.paid_by_id}`) ?? e.paid_by_id;
    lines.push(
      row([
        trip.name,
        trip.code,
        trip.currency,
        e.created_at.slice(0, 10),
        e.description,
        fromCents(e.amount_cents).toFixed(2),
        e.category ?? "",
        paidByName,
        e.split_type,
      ])
    );
  }

  return lines.join("\r\n");
}
