'use client';

import { useEffect, useState } from 'react';

const LOGIN_COUNT_KEY = 'splitwiz_login_count';
const PUSH_DISMISSED_KEY = 'splitwiz_push_dismissed';

export function PushPermissionBanner() {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;

    const count = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) ?? '0', 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage once on mount; no cascading renders
    if (count >= 3) setShow(true);
  }, []);

  async function subscribe() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShow(false);
        localStorage.setItem(PUSH_DISMISSED_KEY, '1');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
        ),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setShow(false);
    } catch {
      setShow(false);
    } finally {
      setSubscribing(false);
    }
  }

  function dismiss() {
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '5rem', left: '1rem', right: '1rem', zIndex: 60,
      maxWidth: '420px', margin: '0 auto',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '1rem', padding: '1rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
    }}>
      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.875rem' }}>
          Get expense alerts on your phone
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
          Stay updated when teammates add expenses
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={() => void subscribe()}
          disabled={subscribing}
          style={{
            background: 'var(--accent)', color: 'var(--accent-foreground)',
            border: 'none', borderRadius: '0.6rem',
            padding: '0.45rem 0.875rem', fontSize: '0.8rem', fontWeight: 600,
            cursor: subscribing ? 'not-allowed' : 'pointer',
            opacity: subscribing ? 0.65 : 1,
          }}
        >
          {subscribing ? '…' : 'Enable'}
        </button>
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: '0.6rem', padding: '0.45rem 0.6rem',
            fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}
