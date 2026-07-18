'use client';

import { useRef, useState } from 'react';

export interface ScannedData {
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  category: string | null;
  items: { name: string; price: number }[] | null;
}

interface Props {
  onScanned: (data: ScannedData) => void;
  disabled?: boolean;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export function ReceiptScanner({ onScanned, disabled }: Props) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file');
      setStatus('error');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setStatus('scanning');
    setErrorMsg(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const part = result.split(',')[1];
          if (part) resolve(part);
          else reject(new Error('Could not read file'));
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      const data = await res.json() as ScannedData & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Scan failed');

      onScanned({
        merchant: data.merchant ?? null,
        amount: data.amount ?? null,
        currency: data.currency ?? null,
        date: data.date ?? null,
        category: data.category ?? null,
        items: data.items ?? null,
      });
      setStatus('success');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Scan failed. Try a clearer image.');
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || status === 'scanning'}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>📷</span>
          <span>
            {status === 'scanning' ? 'Scanning…' : status === 'success' ? 'Rescan receipt' : 'Scan Receipt'}
          </span>
        </button>
        {status === 'success' && (
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--positive)' }}>
            <span>✓</span>
            <span>Fields auto-filled</span>
          </span>
        )}
        {status === 'error' && errorMsg && (
          <span className="text-xs" style={{ color: 'var(--negative)' }}>{errorMsg}</span>
        )}
      </div>

      {preview && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Receipt preview"
            className="h-14 w-14 rounded-xl border border-border object-cover"
          />
          {status === 'scanning' && (
            <span className="animate-pulse text-xs text-muted">Analyzing receipt with AI…</span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
