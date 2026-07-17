import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING
export async function GET() {
  const serviceKeySet = !!(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceKeyLen = process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0;
  const urlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  let dbTest: { ok: boolean; error?: string } = { ok: false };
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("trips").select("id").limit(1);
    if (error) {
      dbTest = { ok: false, error: error.message };
    } else {
      dbTest = { ok: true };
    }
  } catch (e) {
    dbTest = { ok: false, error: String(e) };
  }

  return NextResponse.json({ serviceKeySet, serviceKeyLen, urlSet, dbTest });
}
