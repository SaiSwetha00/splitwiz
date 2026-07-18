"use client";

import React, { useState, useRef, useEffect } from "react";
import type { PaymentCard } from "@/types/cards";
import { CARD_GRADIENTS } from "@/types/cards";
import { inputClass } from "@/components/ui";

// ── Network logo components ──────────────────────────────────────────────────

function VisaLogo() {
  return (
    <span
      style={{
        fontFamily: "serif",
        fontWeight: 700,
        fontStyle: "italic",
        fontSize: "1.1rem",
        color: "#fff",
        letterSpacing: "0.05em",
        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      VISA
    </span>
  );
}

function MastercardLogo() {
  return (
    <svg width="36" height="24" viewBox="0 0 36 24" fill="none">
      <circle cx="14" cy="12" r="10" fill="#EB001B" opacity="0.9" />
      <circle cx="22" cy="12" r="10" fill="#F79E1B" opacity="0.9" />
      <path
        d="M18 5.27a10 10 0 0 1 0 13.46A10 10 0 0 1 18 5.27z"
        fill="#FF5F00"
        opacity="0.9"
      />
    </svg>
  );
}

function RuPayLogo() {
  return (
    <span
      style={{
        fontWeight: 700,
        fontSize: "0.85rem",
        color: "#fff",
        letterSpacing: "0.02em",
        background: "linear-gradient(135deg,#f97316,#ef4444)",
        padding: "1px 6px",
        borderRadius: "4px",
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      RuPay
    </span>
  );
}

function NetworkLogo({ cardType }: { cardType: string | null }) {
  if (cardType === "visa") return <VisaLogo />;
  if (cardType === "mastercard") return <MastercardLogo />;
  if (cardType === "rupay") return <RuPayLogo />;
  return null;
}

// ── Card flip face ────────────────────────────────────────────────────────────

function CardFront({ card }: { card: PaymentCard }) {
  const gradient = CARD_GRADIENTS[card.card_color] ?? CARD_GRADIENTS["#1a1a2e"];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        borderRadius: "1rem",
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#fff",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.1rem" }}>
            {card.bank_name ?? "Bank"}
          </div>
          {card.is_default && (
            <span
              style={{
                fontSize: "0.6rem",
                background: "rgba(255,255,255,0.2)",
                padding: "1px 6px",
                borderRadius: "999px",
                letterSpacing: "0.05em",
              }}
            >
              DEFAULT
            </span>
          )}
        </div>
        <NetworkLogo cardType={card.card_type} />
      </div>

      <div
        style={{
          fontFamily: "monospace",
          fontSize: "1.05rem",
          letterSpacing: "0.18em",
          opacity: 0.9,
        }}
      >
        •••• •••• •••• {card.last_4_digits ?? "••••"}
      </div>

      <div style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase" }}>
        {card.card_holder_name}
      </div>
    </div>
  );
}

function CardBack({
  card,
  onSetDefault,
  onDelete,
  saving,
}: {
  card: PaymentCard;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  saving: boolean;
}) {
  const gradient = CARD_GRADIENTS[card.card_color] ?? CARD_GRADIENTS["#1a1a2e"];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        borderRadius: "1rem",
        background: `linear-gradient(135deg, ${gradient.to}, ${gradient.from})`,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#fff",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          opacity: 0.7,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        ••• Security
      </div>

      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          height: "2.2rem",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          paddingLeft: "0.75rem",
          fontSize: "0.7rem",
          opacity: 0.8,
          letterSpacing: "0.08em",
        }}
      >
        Signature Strip
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {!card.is_default && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault(card.id);
            }}
            disabled={saving}
            style={{
              flex: 1,
              fontSize: "0.7rem",
              padding: "0.35rem 0.5rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            Set Default
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          disabled={saving}
          style={{
            flex: 1,
            fontSize: "0.7rem",
            padding: "0.35rem 0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,80,80,0.5)",
            background: "rgba(200,0,0,0.25)",
            color: "#fca5a5",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Add Card Modal ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = Object.keys(CARD_GRADIENTS);

function detectCardType(digits: string): string | null {
  if (digits.startsWith("4")) return "visa";
  if (digits.startsWith("5")) return "mastercard";
  if (digits.startsWith("6")) return "rupay";
  return null;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

type AddCardModalProps = {
  onClose: () => void;
  onAdded: (card: PaymentCard) => void;
};

function AddCardModal({ onClose, onAdded }: AddCardModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiryMM, setExpiryMM] = useState("");
  const [expiryYY, setExpiryYY] = useState("");
  const [cvv, setCvv] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const yyRef = useRef<HTMLInputElement>(null);

  const detectedType = detectCardType(cardNumber.replace(/\s/g, ""));
  const digits = cardNumber.replace(/\s/g, "");

  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    if (formatted.replace(/\s/g, "").length === 16) {
      setTimeout(() => nameRef.current?.focus(), 0);
    }
  }

  function handleMMChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setExpiryMM(val);
    if (val.length === 2) {
      setTimeout(() => yyRef.current?.focus(), 0);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (digits.length !== 16) {
      setError("Card number must be 16 digits.");
      return;
    }
    if (!holderName.trim()) {
      setError("Cardholder name is required.");
      return;
    }
    const mm = parseInt(expiryMM, 10);
    const yy = parseInt(expiryYY, 10);
    if (!expiryMM || mm < 1 || mm > 12) {
      setError("Enter a valid expiry month (01–12).");
      return;
    }
    if (!expiryYY || yy < 25 || yy > 40) {
      setError("Enter a valid expiry year (25–40).");
      return;
    }
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      setError("CVV must be 3 or 4 digits.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_4_digits: digits.slice(-4),
          card_type: detectedType,
          card_holder_name: holderName.trim(),
          bank_name: null,
          card_color: color,
          is_default: isDefault,
          upi_id: null,
        }),
      });
      const data = (await res.json()) as { card?: PaymentCard; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to add card");
        return;
      }
      if (data.card) onAdded(data.card);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "26rem",
          borderRadius: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.5rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Add Payment Card</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              color: "var(--muted)",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Card number */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
              Card Number
            </label>
            <div style={{ position: "relative" }}>
              <input
                className={inputClass}
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                inputMode="numeric"
                autoComplete="cc-number"
                style={{ paddingRight: detectedType ? "4rem" : undefined }}
              />
              {detectedType && (
                <div
                  style={{
                    position: "absolute",
                    right: "0.6rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  {detectedType === "visa" && (
                    <span style={{ fontWeight: 700, fontStyle: "italic", fontSize: "0.85rem", color: "#1a56db" }}>VISA</span>
                  )}
                  {detectedType === "mastercard" && (
                    <svg width="28" height="18" viewBox="0 0 36 24">
                      <circle cx="14" cy="12" r="10" fill="#EB001B" opacity="0.85" />
                      <circle cx="22" cy="12" r="10" fill="#F79E1B" opacity="0.85" />
                    </svg>
                  )}
                  {detectedType === "rupay" && (
                    <span style={{ fontWeight: 700, fontSize: "0.7rem", color: "#f97316" }}>RuPay</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cardholder name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
              Cardholder Name
            </label>
            <input
              ref={nameRef}
              className={inputClass}
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="As on card"
              autoComplete="cc-name"
            />
          </div>

          {/* Expiry + CVV */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                MM
              </label>
              <input
                className={inputClass}
                value={expiryMM}
                onChange={handleMMChange}
                placeholder="MM"
                maxLength={2}
                inputMode="numeric"
                autoComplete="cc-exp-month"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                YY
              </label>
              <input
                ref={yyRef}
                className={inputClass}
                value={expiryYY}
                onChange={(e) => setExpiryYY(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="YY"
                maxLength={2}
                inputMode="numeric"
                autoComplete="cc-exp-year"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                CVV
              </label>
              <input
                className={inputClass}
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="•••"
                maxLength={4}
                inputMode="numeric"
                autoComplete="cc-csc"
              />
            </div>
          </div>

          {/* Color picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
              Card Color
            </label>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {COLOR_OPTIONS.map((c) => {
                const g = CARD_GRADIENTS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={g.name}
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                      border: color === c ? "3px solid var(--accent)" : "3px solid transparent",
                      outline: color === c ? "2px solid var(--accent)" : "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Set as default toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              style={{ accentColor: "var(--accent)", width: "1rem", height: "1rem" }}
            />
            Set as default card
          </label>

          {error && (
            <p style={{ fontSize: "0.8rem", color: "var(--negative)", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                borderRadius: "0.75rem",
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                border: "none",
                padding: "0.6rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Adding..." : "Add Card"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                background: "none",
                color: "var(--muted)",
                padding: "0.6rem 1rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add UPI section ───────────────────────────────────────────────────────────

function UpiSection({ upiCards, onAdded }: { upiCards: PaymentCard[]; onAdded: (c: PaymentCard) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!upiId.trim()) { setError("UPI ID is required"); return; }
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upi_id: upiId.trim(), card_holder_name: name.trim() }),
      });
      const data = (await res.json()) as { card?: PaymentCard; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to add"); return; }
      if (data.card) onAdded(data.card);
      setUpiId("");
      setName("");
      setShowInput(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: "1.15rem" }}>UPI IDs</h2>
        <button
          onClick={() => { setShowInput((v) => !v); setError(""); }}
          style={{
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
            background: "none",
            color: "var(--foreground)",
            padding: "0.4rem 0.85rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showInput ? "Cancel" : "+ Add UPI ID"}
        </button>
      </div>

      {showInput && (
        <form
          onSubmit={handleAdd}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
            marginBottom: "1rem",
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            background: "var(--surface)",
          }}
        >
          <input
            className={inputClass}
            style={{ flex: "1 1 10rem" }}
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
          />
          <input
            className={inputClass}
            style={{ flex: "1 1 8rem" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
          />
          <button
            type="submit"
            disabled={saving}
            style={{
              borderRadius: "0.75rem",
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              border: "none",
              padding: "0.5rem 1.1rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {error && <p style={{ width: "100%", fontSize: "0.78rem", color: "var(--negative)", margin: 0 }}>{error}</p>}
        </form>
      )}

      {upiCards.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 1rem",
            border: "1px dashed var(--border)",
            borderRadius: "1rem",
            color: "var(--muted)",
            fontSize: "0.875rem",
          }}
        >
          No UPI IDs saved yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {upiCards.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                border: "1px solid var(--border)",
                borderRadius: "0.875rem",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#4a0080,#7b2ff7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                ₹
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{c.upi_id}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{c.card_holder_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { initialCards: PaymentCard[] };

export function CardsPageClient({ initialCards }: Props) {
  const [cards, setCards] = useState<PaymentCard[]>(initialCards);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Cards — Splitwiz"; }, []);

  const physicalCards = cards.filter((c) => c.last_4_digits !== null);
  const upiCards = cards.filter((c) => c.upi_id !== null);

  function toggleFlip(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCardAdded(card: PaymentCard) {
    if (card.is_default) {
      setCards((prev) =>
        [card, ...prev.map((c) => ({ ...c, is_default: false }))]
      );
    } else {
      setCards((prev) => [card, ...prev]);
    }
  }

  function handleUpiAdded(card: PaymentCard) {
    setCards((prev) => [card, ...prev]);
  }

  async function handleSetDefault(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (res.ok) {
        setCards((prev) =>
          prev.map((c) => ({ ...c, is_default: c.id === id }))
        );
        setFlipped((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this card?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== id));
        setFlipped((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Inject flip CSS */}
      <style>{`
        .card-scene { perspective: 1000px; }
        .card-flipper {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
          width: 100%;
          height: 180px;
        }
        .card-flipper.flipped { transform: rotateY(180deg); }
      `}</style>

      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.5rem",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Payment Cards
            </h1>
            <p style={{ marginTop: "0.2rem", fontSize: "0.875rem", color: "var(--muted)" }}>
              Click a card to manage it
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              flexShrink: 0,
              borderRadius: "0.875rem",
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              border: "none",
              padding: "0.6rem 1.1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Card
          </button>
        </div>

        {/* Cards grid */}
        {physicalCards.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              padding: "4rem 1rem",
              border: "1.5px dashed var(--border)",
              borderRadius: "1.25rem",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>💳</span>
            <p style={{ fontWeight: 600, color: "var(--foreground)" }}>No cards yet</p>
            <p style={{ fontSize: "0.875rem" }}>Add a card to track payments and set defaults.</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                marginTop: "0.25rem",
                borderRadius: "0.875rem",
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                border: "none",
                padding: "0.55rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Card
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {physicalCards.map((card) => (
              <div
                key={card.id}
                className="card-scene"
                style={{ maxWidth: "320px", cursor: "pointer" }}
                onClick={() => toggleFlip(card.id)}
              >
                <div className={`card-flipper${flipped.has(card.id) ? " flipped" : ""}`}>
                  <CardFront card={card} />
                  <CardBack
                    card={card}
                    onSetDefault={handleSetDefault}
                    onDelete={handleDelete}
                    saving={saving}
                  />
                </div>
              </div>
            ))}

            {/* Add tile */}
            <div
              style={{
                maxWidth: "320px",
                height: "180px",
                border: "1.5px dashed var(--border)",
                borderRadius: "1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                cursor: "pointer",
                color: "var(--muted)",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onClick={() => setShowAddModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setShowAddModal(true)}
            >
              <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Add Card</span>
            </div>
          </div>
        )}

        {/* UPI section */}
        <UpiSection upiCards={upiCards} onAdded={handleUpiAdded} />
      </div>

      {showAddModal && (
        <AddCardModal onClose={() => setShowAddModal(false)} onAdded={handleCardAdded} />
      )}
    </>
  );
}
