import { createAdminClient } from "@/lib/supabase/admin";

type NotifyParams = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
};

export async function createNotification(params: NotifyParams): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    action_url: params.actionUrl ?? null,
  });
}

type CollabNotifyParams = {
  tripId: string;
  tripOwnerId: string;
  actorUserId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
};

// Notify all collaborators on a trip except the actor.
// Also notifies the trip owner if they are not the actor.
export async function notifyTripCollaborators(
  params: CollabNotifyParams
): Promise<void> {
  const admin = createAdminClient();

  const { data: collabs } = await admin
    .from("trip_collaborators")
    .select("user_id")
    .eq("trip_id", params.tripId)
    .neq("user_id", params.actorUserId);

  const recipients = new Set((collabs ?? []).map((c) => c.user_id));

  // Include the trip owner if they're not the actor.
  if (params.tripOwnerId !== params.actorUserId) {
    recipients.add(params.tripOwnerId);
  }

  if (recipients.size === 0) return;

  const rows = Array.from(recipients).map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    body: params.body,
    action_url: params.actionUrl,
  }));

  await admin.from("notifications").insert(rows);
}
