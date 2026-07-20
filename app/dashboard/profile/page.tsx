"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/lib/money";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  stats: { trips: number; expenses: number; members: number; savedCents: number };
  settings: { default_currency: string; theme: string } | null;
  userMeta: Record<string, unknown>;
  email: string;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const THEMES = [
  { value: "system", label: "System" },
  { value: "light",  label: "Light"  },
  { value: "dark",   label: "Dark"   },
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY"];

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Colombo", "Asia/Dhaka", "Asia/Karachi",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Africa/Nairobi", "Pacific/Auckland", "Australia/Sydney",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStr(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  return typeof v === "string" ? v : "";
}

function applyTheme(value: string) {
  const root = document.documentElement;
  if (value === "light" || value === "dark") root.dataset.theme = value;
  else delete root.dataset.theme;
}

function localTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "Asia/Kolkata"; }
}

// ─── Avatar Component ─────────────────────────────────────────────────────────

function AvatarCircle({ url, name, size }: { url: string | null; name: string; size: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white select-none"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      }}
    >
      {initial}
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  email,
  onClose,
  onDeleted,
}: {
  email: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setErr("");
    try {
      const res = await fetch("/api/profile/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-bold text-negative">Delete Account</h2>
        <p className="mt-2 text-sm text-muted">
          This will permanently delete all your data — trips, expenses, subscriptions, savings goals, and your account.
          <strong className="text-foreground"> This cannot be undone.</strong>
        </p>
        <p className="mt-4 text-xs text-muted">Deleting account for: <strong className="text-foreground">{email}</strong></p>
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-muted">Type DELETE to confirm</label>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="rounded-lg border border-negative/40 bg-background px-3 py-2 text-sm font-mono focus:border-negative focus:outline-none"
            autoFocus
          />
        </div>
        {err && <p className="mt-3 text-xs text-negative">{err}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:border-accent">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirm !== "DELETE" || deleting}
            className="flex-1 rounded-xl border border-negative bg-negative/10 py-2.5 text-sm font-semibold text-negative hover:bg-negative/20 disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete My Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Core data ──
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Avatar ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ── Name inline edit ──
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameOk, setNameOk] = useState(false);

  // ── Personal info ──
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState(localTz());
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoOk, setInfoOk] = useState(false);

  // ── Preferences ──
  const [currency, setCurrency] = useState("INR");
  const [theme, setTheme] = useState("system");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsOk, setPrefsOk] = useState(false);

  // ── Security ──
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [signOutOthersDone, setSignOutOthersDone] = useState(false);

  // ── Export / Delete ──
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Load data ──
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const d = await res.json() as ProfileData;
      setData(d);
      setNameInput(getStr(d.userMeta, "full_name") || getStr(d.userMeta, "display_name") || getStr(d.userMeta, "name"));
      setCurrency(d.settings?.default_currency ?? "INR");
      setTheme(d.settings?.theme ?? "system");
      setPhone(getStr(d.userMeta, "phone"));
      setTimezone(getStr(d.userMeta, "timezone") || localTz());
      setDateFormat(getStr(d.userMeta, "date_format") || "DD/MM/YYYY");
      // Avatar: uploaded > Google OAuth > none
      const av = getStr(d.userMeta, "avatar_url") || getStr(d.userMeta, "picture");
      if (av) setAvatarUrl(av);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLoading(true));
    void loadProfile();
    return () => cancelAnimationFrame(frame);
  }, [loadProfile]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Avatar upload ──
  async function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) { showToast("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB"); return; }
    // Optimistic preview
    setAvatarUrl(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setAvatarUrl(url);
    } catch {
      // revert on error
      const fallback = getStr(data?.userMeta ?? {}, "avatar_url") || getStr(data?.userMeta ?? {}, "picture");
      setAvatarUrl(fallback || null);
      showToast("Upload failed. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Save name ──
  async function saveName() {
    if (!nameInput.trim()) { setEditingName(false); return; }
    setNameSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: nameInput.trim() }),
      });
      setNameOk(true);
      setTimeout(() => setNameOk(false), 2000);
    } finally {
      setNameSaving(false);
      setEditingName(false);
    }
  }

  // ── Save personal info ──
  async function saveInfo() {
    setSavingInfo(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, timezone, date_format: dateFormat }),
      });
      setInfoOk(true);
      setTimeout(() => setInfoOk(false), 2000);
    } finally {
      setSavingInfo(false);
    }
  }

  // ── Save preferences ──
  async function savePref(field: "default_currency" | "theme", value: string) {
    setSavingPrefs(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (field === "theme") applyTheme(value);
      setPrefsOk(true);
      setTimeout(() => setPrefsOk(false), 1500);
    } finally {
      setSavingPrefs(false);
    }
  }

  // ── Send password reset ──
  async function sendReset() {
    setResetLoading(true);
    try {
      await fetch("/api/profile/reset-password", { method: "POST" });
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  }

  // ── Sign out other devices ──
  async function signOutOthers() {
    // Call the settings PATCH or a direct signout (no separate endpoint needed — uses same session)
    try {
      await fetch("/api/auth/signout-others", { method: "POST" }).catch(() => null);
      setSignOutOthersDone(true);
    } catch { /* graceful fail */ }
  }

  // ── Export data ──
  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/profile/export");
      if (!res.ok) throw new Error("Export failed");
      const json = await res.json() as Record<string, unknown>;
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `splitwiz-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exported successfully");
    } catch {
      showToast("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  // ── Display values ──
  const displayName = nameInput || data?.email?.split("@")[0] || "User";
  const email = data?.email ?? "";
  const isPremium = getStr(data?.userMeta ?? {}, "plan") === "premium";
  const stats = data?.stats;
  const savedStr = stats ? formatMoney(stats.savedCents, currency) : "₹0";
  const memberSince = data?.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "";

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="h-32 rounded-2xl bg-surface border border-border" />
          <div className="h-16 rounded-2xl bg-surface border border-border" />
          {[0,1,2,3,4].map(i => <div key={i} className="h-40 rounded-2xl bg-surface border border-border" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-surface border border-border px-5 py-3 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* ── Delete modal ── */}
      {showDelete && (
        <DeleteModal
          email={email}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.push("/login?deleted=1")}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-sm text-muted">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* ─── Top section: Avatar + Name + Badge ─── */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative block"
                title="Change photo"
                disabled={avatarUploading}
                style={{ borderRadius: "50%", boxShadow: "0 0 0 3px rgba(69,216,129,0.3), 0 0 18px rgba(69,216,129,0.15)" }}
              >
                <AvatarCircle url={avatarUrl} name={displayName} size={88} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  {avatarUploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  )}
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleAvatarFile(f); e.target.value = ""; }}
              />
            </div>

            {/* Name + email + badge */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onBlur={() => void saveName()}
                    onKeyDown={e => { if (e.key === "Enter") void saveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="rounded-lg border border-accent bg-background px-2 py-1 text-xl font-bold focus:outline-none"
                    style={{ maxWidth: 220 }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="group flex items-center gap-1.5 text-xl font-bold hover:text-accent transition"
                    title="Click to edit name"
                  >
                    <span className="truncate">{displayName}</span>
                    <svg className="shrink-0 opacity-0 group-hover:opacity-60 transition" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {nameSaving && <span className="text-xs text-muted animate-pulse">Saving…</span>}
                {nameOk && <span className="text-xs text-positive">✓ Saved</span>}
              </div>
              <p className="mt-0.5 text-sm text-muted truncate">{email}</p>
              <span
                className="mt-2 inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold"
                style={isPremium
                  ? { background: "rgba(245,158,11,0.12)", color: "#F59E0B" }
                  : { background: "rgba(255,255,255,0.06)", color: "#94a3b8" }
                }
              >
                {isPremium ? "👑 Premium Member" : "Free Plan"}
              </span>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                { label: "Trips", value: String(stats.trips) },
                { label: "Expenses", value: String(stats.expenses) },
                { label: "Members", value: String(stats.members) },
                { label: "Saved", value: savedStr },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center rounded-xl border border-border bg-background px-2 py-2.5 text-center">
                  <span className="text-base font-bold tabular-nums">{s.value}</span>
                  <span className="mt-0.5 text-[10px] text-muted uppercase tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Card 1: Personal Information ─── */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Personal Information</h2>
          <div className="flex flex-col gap-4">
            <Field label="Full Name">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Your name"
                className="input"
              />
            </Field>
            <Field label="Email" hint="Contact support to change your email">
              <input value={email} disabled className="input opacity-50 cursor-not-allowed" />
            </Field>
            <Field label="Phone Number (optional)">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                className="input"
              />
            </Field>
            <Field label="Timezone">
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="input"
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Date Format">
              <div className="flex gap-2">
                {DATE_FORMATS.map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setDateFormat(fmt)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                      dateFormat === fmt
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {infoOk && <span className="text-xs text-positive">✓ Saved</span>}
            <button
              onClick={() => void saveInfo()}
              disabled={savingInfo}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {savingInfo ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </section>

        {/* ─── Card 2: Preferences ─── */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Preferences</h2>
            {prefsOk && <span className="text-xs text-positive">✓ Saved</span>}
            {savingPrefs && <span className="text-xs text-muted animate-pulse">Saving…</span>}
          </div>
          <p className="mb-4 text-xs text-muted">Changes apply instantly</p>
          <div className="flex flex-col gap-4">
            <Field label="Default Currency">
              <select
                value={currency}
                onChange={e => { setCurrency(e.target.value); void savePref("default_currency", e.target.value); }}
                className="input"
              >
                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select disabled className="input opacity-50 cursor-not-allowed">
                <option>English</option>
              </select>
              <p className="mt-1 text-xs text-muted">More languages coming soon</p>
            </Field>
            <Field label="Theme">
              <div className="flex gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setTheme(t.value); void savePref("theme", t.value); }}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                      theme === t.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* ─── Card 3: Security ─── */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Security</h2>

          {/* Password */}
          <div className="mb-4 rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Change Password</p>
            <p className="mt-0.5 text-xs text-muted">
              We&apos;ll send a password reset link to your email address.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => void sendReset()}
                disabled={resetLoading || resetSent}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50 transition"
              >
                {resetLoading ? "Sending…" : "Send reset email"}
              </button>
              {resetSent && (
                <span className="text-xs text-positive">
                  ✓ Reset link sent to {email}
                </span>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="mb-4 rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Active Sessions</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Current device</p>
                <p className="text-xs text-positive">Active now</p>
              </div>
              <span className="rounded-full bg-positive/10 px-2 py-0.5 text-[10px] font-semibold text-positive uppercase">
                Current
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => void signOutOthers()}
                disabled={signOutOthersDone}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-negative hover:text-negative disabled:opacity-50 transition"
              >
                Sign out all other devices
              </button>
              {signOutOthersDone && <span className="text-xs text-positive">✓ Done</span>}
            </div>
          </div>

          {/* Login History */}
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Login History</p>
            <p className="mt-2 text-xs text-muted">Login history is unavailable at this time.</p>
          </div>
        </section>

        {/* ─── Card 4: Data & Privacy ─── */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Data & Privacy</h2>

          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">Export My Data</p>
                <p className="mt-0.5 text-xs text-muted">
                  Download all your trips, expenses, subscriptions, and savings goals as JSON.
                </p>
              </div>
              <button
                onClick={() => void exportData()}
                disabled={exporting}
                className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent transition disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "⬇ Export"}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-negative/30 p-4">
              <div>
                <p className="text-sm font-medium text-negative">Delete Account</p>
                <p className="mt-0.5 text-xs text-muted">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="shrink-0 rounded-lg border border-negative px-4 py-2 text-sm font-medium text-negative hover:bg-negative/10 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </section>

        {/* ─── Card 5: Premium ─── */}
        {!isPremium ? (
          <section
            className="rounded-2xl p-6 text-white"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #ec4899 100%)" }}
          >
            <p className="text-2xl font-bold">✨ Go Premium</p>
            <p className="mt-2 text-sm text-white/80">
              Unlock AI Receipt Scanner, unlimited trips, PDF reports, and priority support.
            </p>
            <p className="mt-1 text-lg font-bold">₹199/month <span className="text-sm font-normal opacity-80">or ₹1,499/year</span></p>
            <button
              onClick={() => showToast("Premium coming soon! Stay tuned 🎉")}
              className="mt-4 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-purple-600 hover:opacity-90 transition"
            >
              Upgrade Now
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👑</span>
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-300">Premium Member</p>
                {memberSince && <p className="text-xs text-muted">Member since {memberSince}</p>}
              </div>
            </div>
            <button
              onClick={() => showToast("Subscription management coming soon")}
              className="mt-4 rounded-xl border border-amber-400/40 px-5 py-2 text-sm font-medium text-amber-600 dark:text-amber-300 hover:bg-amber-400/10 transition"
            >
              Manage Subscription
            </button>
          </section>
        )}
      </div>

      {/* Global input styles */}
      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--background);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
