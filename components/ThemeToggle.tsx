"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ initialTheme }: { initialTheme: string }) {
  const [dark, setDark] = useState(initialTheme === "dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = document.documentElement.dataset.theme;
    if (t === "dark") setDark(true);
    else if (t === "light") setDark(false);
    else setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next ? "dark" : "light" }),
    }).catch(() => {});
  }

  if (!mounted) return <div className="h-9 w-9 shrink-0" />;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-border hover:text-foreground"
    >
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
