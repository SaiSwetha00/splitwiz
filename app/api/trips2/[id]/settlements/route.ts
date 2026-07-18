import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// POST /api/trips2/[id]/settlements — record a settlement
export async function POST(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin.from('trips').select('user_id, name, currency').eq('id', tripId).single();
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = (body ?? {}) as {
    from_member_id?: unknown;
    to_member_id?: unknown;
    amount?: unknown;
    method?: unknown;
    note?: unknown;
    payment_card_id?: unknown;
  };

  const fromMemberId = typeof b.from_member_id === 'string' ? b.from_member_id : null;
  const toMemberId   = typeof b.to_member_id === 'string' ? b.to_member_id : null;
  if (!fromMemberId || !toMemberId) {
    return NextResponse.json({ error: 'from_member_id and to_member_id are required' }, { status: 400 });
  }

  const amount = typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount ?? ''));
  if (!isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  const method = typeof b.method === 'string' ? b.method : 'cash';
  const paymentCardId = typeof b.payment_card_id === 'string' ? b.payment_card_id : null;

  const { data: settlement, error } = await admin
    .from('settlements')
    .insert({
      trip_id: tripId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      amount,
      method,
      note: typeof b.note === 'string' ? b.note.trim() || null : null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !settlement) {
    return NextResponse.json({ error: 'Failed to record settlement' }, { status: 500 });
  }

  // Insert transaction record for the payer
  void admin.from('transactions').insert({
    user_id: user.id,
    type: 'settlement_paid',
    amount,
    currency: trip.currency,
    description: `Paid settlement in "${trip.name}"`,
    payment_card_id: paymentCardId,
    related_settlement_id: settlement.id,
    status: 'completed',
  });

  // Fetch member names for the log
  const { data: members } = await admin
    .from('trip_members')
    .select('id, name, user_id')
    .in('id', [fromMemberId, toMemberId]);

  const fromMember = members?.find(m => m.id === fromMemberId);
  const toMember   = members?.find(m => m.id === toMemberId);
  const fromName = fromMember?.name ?? 'Someone';
  const toName   = toMember?.name ?? 'Someone';
  const sym = trip.currency;

  // Notify the recipient that they were paid
  if (toMember?.user_id && toMember.user_id !== user.id) {
    void admin.from('notifications').insert({
      user_id: toMember.user_id,
      type: 'settlement_received',
      title: '✅ Payment Received',
      body: `${fromName} paid you ${sym} ${amount.toFixed(2)} from "${trip.name}"`,
      action_url: `/dashboard/trips/${tripId}`,
      read: false,
    });
  }

  // Notify the payer if they're a different registered user than the creator
  if (fromMember?.user_id && fromMember.user_id !== user.id) {
    void admin.from('notifications').insert({
      user_id: fromMember.user_id,
      type: 'settlement_paid',
      title: '💸 Payment Recorded',
      body: `Your ${sym} ${amount.toFixed(2)} payment to ${toName} in "${trip.name}" was recorded`,
      action_url: `/dashboard/trips/${tripId}`,
      read: false,
    });
  }

  void admin.from('activity_log').insert({
    trip_id: tripId,
    user_id: user.id,
    action_type: 'settlement_created',
    description: `${fromName} paid ${toName} ${trip.currency} ${amount.toFixed(2)}`,
    metadata: { settlement_id: settlement.id, from_member_id: fromMemberId, to_member_id: toMemberId, amount },
  });

  return NextResponse.json({ id: settlement.id }, { status: 201 });
}
