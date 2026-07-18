import { createAdminClient } from '@/lib/supabase/admin';
import type { Trip, TripMember, TripExpense, ExpenseSplit, Settlement, ActivityEntry, MemberBalance, DebtSimplification } from '@/types/trips';

// ─── Trips ───────────────────────────────────────────────────────────────────

export async function getTrips(userId: string): Promise<Trip[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('trips')
    .select('id, user_id, name, type, currency, description, status, total_spent, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const tripIds = data.map(t => t.id);
  const { data: membersData } = tripIds.length > 0
    ? await admin.from('trip_members').select('id, trip_id, name, avatar_color, is_creator, user_id, email, joined_at').in('trip_id', tripIds)
    : { data: [] };

  const membersByTrip = new Map<string, TripMember[]>();
  for (const m of (membersData ?? [])) {
    const list = membersByTrip.get(m.trip_id) ?? [];
    list.push(m as TripMember);
    membersByTrip.set(m.trip_id, list);
  }

  return data.map(t => ({
    id: t.id,
    user_id: t.user_id ?? null,
    name: t.name,
    type: t.type ?? null,
    currency: t.currency,
    description: t.description ?? null,
    status: t.status ?? 'active',
    total_spent: Number(t.total_spent ?? 0),
    created_at: t.created_at,
    updated_at: t.updated_at ?? t.created_at,
    members: membersByTrip.get(t.id) ?? [],
  }));
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  const admin = createAdminClient();
  const [tripRes, membersRes] = await Promise.all([
    admin
      .from('trips')
      .select('id, user_id, name, type, currency, description, status, total_spent, created_at, updated_at')
      .eq('id', tripId)
      .single(),
    admin
      .from('trip_members')
      .select('id, trip_id, user_id, name, email, avatar_color, is_creator, joined_at')
      .eq('trip_id', tripId)
      .order('joined_at', { ascending: true }),
  ]);

  if (tripRes.error || !tripRes.data) return null;
  const t = tripRes.data;

  return {
    id: t.id,
    user_id: t.user_id ?? null,
    name: t.name,
    type: t.type ?? null,
    currency: t.currency,
    description: t.description ?? null,
    status: t.status ?? 'active',
    total_spent: Number(t.total_spent ?? 0),
    created_at: t.created_at,
    updated_at: t.updated_at ?? t.created_at,
    members: (membersRes.data ?? []) as TripMember[],
  };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(tripId: string): Promise<TripExpense[]> {
  const admin = createAdminClient();

  const { data: expenses, error } = await admin
    .from('expenses')
    .select('id, trip_id, title, amount, currency, category, category_icon, paid_by_member_id, date, note, receipt_url, created_by, created_at')
    .eq('trip_id', tripId)
    .not('paid_by_member_id', 'is', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !expenses || expenses.length === 0) return [];

  const expenseIds = expenses.map(e => e.id);
  const { data: splitsData } = await admin
    .from('expense_splits')
    .select('id, expense_id, member_id, amount, is_settled, settled_at')
    .in('expense_id', expenseIds);

  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  for (const s of (splitsData ?? [])) {
    const list = splitsByExpense.get(s.expense_id) ?? [];
    list.push(s as unknown as ExpenseSplit);
    splitsByExpense.set(s.expense_id, list);
  }

  const { data: membersData } = await admin
    .from('trip_members')
    .select('id, trip_id, user_id, name, email, avatar_color, is_creator, joined_at')
    .eq('trip_id', tripId);

  const membersMap = new Map<string, TripMember>((membersData ?? []).map(m => [m.id, m as TripMember]));

  return expenses.map(e => ({
    id: e.id,
    trip_id: e.trip_id,
    title: e.title ?? null,
    amount: e.amount !== null ? Number(e.amount) : null,
    currency: e.currency ?? null,
    category: e.category ?? null,
    category_icon: e.category_icon ?? null,
    paid_by_member_id: e.paid_by_member_id ?? null,
    date: e.date ?? new Date().toISOString().slice(0, 10),
    note: e.note ?? null,
    receipt_url: e.receipt_url ?? null,
    created_by: e.created_by ?? null,
    created_at: e.created_at,
    paid_by: e.paid_by_member_id ? membersMap.get(e.paid_by_member_id) : undefined,
    splits: (splitsByExpense.get(e.id) ?? []).map(s => ({
      ...s,
      member: membersMap.get(s.member_id),
    })),
  }));
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export async function getBalances(tripId: string, members: TripMember[]): Promise<MemberBalance[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('calculate_balances', { p_trip_id: tripId });
  if (error || !data) return [];

  const membersMap = new Map(members.map(m => [m.id, m]));
  return (data as { member_id: string; net_balance: number }[]).map(row => ({
    member_id: row.member_id,
    net_balance: Number(row.net_balance),
    member: membersMap.get(row.member_id),
  }));
}

export async function getSimplifiedDebts(tripId: string, members: TripMember[]): Promise<DebtSimplification[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('simplify_debts', { p_trip_id: tripId });
  if (error || !data) return [];

  const membersMap = new Map(members.map(m => [m.id, m]));
  return (data as { from_member_id: string; to_member_id: string; amount: number }[]).map(row => ({
    from_member_id: row.from_member_id,
    to_member_id: row.to_member_id,
    amount: Number(row.amount),
    from_member: membersMap.get(row.from_member_id),
    to_member: membersMap.get(row.to_member_id),
  }));
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function getActivity(tripId: string): Promise<ActivityEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('activity_log')
    .select('id, trip_id, user_id, action_type, description, metadata, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    trip_id: row.trip_id ?? null,
    user_id: row.user_id,
    action_type: row.action_type,
    description: row.description,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at,
  }));
}

// ─── Settlements ──────────────────────────────────────────────────────────────

export async function getSettlements(tripId: string): Promise<Settlement[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('settlements')
    .select('id, trip_id, from_member_id, to_member_id, amount, method, note, created_by, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    trip_id: row.trip_id,
    from_member_id: row.from_member_id,
    to_member_id: row.to_member_id,
    amount: Number(row.amount),
    method: row.method ?? 'cash',
    note: row.note ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export { timeAgo } from './timeAgo';
