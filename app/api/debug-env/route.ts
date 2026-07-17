import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING
export async function GET() {
  const keyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) ?? "MISSING";
  const urlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  let dbTest: { ok: boolean; error?: string } = { ok: false };
  try {
    const admin = createAdminClient();
    // Try inserting and immediately deleting a test trip
    const { error } = await admin.from("trips").insert({
      code: "DEBUG999",
      name: "Debug Test",
      currency: "USD",
    }).select("id").single();
    if (error) {
      dbTest = { ok: false, error: error.message };
    } else {
      await admin.from("trips").delete().eq("code", "DEBUG999");
      dbTest = { ok: true };
    }
  } catch (e) {
    dbTest = { ok: false, error: String(e) };
  }

  return NextResponse.json({ keyPrefix, urlSet, dbTest });
}
