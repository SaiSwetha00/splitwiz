import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateUniqueCode } from '@/lib/tripService';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

// GET /api/trips2 — list user's trips for selectors
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: trips } = await admin
    .from('trips')
    .select('id, name, currency, code, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ trips: trips ?? [] });
}

// POST /api/trips2 — create a new trip using the Phase 1 trip_members schema
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = (body ?? {}) as {
    name?: unknown;
    type?: unknown;
    currency?: unknown;
    description?: unknown;
    members?: unknown;
  };

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Trip name is required' }, { status: 400 });

  const type = typeof b.type === 'string' ? b.type.trim() : null;
  if (!type) return NextResponse.json({ error: 'Trip type is required' }, { status: 400 });

  const currency =
    typeof b.currency === 'string' && SUPPORTED_CURRENCIES.includes(b.currency)
      ? b.currency
      : 'INR';

  const description = typeof b.description === 'string' ? b.description.trim() || null : null;

  const memberNames = Array.isArray(b.members)
    ? (b.members as unknown[])
        .map(m => (typeof m === 'string' ? m.trim() : ''))
        .filter(m => m.length > 0)
    : [];

  const admin = createAdminClient();
  const code = await generateUniqueCode();

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .insert({
      code,
      name,
      type,
      currency,
      description,
      user_id: user.id,
      status: 'active',
      total_spent: 0,
    })
    .select('id')
    .single();

  if (tripError || !trip) {
    console.error('Trip create error:', tripError);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }

  // Insert creator as first member
  const allMembers = [{ name: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Me', is_creator: true, user_id: user.id }, ...memberNames.map(n => ({ name: n, is_creator: false, user_id: null as string | null }))];

  const { error: membersError } = await admin
    .from('trip_members')
    .insert(allMembers.map(m => ({
      trip_id: trip.id,
      user_id: m.user_id,
      name: m.name,
      is_creator: m.is_creator,
      avatar_color: '#6366f1',
    })));

  if (membersError) {
    await admin.from('trips').delete().eq('id', trip.id);
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
  }

  // Log to activity_log
  await admin.from('activity_log').insert({
    trip_id: trip.id,
    user_id: user.id,
    action_type: 'trip_created',
    description: `Created trip "${name}"`,
    metadata: { name, type, currency },
  });

  return NextResponse.json({ id: trip.id }, { status: 201 });
}
