import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; expenseId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { expenseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("expense_comments")
    .select("id, comment, created_at, user_id")
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with display names
  const userIds = [...new Set((data ?? []).map(r => r.user_id))];
  const { data: profiles } = await admin.from("profiles").select("id, display_name").in("id", userIds);
  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]));

  const comments = (data ?? []).map(r => ({
    id: r.id,
    comment: r.comment,
    created_at: r.created_at,
    user_id: r.user_id,
    display_name: nameMap.get(r.user_id) ?? "Member",
    is_mine: r.user_id === user.id,
  }));

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: tripId, expenseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { comment: string };
  const comment = body.comment?.trim();
  if (!comment) return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  if (comment.length > 500) return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });

  const admin = createAdminClient();

  // Verify user has access to this trip
  const { data: member } = await admin
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: trip } = await admin.from("trips").select("user_id").eq("id", tripId).single();
  if (!member && trip?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("expense_comments")
    .insert({ expense_id: expenseId, user_id: user.id, comment })
    .select("id, comment, created_at, user_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin.from("profiles").select("display_name").eq("id", user.id).single();

  return NextResponse.json({
    id: data.id,
    comment: data.comment,
    created_at: data.created_at,
    user_id: data.user_id,
    display_name: profile?.display_name ?? "Member",
    is_mine: true,
  }, { status: 201 });
}
