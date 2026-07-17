import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { Database } from "@/lib/supabase/database.types";

type SettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  // Ensure user_settings row exists (may not exist for users created before Phase 4 trigger).
  let { data: settings } = await admin
    .from("user_settings")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!settings) {
    const { data: created } = await admin
      .from("user_settings")
      .insert({ id: user.id })
      .select("*")
      .single();
    settings = created;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    settings,
    profile,
    email: user.email,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, supabase, admin } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { display_name, default_currency, notifications_enabled, theme } =
    (body ?? {}) as {
      display_name?: string;
      default_currency?: string;
      notifications_enabled?: boolean;
      theme?: string;
    };

  const hasSettingsUpdate =
    default_currency !== undefined ||
    notifications_enabled !== undefined ||
    theme !== undefined;

  if (hasSettingsUpdate) {
    const upsertData: SettingsInsert = { id: user.id };
    if (default_currency !== undefined) upsertData.default_currency = default_currency;
    if (notifications_enabled !== undefined)
      upsertData.notifications_enabled = notifications_enabled;
    if (theme !== undefined) upsertData.theme = theme;

    const { error } = await admin.from("user_settings").upsert(upsertData);

    if (error) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
  }

  if (display_name !== undefined) {
    const trimmed = display_name.trim();
    if (trimmed) {
      await Promise.all([
        admin
          .from("profiles")
          .update({ display_name: trimmed })
          .eq("id", user.id),
        supabase.auth.updateUser({ data: { display_name: trimmed } }),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
