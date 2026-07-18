import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getTripById, getExpenses, getBalances, getSimplifiedDebts, getActivity, getSettlements } from '@/lib/trips';

type Params = { params: Promise<{ id: string }> };

// GET /api/trips2/[id] — full trip detail with members, expenses, balances, activity
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [expenses, balances, debts, activity, settlements] = await Promise.all([
    getExpenses(id),
    getBalances(id, trip.members),
    getSimplifiedDebts(id, trip.members),
    getActivity(id),
    getSettlements(id),
  ]);

  return NextResponse.json({ trip, expenses, balances, debts, activity, settlements });
}

// DELETE /api/trips2/[id] — delete a trip (cascades to all children via FK)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin.from('trips').select('user_id').eq('id', id).single();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('trips').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
