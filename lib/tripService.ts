import { createClient, createAdminClient } from "./supabase/server";
import { computeBalances, computeSettlements } from "./balances";
import { resolveUserRole } from "./auth/tripAccess";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueCode(): Promise<string> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const { data } = await admin
      .from("trips")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return generateCode(10);
}

export async function loadTripState(code: string) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: trip, error: tripError } = await admin
    .from("trips")
    .select("id, code, name, currency, created_at, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (tripError || !trip) return null;

  const [membersResult, expensesResult] = await Promise.all([
    admin
      .from("members")
      .select("id, name, created_at")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true }),
    admin
      .from("expenses")
      .select("id, description, amount_cents, category, split_type, created_at, paid_by_id")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: false }),
  ]);

  const members = membersResult.data ?? [];
  const expenses = expensesResult.data ?? [];

  let allShares: Array<{
    expense_id: string;
    member_id: string;
    amount_cents: number;
  }> = [];
  if (expenses.length > 0) {
    const { data } = await admin
      .from("expense_shares")
      .select("expense_id, member_id, amount_cents")
      .in(
        "expense_id",
        expenses.map((e) => e.id)
      );
    allShares = data ?? [];
  }

  // Build lookups
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const sharesMap = new Map<
    string,
    Array<{ member_id: string; amount_cents: number }>
  >();
  for (const s of allShares) {
    const list = sharesMap.get(s.expense_id) ?? [];
    list.push({ member_id: s.member_id, amount_cents: s.amount_cents });
    sharesMap.set(s.expense_id, list);
  }

  const userRole = await resolveUserRole(supabase, trip.id, trip.user_id ?? null);

  const balances = computeBalances(
    members,
    expenses.map((e) => ({
      amount: e.amount_cents,
      paidById: e.paid_by_id,
      shares: (sharesMap.get(e.id) ?? []).map((s) => ({
        memberId: s.member_id,
        amount: s.amount_cents,
      })),
    }))
  );
  const settlements = computeSettlements(balances);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  return {
    id: trip.id,
    code: trip.code,
    name: trip.name,
    currency: trip.currency,
    createdAt: trip.created_at,
    totalSpent,
    userRole,
    isOwned: trip.user_id !== null,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount_cents,
      category: e.category,
      splitType: e.split_type as "EQUAL" | "CUSTOM",
      createdAt: e.created_at,
      paidById: e.paid_by_id,
      paidByName: memberMap.get(e.paid_by_id) ?? "",
      shares: (sharesMap.get(e.id) ?? []).map((s) => ({
        memberId: s.member_id,
        amount: s.amount_cents,
      })),
    })),
    balances,
    settlements,
  };
}

export type TripState = NonNullable<Awaited<ReturnType<typeof loadTripState>>>;
