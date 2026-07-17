"use client";
import { useState, useEffect } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

type Settings = {
  default_currency: string;
  notifications_enabled: boolean;
  theme: string;
};

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

const THEMES = [
  { value: "system", label: "System (auto)" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [email, setEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState("system");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { document.title = "Settings — Splitwiz"; }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { settings: Settings; profile: Profile | null; email: string }) => {
        setEmail(d.email ?? "");
        setDisplayName(d.profile?.display_name ?? "");
        if (d.settings) {
          setDefaultCurrency(d.settings.default_currency ?? "USD");
          setNotificationsEnabled(d.settings.notifications_enabled ?? true);
          setTheme(d.settings.theme ?? "system");
        }
      })
      .catch(() => setFetchError("Failed to load settings. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          default_currency: defaultCurrency,
          notifications_enabled: notificationsEnabled,
          theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save settings");
        return;
      }
      setSaveSuccess(true);
      // Apply theme immediately.
      const root = document.documentElement;
      if (theme === "light" || theme === "dark") {
        root.dataset.theme = theme;
      } else {
        delete root.dataset.theme;
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Manage your profile and preferences</p>
      </div>

      {fetchError && (
        <p className="mb-4 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {fetchError}
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Profile section */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Profile</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Email</label>
              <input
                value={email}
                disabled
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted opacity-60"
              />
              <p className="text-xs text-muted">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
          </div>
        </section>

        {/* Preferences section */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Preferences</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Default currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted">
                  Receive alerts for budget limits and subscription renewals
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEnabled((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notificationsEnabled ? "bg-accent" : "bg-border"
                }`}
                role="switch"
                aria-checked={notificationsEnabled}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {saveError && (
          <p className="rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="rounded-xl border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
            Settings saved successfully.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
