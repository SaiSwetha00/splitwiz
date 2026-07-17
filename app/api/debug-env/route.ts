import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING
export async function GET() {
  const serviceKeyLen = process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0;

  // Test: Can service role key use admin auth API?
  let authAdminTest: { ok: boolean; error?: string; userCount?: number } = { ok: false };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 });
    if (error) authAdminTest = { ok: false, error: error.message };
    else authAdminTest = { ok: true, userCount: data?.users?.length };
  } catch (e) { authAdminTest = { ok: false, error: String(e) }; }

  // Test: Raw fetch to Supabase REST with service key as Bearer
  let rawRestTest: { status: number; error?: string } = { status: 0 };
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const res = await fetch(`${url}/rest/v1/trips?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = await res.json();
    rawRestTest = { status: res.status, error: body?.message };
  } catch (e) { rawRestTest = { status: -1, error: String(e) }; }

  return NextResponse.json({ serviceKeyLen, authAdminTest, rawRestTest });
}
