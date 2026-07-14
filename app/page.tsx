"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">💸 Splitwiz</h1>
        <p className="mt-2 text-sm text-muted">
          Split trip expenses with friends and settle up easily.
        </p>
      </header>

      <div className="flex rounded-xl border border-border bg-surface p-1 text-sm font-medium">
        <button
          onClick={() => setMode("create")}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            mode === "create" ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
        >
          Create trip
        </button>
        <button
          onClick={() => setMode("join")}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            mode === "join" ? "bg-accent text-accent-foreground" : "text-muted"
          }`}
        >
          Join trip
        </button>
      </div>

      {mode === "create" ? (
        <CreateTrip onCreated={(code) => router.push(`/trip/${code}`)} />
      ) : (
        <JoinTrip onJoin={(code) => router.push(`/trip/${code}`)} />
      )}
    </main>
  );
}

function CreateTrip({ onCreated }: { onCreated: (code: string) => void }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateMember(i: number, value: string) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? value : m)));
  }
  function addMember() {
    setMembers((prev) => [...prev, ""]);
  }
  function removeMember(i: number) {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError(null);
    const cleanMembers = members.map((m) => m.trim()).filter(Boolean);
    if (!name.trim()) return setError("Give your trip a name");
    if (cleanMembers.length < 2) return setError("Add at least two people");
    setSubmitting(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          currency,
          members: cleanMembers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create trip");
      onCreated(data.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <Field label="Trip name">
        <input
          className={inputClass}
          placeholder="Goa 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Currency">
        <select
          className={inputClass}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="People">
        <div className="flex flex-col gap-2">
          {members.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                placeholder={`Person ${i + 1}`}
                value={m}
                onChange={(e) => updateMember(i, e.target.value)}
              />
              {members.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  className="shrink-0 rounded-lg border border-border px-3 text-muted hover:text-negative"
                  aria-label="Remove person"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="self-start text-sm font-medium text-accent"
          >
            + Add person
          </button>
        </div>
      </Field>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create trip"}
      </button>
    </div>
  );
}

function JoinTrip({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit() {
    setError(null);
    const c = code.trim().toUpperCase();
    if (!c) return setError("Enter a trip code");
    setChecking(true);
    try {
      const res = await fetch(`/api/trips/${c}`);
      if (res.status === 404) throw new Error("No trip with that code");
      if (!res.ok) throw new Error("Could not find trip");
      onJoin(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <Field label="Trip code">
        <input
          className={`${inputClass} text-center text-lg uppercase tracking-[0.3em]`}
          placeholder="ABC123"
          value={code}
          maxLength={10}
          onChange={(e) => setCode(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-negative">{error}</p>}
      <button
        onClick={submit}
        disabled={checking}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-60"
      >
        {checking ? "Finding…" : "Join trip"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
