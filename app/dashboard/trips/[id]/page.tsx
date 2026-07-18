'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Trip, TripExpense, MemberBalance, DebtSimplification, ActivityEntry, Settlement } from '@/types/trips';
import { TRIP_TYPES, EXPENSE_CATEGORIES } from '@/types/trips';
import { currencySymbol } from '@/lib/money';
import { timeAgo } from '@/lib/timeAgo';
import { Avatar } from '@/components/Avatar';
import { TripExpenseForm } from '@/components/TripExpenseForm';
import { SettlePaymentModal } from '@/components/SettlePaymentModal';

type Tab = 'expenses' | 'balances' | 'activity';

type TripData = {
  trip: Trip;
  expenses: TripExpense[];
  balances: MemberBalance[];
  debts: DebtSimplification[];
  activity: ActivityEntry[];
  settlements: Settlement[];
};

function tripEmoji(type: string | null) {
  return TRIP_TYPES.find(t => t.value === type)?.emoji ?? '📦';
}

function categoryIcon(cat: string | null, icon: string | null): string {
  if (icon) return icon;
  return EXPENSE_CATEGORIES.find(c => c.key === cat)?.icon ?? '📦';
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TripExpense | undefined>();
  const [settlingDebt, setSettlingDebt] = useState<DebtSimplification | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [anomalyExpenseId, setAnomalyExpenseId] = useState<string | null>(null);
  const anomalyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips2/${id}`);
      if (res.status === 404 || res.status === 403) { router.replace('/dashboard/trips'); return; }
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json() as TripData;
      setData(json);
    } catch {
      setToast('Failed to load trip data');
      setTimeout(() => setToast(null), 3500);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch; setState is inside the async load(), not synchronously in the effect body
  useEffect(() => { void load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function deleteTrip() {
    const res = await fetch(`/api/trips2/${id}`, { method: 'DELETE' });
    if (res.ok) { router.replace('/dashboard/trips'); }
    else showToast('Failed to delete trip');
  }

  async function deleteExpense(expenseId: string) {
    const res = await fetch(`/api/trips2/${id}/expenses/${expenseId}`, { method: 'DELETE' });
    if (res.ok) { setDeleteExpenseId(null); showToast('Expense deleted'); await load(); }
    else showToast('Failed to delete expense');
  }

  function onSettlementComplete() {
    showToast('Settlement recorded! ✅');
    void load();
  }

  function onExpenseSaved(anomaly?: boolean, wasEditing?: boolean, savedId?: string) {
    setShowExpenseForm(false);
    setEditingExpense(undefined);
    if (anomaly && savedId) {
      if (anomalyTimerRef.current) clearTimeout(anomalyTimerRef.current);
      setAnomalyExpenseId(savedId);
      anomalyTimerRef.current = setTimeout(() => setAnomalyExpenseId(null), 5000);
    } else {
      showToast(wasEditing ? 'Expense updated ✓' : 'Expense added ✓');
    }
    void load();
  }

  function handleAnomalyConfirm() {
    if (anomalyTimerRef.current) clearTimeout(anomalyTimerRef.current);
    setAnomalyExpenseId(null);
  }

  function handleAnomalyEdit() {
    if (anomalyTimerRef.current) clearTimeout(anomalyTimerRef.current);
    const exp = expenses.find(e => e.id === anomalyExpenseId);
    setAnomalyExpenseId(null);
    if (exp) { setEditingExpense(exp); setShowExpenseForm(true); }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-xl bg-border" />
        <div className="mb-4 h-5 w-32 animate-pulse rounded-xl bg-border" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-border" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { trip, expenses, balances, debts, activity } = data;
  const sym = currencySymbol(trip.currency);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/trips"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          All Trips
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{tripEmoji(trip.type)}</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                {trip.type && (
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent capitalize">{trip.type}</span>
                )}
                <span className="rounded-md bg-background border border-border px-2 py-0.5 text-xs text-muted">{trip.currency}</span>
              </div>
            </div>
          </div>

          {/* ⋮ Menu */}
          <div className="relative group">
            <button className="rounded-lg border border-border p-2 text-muted hover:border-foreground hover:text-foreground transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            <div className="absolute right-0 top-full z-20 mt-1 hidden min-w-[140px] rounded-xl border border-border bg-surface p-1 shadow-lg group-focus-within:block group-hover:block">
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-negative hover:bg-negative/10 transition-colors"
              >
                Delete Trip
              </button>
            </div>
          </div>
        </div>

        {/* Members row */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-2">
            {trip.members.map(m => <Avatar key={m.id} name={m.name} size={28} className="ring-2 ring-surface" />)}
          </div>
          <span className="text-sm text-muted">{trip.members.length} {trip.members.length === 1 ? 'person' : 'people'}</span>
        </div>
      </div>

      {/* Add Expense button */}
      <button
        onClick={() => { setEditingExpense(undefined); setShowExpenseForm(true); }}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Expense
      </button>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl border border-border bg-surface p-1 text-sm font-medium">
        {(['expenses', 'balances', 'activity'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 capitalize transition-colors ${tab === t ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* EXPENSES TAB */}
      {tab === 'expenses' && (
        <div>
          {/* Anomaly banner */}
          {anomalyExpenseId && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Higher than usual</p>
                <p className="text-xs text-muted">This expense is above your average for this category.</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={handleAnomalyConfirm}
                  className="rounded-lg bg-positive/10 px-3 py-1.5 text-xs font-semibold text-positive hover:bg-positive/20 transition-colors"
                >
                  Yes ✓
                </button>
                <button
                  onClick={handleAnomalyEdit}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Spending prediction */}
          {expenses.length >= 2 && (() => {
            const sorted = [...expenses].filter(e => e.date).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
            const firstMs = new Date(sorted[0].date!).getTime();
            const lastMs = new Date(sorted[sorted.length - 1].date!).getTime();
            const daysElapsed = Math.max(1, Math.round((lastMs - firstMs) / 86400000) + 1);
            const total = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
            const dailyAvg = total / daysElapsed;
            const projected30 = total + dailyAvg * 30;
            return (
              <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span>🔮</span>
                  <h4 className="text-sm font-semibold">Spending Prediction</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted">Daily avg</p>
                    <p className="mt-0.5 font-bold">{sym}{dailyAvg.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Days tracked</p>
                    <p className="mt-0.5 font-bold">{daysElapsed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">+30 day proj.</p>
                    <p className="mt-0.5 font-bold">{sym}{projected30.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
              <span className="text-4xl">🧾</span>
              <div>
                <p className="font-semibold">No expenses yet</p>
                <p className="mt-1 text-sm text-muted">Add your first expense to get started.</p>
              </div>
              <button
                onClick={() => { setEditingExpense(undefined); setShowExpenseForm(true); }}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Add first expense
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map(exp => {
                const icon = categoryIcon(exp.category, exp.category_icon);
                const splitCount = exp.splits.length;
                return (
                  <div
                    key={exp.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-2xl">
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight truncate">{exp.title ?? 'Expense'}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        Paid by {exp.paid_by?.name ?? '—'} · {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted">Split {splitCount} {splitCount === 1 ? 'way' : 'ways'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold">{sym}{Number(exp.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => { setEditingExpense(exp); setShowExpenseForm(true); }}
                          className="rounded-md px-2 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteExpenseId(exp.id)}
                          className="rounded-md px-2 py-1 text-xs text-negative hover:bg-negative/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BALANCES TAB */}
      {tab === 'balances' && (
        <div className="flex flex-col gap-6">
          {/* Total */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Total trip spend</p>
            <p className="mt-1 text-3xl font-bold">
              {sym}{Number(trip.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Per-member balances */}
          {balances.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Member Balances</h3>
              {balances.map(b => {
                const isPositive = b.net_balance > 0.01;
                const isNegative = b.net_balance < -0.01;
                return (
                  <div key={b.member_id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                    <Avatar name={b.member?.name ?? '?'} size={36} />
                    <div className="flex-1">
                      <p className="font-medium">{b.member?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted">
                        {isPositive ? 'is owed' : isNegative ? 'owes' : 'settled up'}
                      </p>
                    </div>
                    <span className={`font-bold ${isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-muted'}`}>
                      {isPositive ? '+' : ''}{sym}{Math.abs(b.net_balance).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Who pays whom */}
          {debts.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold">Who Pays Whom</h3>
              <p className="text-sm text-muted">Minimum {debts.length} payment{debts.length !== 1 ? 's' : ''} to settle all debts.</p>
              {debts.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <Avatar name={d.from_member?.name ?? '?'} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span>{d.from_member?.name ?? '?'}</span>
                      <span className="mx-1.5 text-muted">→</span>
                      <span>{d.to_member?.name ?? '?'}</span>
                    </p>
                    <p className="text-xs text-muted">{sym}{Number(d.amount).toFixed(2)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hey ${d.from_member?.name ?? 'there'}! 👋 Just a friendly reminder that you owe me ${sym}${Number(d.amount).toFixed(2)} from "${trip.name}" on SplitWiz. No rush, settle when convenient! 🙏`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-500/20 transition-colors dark:text-green-400"
                    >
                      WhatsApp 💬
                    </a>
                    <button
                      onClick={() => setSettlingDebt(d)}
                      className="rounded-lg bg-positive/10 px-3 py-1.5 text-xs font-semibold text-positive hover:bg-positive/20 transition-colors"
                    >
                      Mark Settled
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {balances.length === 0 && expenses.length === 0 && (
            <p className="text-center text-sm text-muted py-8">Add expenses to see balances.</p>
          )}

          {debts.length === 0 && expenses.length > 0 && (
            <div className="rounded-xl border border-positive/30 bg-positive/5 p-4 text-center">
              <p className="font-semibold text-positive">All settled up! ✅</p>
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY TAB */}
      {tab === 'activity' && (
        <div>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-4xl">📋</span>
              <p className="font-semibold">No activity yet</p>
              <p className="text-sm text-muted">Actions in this trip will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activity.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm">
                    {entry.action_type === 'trip_created' ? '🗺️'
                     : entry.action_type === 'expense_added' ? '💸'
                     : entry.action_type === 'expense_deleted' ? '🗑️'
                     : entry.action_type === 'expense_edited' ? '✏️'
                     : entry.action_type === 'settlement_created' ? '✅'
                     : '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete trip confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-lg">Delete Trip?</h3>
            <p className="mt-2 text-sm text-muted">This will permanently delete &ldquo;{trip.name}&rdquo; and all its expenses. This cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={deleteTrip} className="flex-1 rounded-xl bg-negative py-2.5 text-sm font-semibold text-white hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete expense confirm */}
      {deleteExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-lg">Delete Expense?</h3>
            <p className="mt-2 text-sm text-muted">This expense will be permanently removed.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteExpenseId(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={() => deleteExpense(deleteExpenseId)} className="flex-1 rounded-xl bg-negative py-2.5 text-sm font-semibold text-white hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Settle payment modal */}
      {settlingDebt && (
        <SettlePaymentModal
          debt={settlingDebt}
          currency={trip.currency}
          tripId={id}
          onClose={() => setSettlingDebt(null)}
          onSettled={onSettlementComplete}
          showToast={showToast}
        />
      )}

      {/* Expense form */}
      {showExpenseForm && (
        <TripExpenseForm
          tripId={id}
          tripType={trip.type}
          currency={trip.currency}
          members={trip.members}
          expense={editingExpense}
          onClose={() => { setShowExpenseForm(false); setEditingExpense(undefined); }}
          onSaved={onExpenseSaved}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
