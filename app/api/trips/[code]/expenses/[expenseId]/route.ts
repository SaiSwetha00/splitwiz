import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExpenseInput } from "@/lib/expenseInput";

async function findExpense(code: string, expenseId: string) {
  const trip = await prisma.trip.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });
  if (!trip) return { error: "Trip not found" as const, status: 404 };
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, tripId: trip.id },
  });
  if (!expense) return { error: "Expense not found" as const, status: 404 };
  return { trip, expense };
}

// PATCH /api/trips/:code/expenses/:expenseId — replace an expense's details.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; expenseId: string }> }
) {
  const { code, expenseId } = await params;
  const found = await findExpense(code, expenseId);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validIds = new Set(found.trip.members.map((m) => m.id));
  const parsed = parseExpenseInput(body, validIds);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { description, amountCents, category, paidById, splitType, shares } =
    parsed.data;

  // Replace shares atomically along with the expense fields.
  await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { expenseId } }),
    prisma.expense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: amountCents,
        category,
        paidById,
        splitType,
        shares: { create: shares },
      },
    }),
  ]);

  return NextResponse.json({ id: expenseId });
}

// DELETE /api/trips/:code/expenses/:expenseId — remove an expense.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; expenseId: string }> }
) {
  const { code, expenseId } = await params;
  const found = await findExpense(code, expenseId);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }
  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ ok: true });
}
