import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { data: categories, error } = await admin
    .from("categories")
    .select("id, name, icon, color, is_default")
    .or(`is_default.eq.true,user_id.eq.${user.id}`)
    .order("is_default", { ascending: false })
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }

  return NextResponse.json({ categories: categories ?? [] });
}
