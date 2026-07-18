'use client';

import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';

interface Trip { id: string; name: string; currency: string }
type Step = 'upload' | 'map' | 'preview' | 'import' | 'done';

interface MappedRow {
  title: string;
  amount: number;
  date: string;
  category: string;
  note: string;
}

interface ImportResult { imported: number; failed: number; errors: string[] }

const FIELD_LABELS: Record<string, string> = {
  title: 'Title / Description *',
  amount: 'Amount *',
  date: 'Date',
  category: 'Category',
  note: 'Note',
};

const NONE = '__none__';

interface Props {
  onClose: () => void;
}

export function CsvImporter({ onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({ title: NONE, amount: NONE, date: NONE, category: NONE, note: NONE });
  const [preview, setPreview] = useState<MappedRow[]>([]);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  // Fetch trips on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/trips2');
        if (res.ok) {
          const data = await res.json() as { trips: Trip[] };
          if (!cancelled) {
            setTrips(data.trips ?? []);
            if (data.trips.length > 0) setSelectedTrip(data.trips[0].id);
          }
        }
      } catch { /* non-fatal */ }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a CSV file');
      return;
    }
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields ?? [];
        setHeaders(cols);
        setRows(res.data.slice(0, 500));
        // Auto-map common column names
        const autoMap: Record<string, string> = { title: NONE, amount: NONE, date: NONE, category: NONE, note: NONE };
        cols.forEach((col) => {
          const lower = col.toLowerCase();
          if ((lower.includes('title') || lower.includes('desc') || lower.includes('name') || lower.includes('item')) && autoMap.title === NONE) autoMap.title = col;
          else if ((lower.includes('amount') || lower.includes('price') || lower.includes('cost') || lower.includes('total')) && autoMap.amount === NONE) autoMap.amount = col;
          else if ((lower.includes('date') || lower.includes('time')) && autoMap.date === NONE) autoMap.date = col;
          else if (lower.includes('categor') && autoMap.category === NONE) autoMap.category = col;
          else if ((lower.includes('note') || lower.includes('remark') || lower.includes('comment')) && autoMap.note === NONE) autoMap.note = col;
        });
        setMapping(autoMap);
        setStep('map');
      },
      error: () => setError('Failed to parse CSV. Make sure it has a header row.'),
    });
  }

  function buildPreview(): MappedRow[] {
    return rows.slice(0, 5).flatMap((row) => {
      const title = (mapping.title !== NONE ? row[mapping.title] : '') ?? '';
      const rawAmt = (mapping.amount !== NONE ? row[mapping.amount] : '') ?? '';
      const amount = parseFloat(rawAmt.replace(/[^0-9.-]/g, ''));
      if (!title.trim() || !isFinite(amount) || amount <= 0) return [];
      const date = (mapping.date !== NONE ? row[mapping.date] : '') ?? '';
      const parsedDate = date ? new Date(date) : null;
      return [{
        title: title.trim(),
        amount,
        date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : today,
        category: (mapping.category !== NONE ? row[mapping.category] : '') ?? '',
        note: (mapping.note !== NONE ? row[mapping.note] : '') ?? '',
      }];
    });
  }

  function buildAll(): MappedRow[] {
    return rows.flatMap((row) => {
      const title = (mapping.title !== NONE ? row[mapping.title] : '') ?? '';
      const rawAmt = (mapping.amount !== NONE ? row[mapping.amount] : '') ?? '';
      const amount = parseFloat(rawAmt.replace(/[^0-9.-]/g, ''));
      if (!title.trim() || !isFinite(amount) || amount <= 0) return [];
      const date = (mapping.date !== NONE ? row[mapping.date] : '') ?? '';
      const parsedDate = date ? new Date(date) : null;
      return [{
        title: title.trim(),
        amount,
        date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : today,
        category: (mapping.category !== NONE ? row[mapping.category] : '') ?? '',
        note: (mapping.note !== NONE ? row[mapping.note] : '') ?? '',
      }];
    });
  }

  function goToPreview() {
    if (mapping.title === NONE) { setError('Please map the Title column'); return; }
    if (mapping.amount === NONE) { setError('Please map the Amount column'); return; }
    setError(null);
    setPreview(buildPreview());
    setStep('preview');
  }

  async function runImport() {
    if (!selectedTrip) { setError('Please select a trip'); return; }
    setError(null);
    setStep('import');
    try {
      const expenses = buildAll();
      const res = await fetch(`/api/trips2/${selectedTrip}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses }),
      });
      const data = await res.json() as ImportResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setResult(data);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setStep('preview');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Import Expenses from CSV</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">✕</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {error && (
            <p className="mb-4 rounded-xl bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="text-4xl">📂</div>
              <div className="text-center">
                <p className="font-medium">Upload a CSV file</p>
                <p className="mt-1 text-sm text-muted">Must have a header row. Up to 500 rows.</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Choose CSV file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
              <p className="text-xs text-muted">Expected columns: Title, Amount, Date (optional), Category (optional)</p>
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 'map' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Found <strong>{rows.length}</strong> rows. Map your CSV columns to expense fields:
              </p>
              <div className="flex flex-col gap-3">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <label key={field} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{label}</span>
                    <select
                      value={mapping[field]}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value={NONE}>— skip —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep('upload')} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted hover:text-foreground">
                  Back
                </button>
                <button onClick={goToPreview} className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90">
                  Preview →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Preview (first 5 valid rows):</p>
                <p className="text-xs text-muted">{buildAll().length} rows will be imported</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="pb-2 pr-3 font-semibold">Title</th>
                      <th className="pb-2 pr-3 font-semibold">Amount</th>
                      <th className="pb-2 pr-3 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="max-w-[120px] truncate py-2 pr-3 font-medium">{row.title}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.amount.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-muted">{row.date}</td>
                        <td className="py-2 text-muted">{row.category || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted">No valid rows found. Check your column mapping.</p>
                )}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Import into trip</span>
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {trips.length === 0 && <option value="">No trips found</option>}
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.currency})</option>)}
                </select>
              </label>

              <div className="flex gap-2">
                <button onClick={() => setStep('map')} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted hover:text-foreground">
                  Back
                </button>
                <button
                  onClick={runImport}
                  disabled={preview.length === 0 || !selectedTrip}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Import {buildAll().length} rows →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'import' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
              <p className="text-sm text-muted">Importing expenses…</p>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="text-4xl">{result.failed === 0 ? '✅' : '⚠️'}</div>
              <div>
                <p className="font-semibold">{result.imported} expense{result.imported !== 1 ? 's' : ''} imported</p>
                {result.failed > 0 && (
                  <p className="mt-1 text-sm text-muted">{result.failed} row{result.failed !== 1 ? 's' : ''} skipped</p>
                )}
                {result.errors.length > 0 && (
                  <ul className="mt-2 text-left text-xs text-negative">
                    {result.errors.map((e, i) => <li key={i}>· {e}</li>)}
                  </ul>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
