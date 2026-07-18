import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { autoDetectCategory } from '@/lib/auto-categorize';

type Params = { params: Promise<{ id: string }> };

// POST /api/trips2/[id]/expenses — add expense + splits
export async function POST(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from('trips')
    .select('id, user_id, name, currency')
    .eq('id', tripId)
    .single();

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = (body ?? {}) as {
    title?: unknown;
    amount?: unknown;
    category?: unknown;
    category_icon?: unknown;
    paid_by_member_id?: unknown;
    date?: unknown;
    note?: unknown;
    split_type?: unknown;
    splits?: unknown;
  };

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const amount = typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount ?? ''));
  if (!isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  const paidByMemberId = typeof b.paid_by_member_id === 'string' ? b.paid_by_member_id : null;
  if (!paidByMemberId) return NextResponse.json({ error: 'Paid by member is required' }, { status: 400 });

  const date = typeof b.date === 'string' ? b.date : new Date().toISOString().slice(0, 10);
  const note = typeof b.note === 'string' ? b.note.trim() || null : null;

  // Auto-detect category if not provided
  let category = typeof b.category === 'string' ? b.category : null;
  let categoryIcon = typeof b.category_icon === 'string' ? b.category_icon : null;
  if (!category) {
    const detected = autoDetectCategory(title);
    if (detected.confidence > 0) {
      category = detected.category;
      categoryIcon = detected.icon;
    }
  }

  const splits = Array.isArray(b.splits)
    ? (b.splits as unknown[]).filter(s => s !== null && typeof s === 'object') as { member_id: string; amount: number }[]
    : [];

  if (splits.length === 0) return NextResponse.json({ error: 'At least one split member required' }, { status: 400 });

  const { data: expense, error: expenseError } = await admin
    .from('expenses')
    .insert({
      trip_id: tripId,
      title,
      amount,
      currency: trip.currency,
      category: category ?? null,
      category_icon: categoryIcon ?? null,
      paid_by_member_id: paidByMemberId,
      date,
      note,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (expenseError || !expense) {
    console.error('Expense insert error:', expenseError);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }

  const { error: splitsError } = await admin.from('expense_splits').insert(
    splits.map(s => ({
      expense_id: expense.id,
      member_id: s.member_id,
      amount: s.amount,
    }))
  );

  if (splitsError) {
    await admin.from('expenses').delete().eq('id', expense.id);
    return NextResponse.json({ error: 'Failed to create splits' }, { status: 500 });
  }

  // Anomaly check — compare to last 5 expenses in same category
  let anomaly = false;
  if (category) {
    const { data: recent } = await admin
      .from('expenses')
      .select('amount')
      .eq('trip_id', tripId)
      .eq('category', category)
      .neq('id', expense.id)
      .not('amount', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recent && recent.length >= 2) {
      const avg = recent.reduce((sum, e) => sum + Number(e.amount ?? 0), 0) / recent.length;
      if (amount > avg * 2) anomaly = true;
    }
  }

  // Log activity
  void admin.from('activity_log').insert({
    trip_id: tripId,
    user_id: user.id,
    action_type: 'expense_added',
    description: `Added "${title}" ${trip.currency} ${amount.toFixed(2)}`,
    metadata: { expense_id: expense.id, title, amount, category },
  });

  // Notify other trip members who are registered users
  const creatorName: string = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Someone';
  const { data: otherMembers } = await admin
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .neq('user_id', user.id)
    .not('user_id', 'is', null);

  if (otherMembers && otherMembers.length > 0) {
    void admin.from('notifications').insert(
      otherMembers.map(m => ({
        user_id: m.user_id as string,
        type: 'expense_added',
        title: `New expense in "${trip.name}"`,
        body: `${creatorName} added "${title}" — ${trip.currency} ${amount.toFixed(2)}`,
        action_url: `/dashboard/trips/${tripId}`,
        message: `${creatorName} added "${title}" — ${trip.currency} ${amount.toFixed(2)}`,
        link: `/dashboard/trips/${tripId}`,
      }))
    );
  }

  return NextResponse.json({ id: expense.id, anomaly }, { status: 201 });
}
