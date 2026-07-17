import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkTripWrite } from "@/lib/auth/tripAccess";

// DELETE /api/trips/:code/members/:memberId — remove a member.
// Refused if the member is involved in any expense, to keep balances intact.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; memberId: string }> }
) {
  const { code, memberId } = await params;
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check if the member is referenced by any expenses.
  const [paidResult, shareResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("paid_by_id", memberId),
    supabase
      .from("expense_shares")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId),
  ]);

  const paidCount = paidResult.count ?? 0;
  const shareCount = shareResult.count ?? 0;

  if (paidCount > 0 || shareCount > 0) {
    return NextResponse.json(
      {
        error:
          "This member is part of existing expenses. Delete or edit those expenses first.",
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
