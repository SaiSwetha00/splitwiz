-- ============================================================
-- SplitWiz — Phase 7: Receipt Storage RLS
-- Run in Supabase SQL Editor after creating the receipts bucket.
-- The bucket must exist (created in Phase 4 manual steps).
-- ============================================================

-- Storage object policies for the "receipts" bucket.
-- Path format: {uploaded_by_user_id}/{expense_id}/{uuid}.{ext}
-- The API uses the service-role key for storage operations,
-- but these policies protect direct SDK access from the client.

create policy "receipts_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "receipts_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "receipts_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
