import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExpenseInput } from "@/lib/expenseInput";

// POST /api/trips/:code/expenses — add an expense with its split.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const trip = await prisma.trip.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validIds = new Set(trip.members.map((m) => m.id));
  const parsed = parseExpenseInput(body, validIds);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { description, amountCents, category, paidById, splitType, shares } =
    parsed.data;

  const expense = await prisma.expense.create({
    data: {
      tripId: trip.id,
      description,
      amount: amountCents,
      category,
      paidById,
      splitType,
      shares: { create: shares },
    },
  });

  return NextResponse.json({ id: expense.id }, { status: 201 });
}
