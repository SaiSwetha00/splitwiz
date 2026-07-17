import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTripWrite } from "@/lib/auth/tripAccess";

type RouteParams = {
  params: Promise<{ code: string; expenseId: string; receiptId: string }>;
};

// DELETE — remove a receipt. Uploader or trip editor/owner can delete.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { code, expenseId, receiptId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Fetch the receipt first.
  const { data: receipt } = await admin
    .from("receipts")
    .select("id, storage_path, uploaded_by")
    .eq("id", receiptId)
    .eq("expense_id", expenseId)
    .maybeSingle();

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  // Authorization: uploader can always delete their own receipt.
  // For owned trips: editor/owner can delete any receipt on the trip.
  const isUploader = receipt.uploaded_by === user.id;

  if (!isUploader) {
    const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
    if (!access.ok) {
      return NextResponse.json(
        { error: "Not authorized to delete this receipt" },
        { status: 403 }
      );
    }
  }

  // Delete from storage then from DB.
  await admin.storage.from("receipts").remove([receipt.storage_path]);
  await admin.from("receipts").delete().eq("id", receiptId);

  return NextResponse.json({ ok: true });
}
