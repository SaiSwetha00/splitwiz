import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/trips/:code/members/:memberId — remove a member.
// Refused if the member is involved in any expense, to keep balances intact.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; memberId: string }> }
) {
  const { code, memberId } = await params;
  const trip = await prisma.trip.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, tripId: trip.id },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [paidCount, shareCount] = await Promise.all([
    prisma.expense.count({ where: { paidById: memberId } }),
    prisma.expenseShare.count({ where: { memberId } }),
  ]);
  if (paidCount > 0 || shareCount > 0) {
    return NextResponse.json(
      {
        error:
          "This member is part of existing expenses. Delete or edit those expenses first.",
      },
      { status: 409 }
    );
  }

  await prisma.member.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
