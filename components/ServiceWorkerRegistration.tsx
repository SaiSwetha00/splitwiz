"use client";

import { useEffect } from "react";
import { syncQueue } from "@/lib/offline-queue";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Check for updates every 60 minutes
        const interval = setInterval(() => reg.update(), 60 * 60 * 1000);

        // Listen for messages from the SW (e.g. sync requests)
        navigator.serviceWorker.addEventListener("message", (event: MessageEvent<{ type: string }>) => {
          if (event.data?.type === "SYNC_QUEUE") {
            void handleSync();
          }
        });

        return () => clearInterval(interval);
      } catch {
        // SW registration is non-critical — fail silently
      }
    };

    void register();
  }, []);

  return null;
}

async function handleSync() {
  try {
    const { synced } = await syncQueue();
    if (synced > 0) {
      window.dispatchEvent(
        new CustomEvent("splitwiz:sync-done", { detail: { synced } })
      );
    }
  } catch {
    // non-critical
  }
}
