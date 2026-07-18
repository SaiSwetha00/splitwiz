import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@splitwiz.app";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

  const body = await req.json() as {
    userId: string;
    title: string;
    body: string;
    url?: string;
    icon?: string;
  };

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", body.userId);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({
    title: body.title,
    body: body.body,
    url: body.url ?? "/dashboard",
    icon: body.icon ?? "/icon-192x192.png",
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth_key as string },
        },
        payload,
      )
    )
  );

  // Delete expired subscriptions (410 Gone)
  const expiredEndpoints: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410) expiredEndpoints.push(subs[i].endpoint as string);
    }
  });

  if (expiredEndpoints.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
