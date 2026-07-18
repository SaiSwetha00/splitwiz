import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { error } = await supabase.auth.resetPasswordForEmail(
    user.email ?? "",
    {
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL + "/reset-password",
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
