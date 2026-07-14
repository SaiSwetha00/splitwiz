import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/trips/:code/members — add a member to an existing trip.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const trip = await prisma.trip.findUnique({
    where: { code: code.toUpperCase() },
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
  const name =
    typeof (body as { name?: unknown })?.name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: { name, tripId: trip.id },
  });
  return NextResponse.json({ id: member.id, name: member.name }, { status: 201 });
}
