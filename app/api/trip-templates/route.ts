import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trip_templates")
    .select("id, name, trip_type, default_currency, member_names, categories, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    tripId?: string;
    trip_type?: string;
    default_currency?: string;
    member_names?: string[];
    categories?: string[];
  };

  const admin = createAdminClient();

  // If tripId provided, build template from existing trip
  let memberNames: string[] = body.member_names ?? [];
  let categories: string[] = body.categories ?? [];
  let tripType: string | null = body.trip_type ?? null;
  let currency = body.default_currency ?? "INR";

  if (body.tripId) {
    const { data: trip } = await admin
      .from("trips")
      .select("type, currency")
      .eq("id", body.tripId)
      .eq("user_id", user.id)
      .single();

    if (trip) {
      tripType = (trip.type as string | null) ?? tripType;
      currency = (trip.currency as string) ?? currency;
    }

    const { data: members } = await admin
      .from("trip_members")
      .select("name")
      .eq("trip_id", body.tripId);

    memberNames = (members ?? []).map(m => m.name as string);

    const { data: expenses } = await admin
      .from("expenses")
      .select("category")
      .eq("trip_id", body.tripId)
      .not("category", "is", null);

    const catCounts = new Map<string, number>();
    for (const e of expenses ?? []) {
      const cat = e.category as string;
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
    categories = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat]) => cat);
  }

  const { data, error } = await admin
    .from("trip_templates")
    .insert({
      user_id: user.id,
      name: body.name,
      trip_type: tripType,
      default_currency: currency,
      member_names: memberNames,
      categories,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
