import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AuthOk = {
  ok: true;
  user: User;
  supabase: SupabaseClient<Database>;
  admin: SupabaseClient<Database>;
};
type AuthFail = { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthOk | AuthFail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, user, supabase, admin: createAdminClient() };
}
