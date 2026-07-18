import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { autoDetectCategory } from '@/lib/auto-categorize';

type Params = { params: Promise<{ id: string; expenseId: string }> };

// PATCH /api/trips2/[id]/expenses/[expenseId] — edit expense
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId, expenseId } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin.from('trips').select('user_id, currency, name').eq('id', tripId).single();
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = (body ?? {}) as {
    title?: unknown; amount?: unknown; category?: unknown;
    category_icon?: unknown; paid_by_member_id?: unknown;
    date?: unknown; note?: unknown; splits?: unknown;
  };

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const amount = typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount ?? ''));
  if (!isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Amount must be > 0' }, { status: 400 });

  let category = typeof b.category === 'string' ? b.category : null;
  let categoryIcon = typeof b.category_icon === 'string' ? b.category_icon : null;
  if (!category) {
    const detected = autoDetectCategory(title);
    if (detected.confidence > 0) { category = detected.category; categoryIcon = detected.icon; }
  }

  const splits = Array.isArray(b.splits)
    ? (b.splits as unknown[]).filter(s => s !== null && typeof s === 'object') as { member_id: string; amount: number }[]
    : [];

  if (splits.length === 0) return NextResponse.json({ error: 'At least one split required' }, { status: 400 });

  const { error: updateError } = await admin.from('expenses').update({
    title,
    amount,
    category: category ?? null,
    category_icon: categoryIcon ?? null,
    paid_by_member_id: typeof b.paid_by_member_id === 'string' ? b.paid_by_member_id : null,
    date: typeof b.date === 'string' ? b.date : new Date().toISOString().slice(0, 10),
    note: typeof b.note === 'string' ? b.note.trim() || null : null,
  }).eq('id', expenseId).eq('trip_id', tripId);

  if (updateError) return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });

  await admin.from('expense_splits').delete().eq('expense_id', expenseId);
  await admin.from('expense_splits').insert(splits.map(s => ({
    expense_id: expenseId,
    member_id: s.member_id,
    amount: s.amount,
  })));

  void admin.from('activity_log').insert({
    trip_id: tripId,
    user_id: user.id,
    action_type: 'expense_edited',
    description: `Edited "${title}" ${trip.currency} ${amount.toFixed(2)}`,
    metadata: { expense_id: expenseId, title, amount },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/trips2/[id]/expenses/[expenseId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId, expenseId } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin.from('trips').select('user_id, name').eq('id', tripId).single();
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: expense } = await admin.from('expenses').select('title').eq('id', expenseId).single();

  const { error } = await admin.from('expenses').delete().eq('id', expenseId).eq('trip_id', tripId);
  if (error) return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });

  void admin.from('activity_log').insert({
    trip_id: tripId,
    user_id: user.id,
    action_type: 'expense_deleted',
    description: `Deleted expense "${expense?.title ?? ''}"`,
    metadata: { expense_id: expenseId },
  });

  return NextResponse.json({ ok: true });
}
