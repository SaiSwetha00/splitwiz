import { prisma } from "./prisma";
import { computeBalances, computeSettlements } from "./balances";

// Unambiguous alphabet (no 0/O/1/I) for human-friendly shareable codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await prisma.trip.findUnique({ where: { code } });
    if (!existing) return code;
  }
  // Fall back to a longer code on the extremely unlikely repeated collision.
  return generateCode(10);
}

// Load a trip and everything needed to render it, including derived balances
// and settlement suggestions. Returns null if the code doesn't exist.
export async function loadTripState(code: string) {
  const trip = await prisma.trip.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: { shares: true, paidBy: true },
      },
    },
  });

  if (!trip) return null;

  const balances = computeBalances(
    trip.members,
    trip.expenses.map((e) => ({
      amount: e.amount,
      paidById: e.paidById,
      shares: e.shares.map((s) => ({ memberId: s.memberId, amount: s.amount })),
    }))
  );
  const settlements = computeSettlements(balances);

  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    id: trip.id,
    code: trip.code,
    name: trip.name,
    currency: trip.currency,
    createdAt: trip.createdAt,
    totalSpent,
    members: trip.members.map((m) => ({ id: m.id, name: m.name })),
    expenses: trip.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      splitType: e.splitType,
      createdAt: e.createdAt,
      paidById: e.paidById,
      paidByName: e.paidBy.name,
      shares: e.shares.map((s) => ({ memberId: s.memberId, amount: s.amount })),
    })),
    balances,
    settlements,
  };
}

export type TripState = NonNullable<Awaited<ReturnType<typeof loadTripState>>>;
