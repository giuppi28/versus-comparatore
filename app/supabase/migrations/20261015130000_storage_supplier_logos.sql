-- =====================================================================================
-- Storage bucket for supplier logos (admin uploads, public read).
-- Used by app/src/lib/data/supabase/supabase-repository.ts (uploadSupplierLogo):
--   bucket "supplier-logos", object name "<supplier_id>/<timestamp>.svg"
-- Public URL: <SUPABASE_URL>/storage/v1/object/public/supplier-logos/<name>
--
-- - Public bucket: anyone can download through the public URL (no RLS involved there).
--   No SELECT policy for anon, so the bucket cannot be listed through the API.
-- - Only SVG, max 200 KB (enforced by the Storage API from the bucket settings).
-- - Writes (insert/update/delete) and API listing only for public.is_admin(), plus the same
--   MFA rule as the public tables (verified factor => aal2), scoped to this bucket.
-- Idempotent. Does not alter storage.objects itself (RLS is already enabled by Supabase).
-- =====================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-logos', 'supplier-logos', true, 204800, array['image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists supplier_logos_admin_select on storage.objects;
drop policy if exists supplier_logos_admin_insert on storage.objects;
drop policy if exists supplier_logos_admin_update on storage.objects;
drop policy if exists supplier_logos_admin_delete on storage.objects;
drop policy if exists supplier_logos_require_mfa  on storage.objects;

-- SELECT is needed by the Storage API for list / remove / upsert (admin only).
create policy supplier_logos_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'supplier-logos' and (select public.is_admin()));
create policy supplier_logos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'supplier-logos' and (select public.is_admin()));
create policy supplier_logos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'supplier-logos' and (select public.is_admin()))
  with check (bucket_id = 'supplier-logos' and (select public.is_admin()));
create policy supplier_logos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'supplier-logos' and (select public.is_admin()));

-- MFA (restrictive), limited to this bucket so other buckets are not affected.
create policy supplier_logos_require_mfa on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'supplier-logos' or (select private.mfa_satisfied()))
  with check (bucket_id <> 'supplier-logos' or (select private.mfa_satisfied()));
