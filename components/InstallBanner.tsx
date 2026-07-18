"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "splitwiz_session_count";
const DISMISSED_KEY = "splitwiz_install_dismissed";
const SHOW_AFTER = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Increment session count
    const count = parseInt(localStorage.getItem(SESSION_KEY) ?? "0", 10) + 1;
    localStorage.setItem(SESSION_KEY, String(count));

    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";

    // Capture the install prompt
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      if (count >= SHOW_AFTER && !dismissed) {
        setShow(true);
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setShow(false);
    setPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:bottom-6 md:left-auto md:right-6 md:w-96">
      <div
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl"
        style={{ backdropFilter: "blur(12px)" }}
      >
        <span className="shrink-0 text-2xl">📱</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install SplitWiz</p>
          <p className="text-xs text-muted">Get the full app experience</p>
        </div>
        <button
          onClick={() => void install()}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 text-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
