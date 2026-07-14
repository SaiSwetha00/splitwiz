import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUniqueCode } from "@/lib/tripService";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

// POST /api/trips  — create a new trip with its members.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, currency, members } = (body ?? {}) as {
    name?: string;
    currency?: string;
    members?: unknown;
  };

  const tripName = typeof name === "string" ? name.trim() : "";
  if (!tripName) {
    return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
  }

  const cur =
    typeof currency === "string" && SUPPORTED_CURRENCIES.includes(currency)
      ? currency
      : "USD";

  const memberNames = Array.isArray(members)
    ? members
        .map((m) => (typeof m === "string" ? m.trim() : ""))
        .filter((m) => m.length > 0)
    : [];

  if (memberNames.length < 1) {
    return NextResponse.json(
      { error: "Add at least one member" },
      { status: 400 }
    );
  }

  const code = await generateUniqueCode();

  const trip = await prisma.trip.create({
    data: {
      code,
      name: tripName,
      currency: cur,
      members: { create: memberNames.map((n) => ({ name: n })) },
    },
  });

  return NextResponse.json({ code: trip.code }, { status: 201 });
}
