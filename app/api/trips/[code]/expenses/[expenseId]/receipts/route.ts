import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTripWrite } from "@/lib/auth/tripAccess";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

type RouteParams = { params: Promise<{ code: string; expenseId: string }> };

// GET — list receipts for an expense with signed URLs.
// Anonymous trips: open. Owned trips: require collaborator.
export async function GET(_request: Request, { params }: RouteParams) {
  const { code, expenseId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Owned trips require collaborator access.
  if (trip.user_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const isCreator = trip.user_id === user.id;
    if (!isCreator) {
      const { data: collab } = await supabase
        .from("trip_collaborators")
        .select("role")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!collab) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
  }

  // Verify the expense belongs to this trip.
  const { data: expense } = await admin
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const { data: receipts } = await admin
    .from("receipts")
    .select(
      "id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at"
    )
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: true });

  const items = await Promise.all(
    (receipts ?? []).map(async (r) => {
      const { data } = await admin.storage
        .from("receipts")
        .createSignedUrl(r.storage_path, 3600);
      return { ...r, signedUrl: data?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ receipts: items });
}

// POST — upload a receipt. Requires authentication + trip write access.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { code, expenseId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to attach receipts" },
      { status: 401 }
    );
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("code", code.toUpperCase())
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const access = await checkTripWrite(supabase, trip.id, trip.user_id ?? null);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Verify expense belongs to this trip.
  const { data: expense } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 413 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only images (JPEG, PNG, WebP, GIF) and PDFs are allowed" },
      { status: 415 }
    );
  }

  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
  const storagePath = `${user.id}/${expenseId}/${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("receipts")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
  }

  const { data: receipt, error: dbError } = await admin
    .from("receipts")
    .insert({
      expense_id: expenseId,
      uploaded_by: user.id,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select(
      "id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at"
    )
    .single();

  if (dbError) {
    await admin.storage.from("receipts").remove([storagePath]);
    return NextResponse.json({ error: "Failed to save receipt record" }, { status: 500 });
  }

  const { data: signedUrlData } = await admin.storage
    .from("receipts")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json(
    { receipt: { ...receipt, signedUrl: signedUrlData?.signedUrl ?? null } },
    { status: 201 }
  );
}
