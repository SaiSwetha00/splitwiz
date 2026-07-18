"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { syncQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  // Poll queue count every 5 s so badge updates after queuing
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const { getQueueCount } = await import("@/lib/offline-queue");
      const count = await getQueueCount();
      if (!cancelled) setQueueCount(count);
    }

    void poll();
    const t = setInterval(() => void poll(), 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!online) return;

    async function sync() {
      const count = queueCount;
      if (count === 0) return;

      setSyncMsg(`Syncing ${count} expense${count === 1 ? "" : "s"}…`);
      const { synced } = await syncQueue();
      if (synced > 0) {
        setQueueCount(0);
        setSyncMsg(`Synced ${synced} expense${synced === 1 ? "" : "s"} ✓`);
        setTimeout(() => setSyncMsg(null), 3000);
      } else {
        setSyncMsg(null);
      }
    }

    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Listen for SW-triggered sync
  useEffect(() => {
    function onSyncDone(e: Event) {
      const { synced } = (e as CustomEvent<{ synced: number }>).detail;
      setSyncMsg(`Synced ${synced} expense${synced === 1 ? "" : "s"} ✓`);
      setQueueCount(0);
      setTimeout(() => setSyncMsg(null), 3000);
    }
    window.addEventListener("splitwiz:sync-done", onSyncDone);
    return () => window.removeEventListener("splitwiz:sync-done", onSyncDone);
  }, []);

  if (online && !syncMsg) return null;

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white transition-all ${
        online ? "bg-positive" : "bg-amber-500"
      }`}
      style={{ backdropFilter: "blur(8px)" }}
    >
      {!online ? (
        <>
          <span>⚡</span>
          <span>
            You&apos;re offline — showing cached data
            {queueCount > 0 && ` · ${queueCount} expense${queueCount === 1 ? "" : "s"} queued`}
          </span>
        </>
      ) : (
        <>
          <span>✓</span>
          <span>{syncMsg}</span>
        </>
      )}
    </div>
  );
}
