'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip } from '@/types/trips';
import { TRIP_TYPES } from '@/types/trips';
import { currencySymbol } from '@/lib/money';
import { Avatar } from '@/components/Avatar';
import { NewTripModal } from '@/components/NewTripModal';

function tripEmoji(type: string | null): string {
  return TRIP_TYPES.find(t => t.value === type)?.emoji ?? '📦';
}

function spendLabel(total_spent: number, currency: string): string {
  if (total_spent <= 0) return '';
  const sym = currencySymbol(currency);
  return `${sym}${Number(total_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent`;
}

interface TripsPageClientProps {
  trips: Trip[];
  defaultCurrency: string;
}

export function TripsPageClient({ trips, defaultCurrency }: TripsPageClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function handleCreated(id: string) {
    setShowModal(false);
    router.push(`/dashboard/trips/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Trips</h1>
          <p className="mt-1 text-sm text-muted">
            {trips.length === 0 ? 'No trips yet' : `${trips.length} trip${trips.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {trips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map(trip => {
            const sym = currencySymbol(trip.currency);
            const memberCount = trip.members.length;
            const shown = trip.members.slice(0, 3);
            const extra = memberCount - shown.length;

            return (
              <button
                key={trip.id}
                onClick={() => router.push(`/dashboard/trips/${trip.id}`)}
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:border-accent hover:shadow-sm"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl leading-none">{tripEmoji(trip.type)}</span>
                    <div>
                      <p className="font-semibold leading-tight group-hover:text-accent transition-colors">
                        {trip.name}
                      </p>
                      {trip.description && (
                        <p className="mt-0.5 text-xs text-muted line-clamp-1">{trip.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-background px-2 py-0.5 text-xs text-muted">
                    {trip.currency}
                  </span>
                </div>

                {/* Members */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {shown.map(m => (
                      <Avatar key={m.id} name={m.name} size={24} className="ring-2 ring-surface" />
                    ))}
                  </div>
                  <span className="text-xs text-muted">
                    {extra > 0 ? `+${extra} more · ` : ''}{memberCount} {memberCount === 1 ? 'person' : 'people'}
                  </span>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold">
                      {sym}{Number(trip.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted">total spent</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">
                      {spendLabel(trip.total_spent, trip.currency) || new Date(trip.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
            🏠
          </div>
          <div>
            <p className="font-semibold text-lg">No trips yet</p>
            <p className="mt-1 text-sm text-muted">Create your first trip and start splitting expenses.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Create your first trip
          </button>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 active:scale-95 z-30"
        aria-label="New Trip"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {showModal && (
        <NewTripModal
          defaultCurrency={defaultCurrency}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
