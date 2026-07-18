'use client';

import { useEffect, useState } from 'react';
import type { DebtSimplification, TripMember } from '@/types/trips';
import { currencySymbol } from '@/lib/money';

type PaymentMethod = 'cash' | 'upi' | 'online' | 'bank' | 'card';

interface SavedCard {
  id: string;
  last_4_digits: string | null;
  card_holder_name: string;
  card_type: string | null;
  is_default: boolean;
}

interface Props {
  debt: DebtSimplification;
  currency: string;
  tripId: string;
  onClose: () => void;
  onSettled: () => void;
  showToast: (msg: string) => void;
}

const METHOD_OPTIONS: { key: PaymentMethod; emoji: string; label: string; desc: string }[] = [
  { key: 'cash',   emoji: '💵', label: 'Cash',          desc: 'Settled in person' },
  { key: 'upi',    emoji: '📱', label: 'UPI',           desc: 'Google Pay, PhonePe, Paytm…' },
  { key: 'online', emoji: '💳', label: 'Pay Online',    desc: 'Razorpay — cards & more' },
  { key: 'bank',   emoji: '🏦', label: 'Bank Transfer', desc: 'NEFT / IMPS / RTGS' },
];

function paidByName(debt: DebtSimplification): string {
  return debt.from_member?.name ?? 'Someone';
}
function paidToName(debt: DebtSimplification): string {
  return debt.to_member?.name ?? 'Someone';
}

function memberInitials(m: TripMember | undefined): string {
  if (!m) return '?';
  const parts = m.name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ConfettiCanvas({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${((i * 137.5) % 100).toFixed(1)}%`,
    delay: `${((i * 0.08) % 0.8).toFixed(2)}s`,
    color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'][i % 5],
    size: 6 + (i % 6),
  }));

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          top: 0;
          animation: confetti-fall 1.2s ease-in forwards;
          border-radius: 2px;
        }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit' }}>
        {pieces.map(p => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export function SettlePaymentModal({ debt, currency, tripId, onClose, onSettled, showToast }: Props) {
  const sym = currencySymbol(currency);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load saved cards when method = 'card'
  useEffect(() => {
    if (method !== 'card') return;
    fetch('/api/cards')
      .then(r => r.json())
      .then((d: { cards?: SavedCard[] }) => {
        const cards = d.cards ?? [];
        setSavedCards(cards);
        const def = cards.find(c => c.is_default);
        if (def) setSelectedCardId(def.id);
        else if (cards.length > 0) setSelectedCardId(cards[0].id);
      })
      .catch(() => undefined);
  }, [method]);

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.head.appendChild(s);
    });
  }

  async function handleOnlinePayment() {
    setSaving(true);
    try {
      // Create settlement record first
      const settlementRes = await fetch(`/api/trips2/${tripId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_member_id: debt.from_member_id,
          to_member_id: debt.to_member_id,
          amount: debt.amount,
          method: 'online',
        }),
      });
      if (!settlementRes.ok) {
        const d = await settlementRes.json() as { error?: string };
        showToast(d.error ?? 'Failed to create settlement'); return;
      }
      const { id: settlementId } = await settlementRes.json() as { id: string };

      // Create Razorpay order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: debt.amount, currency: 'INR', settlementId }),
      });
      if (!orderRes.ok) {
        const d = await orderRes.json() as { error?: string };
        showToast(d.error ?? 'Payment service unavailable'); return;
      }
      const order = await orderRes.json() as { orderId: string; amount: number; currency: string; keyId: string };

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SplitWiz',
        description: 'Settlement Payment',
        order_id: order.orderId,
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...resp, settlementId }),
          });
          if (verifyRes.ok) {
            setDone(true);
            setTimeout(() => { onSettled(); onClose(); }, 1800);
          } else {
            showToast('Payment verification failed');
          }
        },
        prefill: { name: debt.from_member?.name ?? '' },
        theme: { color: '#6366f1' },
        modal: { ondismiss: () => setSaving(false) },
      });
      rzp.open();
    } catch {
      showToast('Payment failed. Please try again.');
      setSaving(false);
    }
  }

  async function confirm() {
    if (method === 'online') { await handleOnlinePayment(); return; }
    setSaving(true);
    try {
      const note = reference.trim() || null;
      const paymentCardId = method === 'card' && selectedCardId ? selectedCardId : null;

      const res = await fetch(`/api/trips2/${tripId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_member_id: debt.from_member_id,
          to_member_id: debt.to_member_id,
          amount: debt.amount,
          method,
          note,
          payment_card_id: paymentCardId,
        }),
      });

      if (!res.ok) {
        const d = await res.json() as { error?: string };
        showToast(d.error ?? 'Failed to record settlement');
        return;
      }

      setDone(true);
      setTimeout(() => {
        onSettled();
        onClose();
      }, 1800);
    } finally {
      setSaving(false);
    }
  }

  const fromName = paidByName(debt);
  const toName   = paidToName(debt);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', width: '100%', maxWidth: '26rem', borderRadius: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <ConfettiCanvas show={done} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem', lineHeight: 1 }}>🎉</div>
            <p style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '1.1rem' }}>Settled!</p>
            <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
              {fromName} paid {toName} {sym}{Number(debt.amount).toFixed(2)}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                How did {fromName} pay?
              </h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>

            {/* Amount summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', borderRadius: '0.875rem', background: 'var(--background)', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                {memberInitials(debt.from_member)}
              </div>
              <div style={{ flex: 1, fontSize: '0.875rem' }}>
                <strong>{fromName}</strong> → <strong>{toName}</strong>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--positive)' }}>
                {sym}{Number(debt.amount).toFixed(2)}
              </span>
            </div>

            {/* Method selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {METHOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMethod(opt.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '0.875rem',
                    border: method === opt.key ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: method === opt.key ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--background)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.12s, background 0.12s',
                  }}
                >
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{opt.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: method === opt.key ? 'var(--accent)' : 'var(--foreground)' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Method-specific input */}
            {method === 'upi' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
                  UPI Transaction ID (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                  placeholder="e.g. 123456789012"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                />
              </div>
            )}

            {method === 'bank' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Reference Number (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                  placeholder="e.g. NEFT/IMPS ref"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                />
              </div>
            )}

            {method === 'card' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Card Used
                </label>
                {savedCards.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No saved cards — <a href="/dashboard/cards" style={{ color: 'var(--accent)' }}>add one</a></p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {savedCards.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCardId(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '0.75rem',
                          border: selectedCardId === c.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: selectedCardId === c.id ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--background)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>💳</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          •••• {c.last_4_digits} &nbsp;
                          <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{c.card_holder_name}</span>
                        </span>
                        {c.is_default && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'var(--accent)', color: 'var(--accent-foreground)', padding: '1px 6px', borderRadius: '999px' }}>Default</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Confirm / Cancel */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => void confirm()}
                disabled={saving}
                style={{
                  flex: 1,
                  borderRadius: '0.875rem',
                  background: 'var(--positive)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.65rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving ? 'Recording…' : 'Confirm Settlement'}
              </button>
              <button
                onClick={onClose}
                style={{
                  borderRadius: '0.875rem',
                  border: '1px solid var(--border)',
                  background: 'none',
                  color: 'var(--muted)',
                  padding: '0.65rem 1rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
