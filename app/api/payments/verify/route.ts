import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    settlementId: string;
  };
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, settlementId } = body;

  const keySecret = process.env.RAZORPAY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });

  // Verify HMAC SHA256 signature
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update settlement
  const { data: settlement } = await admin
    .from("settlements")
    .update({
      razorpay_payment_id,
      payment_status: "paid",
      payment_reference: razorpay_payment_id,
      status: "settled",
    })
    .eq("id", settlementId)
    .select("from_member_id, to_member_id, amount")
    .single();

  if (!settlement) {
    return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  }

  // Look up user IDs for the members
  const { data: members } = await admin
    .from("trip_members")
    .select("id, user_id, name")
    .in("id", [settlement.from_member_id as string, settlement.to_member_id as string]);

  const fromMember = members?.find(m => m.id === settlement.from_member_id);
  const toMember = members?.find(m => m.id === settlement.to_member_id);
  const amount = Number(settlement.amount);

  // Notify both parties
  if (fromMember?.user_id) {
    await createNotification({
      userId: fromMember.user_id as string,
      type: "payment_sent",
      title: "Payment Sent",
      body: `You paid ₹${amount.toFixed(0)} to ${(toMember?.name as string) ?? ""}`,
      actionUrl: "/dashboard/trips",
    });
  }
  if (toMember?.user_id) {
    await createNotification({
      userId: toMember.user_id as string,
      type: "payment_received",
      title: "Payment Received",
      body: `${(fromMember?.name as string) ?? ""} paid you ₹${amount.toFixed(0)}`,
      actionUrl: "/dashboard/trips",
    });
  }

  return NextResponse.json({ success: true });
}
