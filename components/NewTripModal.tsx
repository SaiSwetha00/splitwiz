'use client';

import { useEffect, useRef, useState } from 'react';
import { TRIP_TYPES, type TripType } from '@/types/trips';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import { inputClass } from '@/components/ui';

interface Props {
  defaultCurrency: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function NewTripModal({ defaultCurrency, onClose, onCreated }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<TripType | ''>('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { nameRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function addMember() {
    const n = memberInput.trim();
    if (!n || members.includes(n)) { setMemberInput(''); return; }
    setMembers(prev => [...prev, n]);
    setMemberInput('');
  }

  function removeMember(name: string) {
    setMembers(prev => prev.filter(m => m !== name));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) return setError('Trip name is required');
    if (!type) return setError('Select a trip type');

    setSubmitting(true);
    try {
      const res = await fetch('/api/trips2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type, currency, description: description.trim() || null, members }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create trip');
      onCreated(data.id!);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">New Trip</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Trip name *</span>
            <input
              ref={nameRef}
              className={inputClass}
              placeholder="e.g. Goa 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </label>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Trip type *</span>
            <div className="grid grid-cols-3 gap-2">
              {TRIP_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-all ${
                    type === t.value
                      ? 'border-accent bg-accent/10 font-semibold text-accent'
                      : 'border-border text-muted hover:border-accent/50'
                  }`}
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Currency</span>
            <select className={inputClass} value={currency} onChange={e => setCurrency(e.target.value)}>
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Description <span className="normal-case font-normal">(optional)</span></span>
            <input
              className={inputClass}
              placeholder="What's this trip about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>

          {/* Members */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Add members <span className="normal-case font-normal">(optional — you&apos;re auto-added)</span></span>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Member name"
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); } }}
              />
              <button
                type="button"
                onClick={addMember}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-accent hover:border-accent transition-colors"
              >
                Add
              </button>
            </div>
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <span
                    key={m}
                    className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() => removeMember(m)}
                      className="ml-0.5 text-accent/60 hover:text-accent transition-colors"
                      aria-label={`Remove ${m}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted transition-colors hover:border-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create Trip 🎉'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
