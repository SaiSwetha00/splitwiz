import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/server";

export type TripRole = "owner" | "editor" | "viewer";

type DbClient = SupabaseClient<Database>;

export type AccessResult =
  | { ok: true; userId: string | null; role: TripRole | null }
  | { ok: false; status: 401 | 403 | 404; error: string };

// Checks write access for a trip that is already loaded.
// - Anonymous trip (tripUserId IS NULL): always allowed.
// - Owned trip: caller must be authenticated and hold editor+ role.
export async function checkTripWrite(
  supabase: DbClient,
  tripId: string,
  tripUserId: string | null,
  requiredRole: TripRole = "editor"
): Promise<AccessResult> {
  if (!tripUserId) return { ok: true, userId: null, role: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Sign in to modify this trip",
    };
  }

  // Trip creator always owns it.
  if (tripUserId === user.id) {
    return { ok: true, userId: user.id, role: "owner" };
  }

  const { data: collab } = await createAdminClient()
    .from("trip_collaborators")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (collab?.role ?? null) as TripRole | null;
  const hierarchy: TripRole[] = ["viewer", "editor", "owner"];
  const hasAccess =
    role !== null &&
    hierarchy.indexOf(role) >= hierarchy.indexOf(requiredRole);

  if (!hasAccess) {
    return {
      ok: false,
      status: 403,
      error: "You don't have permission to modify this trip",
    };
  }

  return { ok: true, userId: user.id, role };
}

// Resolves the current user's role on a trip.
// Returns null for anonymous trips (no ownership) or unauthenticated callers.
export async function resolveUserRole(
  supabase: DbClient,
  tripId: string,
  tripUserId: string | null
): Promise<TripRole | null> {
  if (!tripUserId) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (tripUserId === user.id) return "owner";

  const { data: collab } = await createAdminClient()
    .from("trip_collaborators")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (collab?.role as TripRole) ?? null;
}
