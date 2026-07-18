import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { Database } from "@/lib/supabase/database.types";

type SettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  // trips count
  const { count: tripsCount } = await admin
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // get tripIds for members/expenses counts
  const { data: tripRows } = await admin
    .from("trips")
    .select("id")
    .eq("user_id", user.id);

  const tripIds = (tripRows ?? []).map((t) => t.id);

  let membersCount = 0;
  let expensesCount = 0;

  if (tripIds.length > 0) {
    const [membersResult, expensesResult] = await Promise.all([
      admin
        .from("trip_members")
        .select("id", { count: "exact", head: true })
        .in("trip_id", tripIds),
      admin
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .in("trip_id", tripIds),
    ]);
    membersCount = membersResult.count ?? 0;
    expensesCount = expensesResult.count ?? 0;
  }

  // savedCents: sum current_cents across savings_goals
  const { data: savingsRows } = await admin
    .from("savings_goals")
    .select("current_cents")
    .eq("user_id", user.id);

  const savedCents = (savingsRows ?? []).reduce(
    (sum, row) => sum + (row.current_cents ?? 0),
    0
  );

  // user settings
  const { data: settings } = await admin
    .from("user_settings")
    .select("default_currency, theme")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    stats: {
      trips: tripsCount ?? 0,
      expenses: expensesCount,
      members: membersCount,
      savedCents,
    },
    settings,
    userMeta: (user.user_metadata ?? {}) as Record<string, unknown>,
    email: user.email ?? "",
    createdAt: user.created_at ?? "",
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

  const {
    phone,
    timezone,
    date_format,
    display_name,
    default_currency,
    theme,
  } = (body ?? {}) as {
    phone?: string;
    timezone?: string;
    date_format?: string;
    display_name?: string;
    default_currency?: string;
    theme?: string;
  };

  // Update auth user_metadata for phone/timezone/date_format/display_name
  const metaUpdate: Record<string, string> = {};
  if (phone !== undefined) metaUpdate.phone = phone;
  if (timezone !== undefined) metaUpdate.timezone = timezone;
  if (date_format !== undefined) metaUpdate.date_format = date_format;
  if (display_name !== undefined) metaUpdate.full_name = display_name;

  if (Object.keys(metaUpdate).length > 0) {
    await supabase.auth.updateUser({ data: metaUpdate });
  }

  if (display_name !== undefined) {
    const trimmed = display_name.trim();
    if (trimmed) {
      await admin.from("profiles").update({ display_name: trimmed }).eq("id", user.id);
    }
  }

  const hasSettingsUpdate = default_currency !== undefined || theme !== undefined;
  if (hasSettingsUpdate) {
    const upsertData: SettingsInsert = { id: user.id };
    if (default_currency !== undefined) upsertData.default_currency = default_currency;
    if (theme !== undefined) upsertData.theme = theme;
    await admin.from("user_settings").upsert(upsertData);
  }

  return NextResponse.json({ ok: true });
}
