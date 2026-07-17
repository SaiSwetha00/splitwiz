import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type ActivityParams = {
  userId?: string | null;
  tripId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

// Fire-and-forget — call without await so it never blocks a response.
export function logActivity(params: ActivityParams): void {
  const admin = createAdminClient();
  void admin.from("activity_logs").insert({
    user_id: params.userId ?? null,
    trip_id: params.tripId ?? null,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    metadata: (params.metadata ?? null) as Json | null,
  });
}
