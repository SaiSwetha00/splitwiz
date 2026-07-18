import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTrips } from '@/lib/trips';
import { TripsPageClient } from '@/components/TripsPageClient';

export const metadata = { title: 'Trips — Splitwiz' };

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [trips, settingsRes] = await Promise.all([
    getTrips(user.id),
    supabase.from('user_settings').select('default_currency').eq('id', user.id).maybeSingle(),
  ]);

  const defaultCurrency = settingsRes.data?.default_currency ?? 'INR';

  return <TripsPageClient trips={trips} defaultCurrency={defaultCurrency} />;
}
