import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/notifications/:id — mark a single notification as read.
export async function PATCH(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  await admin
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications/:id — delete a single notification.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  await admin
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
