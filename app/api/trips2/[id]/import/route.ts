import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { autoDetectCategory } from '@/lib/auto-categorize';

type Params = { params: Promise<{ id: string }> };

interface ImportRow {
  title: string;
  amount: number;
  date?: string;
  category?: string;
  note?: string;
}

// POST /api/trips2/[id]/import — bulk import expenses from CSV
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

  const b = (body ?? {}) as { expenses?: unknown };
  if (!Array.isArray(b.expenses) || b.expenses.length === 0) {
    return NextResponse.json({ error: 'expenses array is required' }, { status: 400 });
  }

  if (b.expenses.length > 200) {
    return NextResponse.json({ error: 'Cannot import more than 200 rows at once' }, { status: 400 });
  }

  // Fetch all members for this trip
  const { data: members } = await admin
    .from('trip_members')
    .select('id, is_creator')
    .eq('trip_id', tripId);

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'Trip has no members' }, { status: 400 });
  }

  const creatorMember = members.find(m => m.is_creator) ?? members[0];
  const allMemberIds = members.map(m => m.id as string);

  const today = new Date().toISOString().slice(0, 10);
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const rawRow of b.expenses) {
    const row = (rawRow ?? {}) as Partial<ImportRow>;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) { failed++; errors.push('Missing title'); continue; }

    const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount ?? ''));
    if (!isFinite(amount) || amount <= 0) { failed++; errors.push(`Invalid amount for "${title}"`); continue; }

    const date = typeof row.date === 'string' && row.date.match(/^\d{4}-\d{2}-\d{2}$/) ? row.date : today;
    const noteVal = typeof row.note === 'string' ? row.note.trim() || null : null;

    let category = typeof row.category === 'string' ? row.category.trim() || null : null;
    let categoryIcon: string | null = null;
    if (!category) {
      const detected = autoDetectCategory(title);
      if (detected.confidence > 0) { category = detected.category; categoryIcon = detected.icon; }
    }

    const perPerson = Math.round((amount / allMemberIds.length) * 100) / 100;
    const remainder = Math.round((amount - perPerson * allMemberIds.length) * 100) / 100;
    const splits = allMemberIds.map((memberId, i) => ({
      member_id: memberId,
      amount: i === 0 ? perPerson + remainder : perPerson,
    }));

    const { data: expense, error: expErr } = await admin
      .from('expenses')
      .insert({
        trip_id: tripId,
        title,
        amount,
        currency: trip.currency,
        category: category ?? null,
        category_icon: categoryIcon ?? null,
        paid_by_member_id: creatorMember.id,
        date,
        note: noteVal,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (expErr || !expense) { failed++; errors.push(`Failed to insert "${title}"`); continue; }

    const { error: splitErr } = await admin.from('expense_splits').insert(
      splits.map(s => ({ expense_id: expense.id, member_id: s.member_id, amount: s.amount }))
    );

    if (splitErr) {
      void admin.from('expenses').delete().eq('id', expense.id);
      failed++;
      errors.push(`Failed to split "${title}"`);
      continue;
    }

    imported++;
  }

  return NextResponse.json({ imported, failed, errors: errors.slice(0, 10) });
}
