import { NextResponse } from "next/server";
import { loadTripState } from "@/lib/tripService";

// GET /api/trips/:code — full trip state including balances & settlements.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const state = await loadTripState(code);
  if (!state) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}
