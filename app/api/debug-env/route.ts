import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING
export async function GET() {
  const serviceKeySet = !!(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceKeyLen = process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0;

  // Test 1: user client SELECT
  let userSelect: { ok: boolean; error?: string; rowCount?: number } = { ok: false };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("trips").select("id").limit(5);
    if (error) userSelect = { ok: false, error: error.message };
    else userSelect = { ok: true, rowCount: data?.length ?? 0 };
  } catch (e) { userSelect = { ok: false, error: String(e) }; }

  // Test 2: admin client SELECT
  let adminSelect: { ok: boolean; error?: string } = { ok: false };
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("trips").select("id").limit(1);
    if (error) adminSelect = { ok: false, error: error.message };
    else adminSelect = { ok: true };
  } catch (e) { adminSelect = { ok: false, error: String(e) }; }

  // Test 3: admin client INSERT (test trip)
  let adminInsert: { ok: boolean; error?: string } = { ok: false };
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("trips").insert({
      code: "DBGTST1",
      name: "Debug Test",
      currency: "USD",
      user_id: null,
    }).select("id").single();
    if (error) {
      adminInsert = { ok: false, error: error.message };
    } else {
      await admin.from("trips").delete().eq("code", "DBGTST1");
      adminInsert = { ok: true };
    }
  } catch (e) { adminInsert = { ok: false, error: String(e) }; }

  return NextResponse.json({ serviceKeySet, serviceKeyLen, userSelect, adminSelect, adminInsert });
}
