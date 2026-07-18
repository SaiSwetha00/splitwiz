import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

// GET /api/notifications — list the 50 most recent notifications for the user.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { data } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/notifications — mark all as read.
export async function PATCH() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  await admin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications — delete all notifications for the user.
export async function DELETE() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  await admin.from("notifications").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
