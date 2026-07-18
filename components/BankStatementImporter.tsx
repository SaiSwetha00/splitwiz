'use client';

import { useRef, useState } from 'react';

type ParsedTx = {
  date: string;
  description: string;
  amount: number;
  category: string;
  selected: boolean;
};

type Trip = { id: string; name: string };

interface Props {
  onClose: () => void;
  trips: Trip[];
}

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Travel', 'Education', 'Other'];
const SUPPORTED_BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak'];

type Step = 'upload' | 'processing' | 'review' | 'destination' | 'importing' | 'done';

export function BankStatementImporter({ onClose, trips }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState('');
  const [txns, setTxns] = useState<ParsedTx[]>([]);
  const [destTripId, setDestTripId] = useState<string>('personal');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [skipped, setSkipped] = useState(0);

  const selected = txns.filter(t => t.selected);

  async function handleFile(file: File) {
    setError('');
    setStep('processing');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/import/bank-statement', { method: 'POST', body: fd });
      const data = await res.json() as { transactions?: ParsedTx[]; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to parse statement'); setStep('upload'); return; }
      setTxns((data.transactions ?? []).map(t => ({ ...t, selected: true })));
      setStep('review');
    } catch {
      setError('Network error. Please try again.');
      setStep('upload');
    }
  }

  async function doImport() {
    const items = txns.filter(t => t.selected);
    if (!items.length) return;
    setProgress({ done: 0, total: items.length });
    setStep('importing');
    let skippedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      try {
        let res: Response;
        if (destTripId !== 'personal') {
          res = await fetch(`/api/trips2/${destTripId}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: t.description, amount: t.amount, category: t.category.toLowerCase(), date: t.date, split_type: 'equal', splits: [] }),
          });
        } else {
          res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'expense', amount: t.amount, currency: 'INR', description: t.description, status: 'completed' }),
          });
        }
        if (!res.ok) skippedCount++;
      } catch { skippedCount++; }
      setProgress({ done: i + 1, total: items.length });
    }

    setSkipped(skippedCount);
    setStep('done');
  }

  function updateCategory(i: number, cat: string) {
    setTxns(prev => prev.map((t, idx) => idx === i ? { ...t, category: cat } : t));
  }

  function toggleRow(i: number) {
    setTxns(prev => prev.map((t, idx) => idx === i ? { ...t, selected: !t.selected } : t));
  }

  function toggleAll() {
    const allSelected = txns.every(t => t.selected);
    setTxns(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ position: 'relative', width: '100%', maxWidth: step === 'review' ? '52rem' : '28rem', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Import Bank Statement</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>PDF → AI-parsed transactions</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem', background: '#fef2f2', padding: '0.6rem 0.75rem', borderRadius: '0.5rem' }}>{error}</p>}
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: '1rem', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f); }}
            >
              <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>📄</p>
              <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>Drop your bank statement PDF</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>or click to browse</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: 0 }}>Supported: {SUPPORTED_BANKS.join(' · ')}</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Reading your statement...</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Extracting transactions with AI</p>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '99px', width: '60%', animation: 'pulse 1.2s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--foreground)' }}>{selected.length}</strong> of {txns.length} selected · ₹{selected.reduce((s, t) => s + t.amount, 0).toFixed(0)} total
              </p>
              <button onClick={toggleAll} style={{ fontSize: '0.75rem', background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                {txns.every(t => t.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', width: 28 }}>☑</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: t.selected ? 1 : 0.45 }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <input type="checkbox" checked={t.selected} onChange={() => toggleRow(i)} />
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td style={{ padding: '0.4rem 0.5rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>₹{t.amount.toFixed(0)}</td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select value={t.category} onChange={e => updateCategory(i, e.target.value)} style={{ fontSize: '0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.4rem', padding: '0.2rem 0.4rem', color: 'var(--foreground)' }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setStep('destination')}
              disabled={selected.length === 0}
              style={{ width: '100%', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', borderRadius: '0.875rem', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 700, cursor: selected.length === 0 ? 'not-allowed' : 'pointer', opacity: selected.length === 0 ? 0.5 : 1 }}
            >
              Continue with {selected.length} transactions →
            </button>
          </div>
        )}

        {/* Step: Destination */}
        {step === 'destination' && (
          <div>
            <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>Import to:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: destTripId === 'personal' ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '0.75rem', cursor: 'pointer' }}>
                <input type="radio" name="dest" value="personal" checked={destTripId === 'personal'} onChange={() => setDestTripId('personal')} />
                <span>Personal expenses</span>
              </label>
              {trips.map(trip => (
                <label key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: destTripId === trip.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '0.75rem', cursor: 'pointer' }}>
                  <input type="radio" name="dest" value={trip.id} checked={destTripId === trip.id} onChange={() => setDestTripId(trip.id)} />
                  <span>{trip.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => void doImport()} style={{ width: '100%', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', borderRadius: '0.875rem', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
              Import {selected.length} transactions
            </button>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Importing {progress.done}/{progress.total}...</p>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '99px', transition: 'width 0.2s', width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>✅</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.25rem' }}>
              {progress.total - skipped} imported{skipped > 0 ? `, ${skipped} skipped` : ''}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 1.25rem' }}>Transactions added successfully</p>
            <button onClick={onClose} style={{ background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', borderRadius: '0.875rem', padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
