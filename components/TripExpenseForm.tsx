'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TripMember, TripExpense, SplitType, ExpenseCategoryKey } from '@/types/trips';
import { EXPENSE_CATEGORIES, TRIP_SUGGESTIONS } from '@/types/trips';
import { ReceiptScanner } from './ReceiptScanner';
import type { ScannedData } from './ReceiptScanner';
import { autoDetectCategory } from '@/lib/auto-categorize';
import { currencySymbol } from '@/lib/money';
import { Avatar } from '@/components/Avatar';

interface Split {
  member_id: string;
  amount: number;
}

interface Props {
  tripId: string;
  tripType: string | null;
  currency: string;
  members: TripMember[];
  expense?: TripExpense;
  onClose: () => void;
  onSaved: (anomaly?: boolean, wasEditing?: boolean, savedId?: string) => void;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function TripExpenseForm({ tripId, tripType, currency, members, expense, onClose, onSaved }: Props) {
  const editing = !!expense;
  const amountRef = useRef<HTMLInputElement>(null);
  const sym = currencySymbol(currency);

  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : '');
  const [category, setCategory] = useState<ExpenseCategoryKey | string>(expense?.category ?? '');
  const [categoryIcon, setCategoryIcon] = useState(expense?.category_icon ?? '');
  const [paidBy, setPaidBy] = useState(expense?.paid_by_member_id ?? members[0]?.id ?? '');
  const [date, setDate] = useState(expense?.date ?? todayStr());
  const [note, setNote] = useState(expense?.note ?? '');
  const [showDetails, setShowDetails] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set(expense ? expense.splits.map(s => s.member_id) : members.map(m => m.id))
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    if (expense && expense.splits.length > 0) {
      return Object.fromEntries(expense.splits.map(s => [s.member_id, String(s.amount)]));
    }
    return {};
  });
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState<{ key: string; icon: string } | null>(null);
  const [scannedItems, setScannedItems] = useState<{ name: string; price: number }[]>([]);

  const suggestions = TRIP_SUGGESTIONS[tripType ?? ''] ?? [];

  useEffect(() => { amountRef.current?.focus(); }, []);

  // Dismiss on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-detect category from title (300ms debounce)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- short-circuit clear before the debounce timer is necessary here
    if (title.length < 2) { setDetectedCategory(''); return; }
    const t = setTimeout(() => {
      const result = autoDetectCategory(title);
      if (result.confidence > 0) setDetectedCategory(result.icon);
    }, 300);
    return () => clearTimeout(t);
  }, [title]);

  // AI-assisted category detection (fallback when local confidence < 0.8)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset suggestion on title change is necessary here
    setSuggestedCategory(null);
    if (title.length < 3) return;
    const local = autoDetectCategory(title);
    if (local.confidence >= 0.8) return;
    const t = setTimeout(() => {
      const catKeys = EXPENSE_CATEGORIES.map(c => c.key);
      fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: title, categories: catKeys }),
      })
        .then(r => r.json())
        .then((d: { category: string | null }) => {
          if (d.category) {
            const match = EXPENSE_CATEGORIES.find(c => c.key === d.category);
            if (match) {
              setSuggestedCategory({ key: match.key, icon: match.icon });
              setCategory(prev => (prev === '' ? match.key : prev));
              setCategoryIcon(prev => (prev === '' ? match.icon : prev));
            }
          }
        })
        .catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [title]);

  const numAmount = parseFloat(amount) || 0;
  const selectedIds = members.map(m => m.id).filter(id => selectedMembers.has(id));

  const equalPerPerson = selectedIds.length > 0 ? numAmount / selectedIds.length : 0;

  const exactTotal = selectedIds.reduce((sum, id) => sum + (parseFloat(exactAmounts[id] ?? '0') || 0), 0);
  const exactRemaining = numAmount - exactTotal;

  const pctTotal = selectedIds.reduce((sum, id) => sum + (parseFloat(percentages[id] ?? '0') || 0), 0);
  const pctRemaining = 100 - pctTotal;

  const computedSplits: Split[] = useMemo(() => {
    if (splitType === 'equal') {
      const base = Math.floor((numAmount / selectedIds.length) * 100) / 100;
      const remainder = Math.round((numAmount - base * selectedIds.length) * 100) / 100;
      return selectedIds.map((id, i) => ({ member_id: id, amount: i === 0 ? base + remainder : base }));
    }
    if (splitType === 'exact') {
      return selectedIds.map(id => ({ member_id: id, amount: parseFloat(exactAmounts[id] ?? '0') || 0 }));
    }
    // percentage
    return selectedIds.map(id => {
      const pct = parseFloat(percentages[id] ?? '0') || 0;
      return { member_id: id, amount: Math.round(numAmount * pct) / 100 };
    });
  }, [splitType, numAmount, selectedIds, exactAmounts, percentages]);

  function toggleMember(id: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function pickCategory(key: string, icon: string) {
    setCategory(key);
    setCategoryIcon(icon);
    setDetectedCategory('');
    setSuggestedCategory(null);
  }

  function handleScanned(data: ScannedData) {
    if (data.merchant) setTitle(data.merchant);
    if (data.amount != null && data.amount > 0) setAmount(String(data.amount));
    if (data.date) setDate(data.date);
    if (data.items && data.items.length > 0) setScannedItems(data.items);
    if (data.category) {
      const match = EXPENSE_CATEGORIES.find(
        (c) => c.key.toLowerCase() === data.category!.toLowerCase()
      );
      if (match) pickCategory(match.key, match.icon);
    }
  }

  async function submit() {
    setError(null);
    if (!title.trim()) return setError('Title is required');
    if (!numAmount || numAmount <= 0) return setError('Enter an amount greater than 0');
    if (selectedIds.length === 0) return setError('Select at least one member in the split');
    if (splitType === 'exact' && Math.abs(exactRemaining) > 0.01) {
      return setError(`Amounts don't add up — ${exactRemaining > 0 ? `${sym}${exactRemaining.toFixed(2)} remaining` : `${sym}${Math.abs(exactRemaining).toFixed(2)} over`}`);
    }
    if (splitType === 'percentage' && Math.abs(pctRemaining) > 0.1) {
      return setError(`Percentages must total 100% — ${pctRemaining > 0 ? `${pctRemaining.toFixed(1)}% remaining` : `${Math.abs(pctRemaining).toFixed(1)}% over`}`);
    }

    const finalCategory = category || (detectedCategory ? autoDetectCategory(title).category : null);
    const finalIcon = categoryIcon || detectedCategory || null;

    setSaving(true);
    try {
      const url = editing
        ? `/api/trips2/${tripId}/expenses/${expense!.id}`
        : `/api/trips2/${tripId}/expenses`;
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: numAmount,
          category: finalCategory,
          category_icon: finalIcon,
          paid_by_member_id: paidBy,
          date,
          note: note.trim() || null,
          splits: computedSplits,
        }),
      });
      const data = await res.json() as { id?: string; anomaly?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save expense');
      onSaved(data.anomaly, editing, data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div
        className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2 className="text-lg font-semibold">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* Amount — large, autofocused */}
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-background p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Amount</span>
            <div className="flex items-center gap-1">
              <span className="text-3xl font-bold text-muted">{sym}</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-40 bg-transparent text-center text-4xl font-bold text-foreground outline-none placeholder:text-border"
              />
            </div>
            {numAmount > 0 && selectedIds.length > 0 && splitType === 'equal' && (
              <p className="text-sm text-muted">
                {sym}{equalPerPerson.toFixed(2)} each
              </p>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">What for?</span>
              <ReceiptScanner onScanned={handleScanned} />
            </div>
            <div className="relative flex items-center">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm outline-none focus:border-accent transition-colors"
                placeholder="Dinner, taxi, hotel…"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              {detectedCategory && (
                <span className="absolute right-2 text-lg">{detectedCategory}</span>
              )}
            </div>
            {suggestedCategory && (
              <p className="flex items-center gap-1 text-xs text-accent">
                <span>✨</span>
                <span>AI detected: {suggestedCategory.icon} {suggestedCategory.key}</span>
              </p>
            )}
            {/* Scanned receipt items */}
            {scannedItems.length > 0 && (
              <div className="mt-1 rounded-xl border border-border bg-background p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Receipt items</p>
                <ul className="flex flex-col gap-1">
                  {scannedItems.map((item, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{item.name}</span>
                      <span className="tabular-nums text-muted">{sym}{item.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setScannedItems([])}
                  className="mt-2 text-[11px] text-muted hover:text-foreground"
                >
                  Clear items
                </button>
              </div>
            )}
            {/* Suggestions */}
            {suggestions.length > 0 && !title && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTitle(s)}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Category</span>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => pickCategory(cat.key, cat.icon)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition-all ${
                      isSelected ? 'border-accent bg-accent/10 font-semibold text-accent' : 'border-border text-muted hover:border-accent/40'
                    }`}
                    style={isSelected ? { borderColor: cat.color, backgroundColor: `${cat.color}18`, color: cat.color } : {}}
                  >
                    <span className="text-xl leading-none">{cat.icon}</span>
                    <span className="leading-tight text-center" style={{ fontSize: 10 }}>{cat.key.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid by */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Who paid?</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidBy(m.id)}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                    paidBy === m.id ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40'
                  }`}
                >
                  <Avatar name={m.name} size={32} />
                  <span className="text-xs max-w-[60px] truncate">{m.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Split with?</span>
              <div className="flex rounded-lg border border-border p-0.5 text-xs font-medium">
                {(['equal', 'exact', 'percentage'] as SplitType[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSplitType(st)}
                    className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                      splitType === st ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {st === 'percentage' ? '%' : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {members.map(m => {
                const isOn = selectedMembers.has(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`h-5 w-5 shrink-0 rounded-md border-2 transition-colors ${isOn ? 'border-accent bg-accent' : 'border-border'}`}
                    >
                      {isOn && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" className="m-auto">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                        </svg>
                      )}
                    </button>
                    <Avatar name={m.name} size={24} />
                    <span className="flex-1 text-sm">{m.name}</span>
                    {isOn && splitType === 'equal' && numAmount > 0 && (
                      <span className="text-sm text-muted">{sym}{equalPerPerson.toFixed(2)}</span>
                    )}
                    {isOn && splitType === 'exact' && (
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={exactAmounts[m.id] ?? ''}
                        onChange={e => setExactAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                        className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-accent"
                      />
                    )}
                    {isOn && splitType === 'percentage' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="0"
                          value={percentages[m.id] ?? ''}
                          onChange={e => setPercentages(prev => ({ ...prev, [m.id]: e.target.value }))}
                          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-accent"
                        />
                        <span className="text-sm text-muted">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {splitType === 'exact' && numAmount > 0 && (
              <p className={`text-sm ${Math.abs(exactRemaining) < 0.01 ? 'text-positive' : 'text-negative'}`}>
                {Math.abs(exactRemaining) < 0.01 ? '✓ Balanced' : `${sym}${Math.abs(exactRemaining).toFixed(2)} ${exactRemaining > 0 ? 'remaining' : 'over'}`}
              </p>
            )}
            {splitType === 'percentage' && (
              <p className={`text-sm ${Math.abs(pctRemaining) < 0.1 ? 'text-positive' : 'text-negative'}`}>
                {Math.abs(pctRemaining) < 0.1 ? '✓ 100%' : `${pctRemaining > 0 ? pctRemaining.toFixed(1) + '% remaining' : Math.abs(pctRemaining).toFixed(1) + '% over'}`}
              </p>
            )}
          </div>

          {/* Date */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </label>

          {/* Add Details (collapsed) */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showDetails ? 'rotate-90' : ''}`}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              {showDetails ? 'Hide' : 'Add'} details
            </button>
            {showDetails && (
              <div className="mt-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Note</span>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="Optional note…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim() || !numAmount}
            className="w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Saving…
              </span>
            ) : editing ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
