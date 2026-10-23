-- =====================================================================================
-- Phase 12b (T12b.1)  Customer removal of an uploaded identity document.
-- Must be applied AFTER 20261023100000_activation_documents_callback.sql.
--
-- ADDITIVE and backward compatible: no DROP of any object, no data change, existing RPC
-- signatures unchanged (register_lead_document is recreated with the same signature and
-- result). Idempotent (if not exists / create or replace / policies created only when
-- missing).
--
-- There is no service role key: the app server talks to Supabase with the publishable
-- (anon) key, and Supabase forbids SQL deletes on storage.objects, so the object is removed
-- through the Storage API under a tightly scoped anon policy (same pattern as the upload):
--
--   1. request_lead_document_removal(p_secret, p_token, p_document_id)   [server only]
--        LEAD_API_SECRET + lead token (in-progress lead only) + an UPLOADED document of
--        that lead -> opens a 1-minute removal window on the row (removal_expires_at)
--        and returns {id, path, bucket}. The path never leaves the server.
--   2. Storage API remove([path]) with the anon key. Storage needs SELECT + DELETE on
--        storage.objects: the two anon policies below allow them ONLY for the object of a
--        document whose removal window is open and whose lead is still in progress
--        (private.lead_document_removal_allowed). The names are unguessable
--        (<lead_id>/<32 random hex>) and the window lasts until step 3 (max 1 minute).
--   3. finish_lead_document_removal(p_secret, p_token, p_document_id)    [server only]
--        If the object is gone: deletes the row, increments leads.document_removed_count
--        and returns {id, removed: true}. If the object still exists (the Storage call
--        failed): keeps the row, closes the window and returns {id, removed: false}.
--        -> a row is only deleted once its file is really gone; every failure is
--           retry-safe (steps 1-3 can simply be run again).
--
-- Limits: the max-2 cap counts only rows that exist (removed documents free their slot);
-- the abuse cap of 20 upload slots per lead now counts removed documents too
-- (leads.document_removed_count), so removal cannot be used to issue unlimited slots.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Columns
-- -------------------------------------------------------------------------------------
-- Number of documents the customer removed (counts toward the 20-slot abuse cap).
-- Not writable by the lead functions (not in private.lead_writable_fields()).
alter table public.leads
  add column if not exists document_removed_count integer not null default 0
    constraint leads_document_removed_count_range check (document_removed_count >= 0);
comment on column public.leads.document_removed_count is
  'Identity documents removed by the customer (finish_lead_document_removal); counts toward the 20 upload slots per lead.';

-- End of the removal window opened by request_lead_document_removal (null = none).
alter table public.lead_documents
  add column if not exists removal_expires_at timestamptz
    constraint lead_documents_removal_only_uploaded check (removal_expires_at is null or status = 'uploaded');
comment on column public.lead_documents.removal_expires_at is
  'Customer removal window (server only, 1 minute): while open, anon may SELECT/DELETE exactly this object through the Storage API.';

-- -------------------------------------------------------------------------------------
-- 2. register_lead_document: same signature / result; the 20-slot cap includes removals
-- -------------------------------------------------------------------------------------
create or replace function public.register_lead_document(
  p_secret text, p_token text, p_mime_type text, p_size_bytes integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead    uuid;
  v_id      uuid;
  v_path    text;
  v_expires timestamptz := now() + interval '5 minutes';
  v_active  integer;
  v_total   integer;
  v_removed integer;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);  -- row lock: serializes slots of one lead

  if p_mime_type is null or p_mime_type not in ('image/jpeg', 'application/pdf')
     or p_size_bytes is null or p_size_bytes not between 1 and 5242880 then
    raise exception 'invalid_document' using errcode = '22023';
  end if;

  select count(*) filter (where d.status = 'uploaded' or d.expires_at > now()),
         count(*)
    into v_active, v_total
    from public.lead_documents d
   where d.lead_id = v_lead;
  select l.document_removed_count into v_removed from public.leads l where l.id = v_lead;
  -- Max 2 documents per lead; max 20 issued slots per lead (expired and removed included).
  if v_active >= 2 or v_total + coalesce(v_removed, 0) >= 20 then
    raise exception 'document_limit_reached' using errcode = '22023';
  end if;

  v_path := v_lead::text || '/' || encode(extensions.gen_random_bytes(16), 'hex')
            || case p_mime_type when 'image/jpeg' then '.jpg' else '.pdf' end;

  insert into public.lead_documents (lead_id, object_path, mime_type, size_bytes, status, expires_at)
  values (v_lead, v_path, p_mime_type, p_size_bytes, 'pending', v_expires)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'lead_id', v_lead, 'path', v_path,
                            'bucket', 'lead-documents', 'expires_at', v_expires);
end;
$$;
comment on function public.register_lead_document(text, text, text, integer) is
  'Server only (LEAD_API_SECRET): issue a one-time, 5-minute upload slot in bucket lead-documents for the in-progress lead owning the token (max 2 documents, 20 slots incl. removed ones). Returns {id, lead_id, path, bucket, expires_at}.';
revoke all on function public.register_lead_document(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.register_lead_document(text, text, text, integer) to anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 3. Storage policies for the removal (anon: SELECT + DELETE of the target object only)
-- -------------------------------------------------------------------------------------
-- True only for the object name of an UPLOADED document with an OPEN removal window whose
-- lead is still IN PROGRESS. Used by the anon SELECT / DELETE policies on storage.objects.
create or replace function private.lead_document_removal_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.lead_documents d
      join public.leads l on l.id = d.lead_id
     where d.object_path = p_name
       and d.status = 'uploaded'
       and d.removal_expires_at > now()
       and l.step_reached <> 'completed');
$$;
comment on function private.lead_document_removal_allowed(text) is
  'Storage SELECT/DELETE policy helper (bucket lead-documents): the object name belongs to an uploaded document of an in-progress lead whose removal window is open.';
alter function private.lead_document_removal_allowed(text) owner to postgres;
revoke all on function private.lead_document_removal_allowed(text) from public, anon, authenticated;
-- The policies run as the caller (anon): USAGE on `private` was granted by 20261023100000.
grant usage on schema private to anon;
grant execute on function private.lead_document_removal_allowed(text) to anon;

do $$
begin
  -- Storage API remove() = DELETE ... RETURNING on storage.objects: needs SELECT + DELETE.
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'lead_documents_anon_remove_select') then
    create policy lead_documents_anon_remove_select on storage.objects for select to anon
      using (bucket_id = 'lead-documents' and private.lead_document_removal_allowed(name));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'lead_documents_anon_remove_delete') then
    create policy lead_documents_anon_remove_delete on storage.objects for delete to anon
      using (bucket_id = 'lead-documents' and private.lead_document_removal_allowed(name));
  end if;
end
$$;

-- -------------------------------------------------------------------------------------
-- 4. Removal RPCs (server only: LEAD_API_SECRET + lead token)
-- -------------------------------------------------------------------------------------
-- request_lead_document_removal(p_secret, p_token, p_document_id) -> {"id", "path", "bucket"}
-- Errors: invalid_secret (28000), lead_not_found (P0002, unknown token / completed lead),
--         document_not_found (P0002, not an uploaded document of this lead).
create or replace function public.request_lead_document_removal(p_secret text, p_token text, p_document_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead uuid;
  v_doc  public.lead_documents;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);

  update public.lead_documents d
     set removal_expires_at = now() + interval '1 minute'
   where d.id = p_document_id and d.lead_id = v_lead and d.status = 'uploaded'
  returning * into v_doc;
  if v_doc.id is null then
    raise exception 'document_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', v_doc.id, 'path', v_doc.object_path, 'bucket', 'lead-documents');
end;
$$;
comment on function public.request_lead_document_removal(text, text, uuid) is
  'Server only (LEAD_API_SECRET): open a 1-minute removal window on an uploaded document of the in-progress lead owning the token (anon may then delete exactly that object through the Storage API). Returns {id, path, bucket}.';

-- finish_lead_document_removal(p_secret, p_token, p_document_id) -> {"id", "removed"}
-- removed = true: object gone -> row deleted, removal counted. removed = false: the object
-- still exists -> row kept, window closed (retry later). Errors: invalid_secret,
-- lead_not_found, document_not_found.
create or replace function public.finish_lead_document_removal(p_secret text, p_token text, p_document_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead uuid;
  v_doc  public.lead_documents;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);

  select * into v_doc
    from public.lead_documents d
   where d.id = p_document_id and d.lead_id = v_lead and d.status = 'uploaded'
   for update;
  if v_doc.id is null then
    raise exception 'document_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from storage.objects o
              where o.bucket_id = 'lead-documents' and o.name = v_doc.object_path) then
    update public.lead_documents d set removal_expires_at = null where d.id = v_doc.id;
    return jsonb_build_object('id', v_doc.id, 'removed', false);
  end if;

  delete from public.lead_documents d where d.id = v_doc.id;
  update public.leads l set document_removed_count = l.document_removed_count + 1 where l.id = v_lead;
  return jsonb_build_object('id', v_doc.id, 'removed', true);
end;
$$;
comment on function public.finish_lead_document_removal(text, text, uuid) is
  'Server only (LEAD_API_SECRET): after the Storage removal, delete the document row if its object is gone ({removed: true}); otherwise keep it and close the removal window ({removed: false}).';

revoke all on function public.request_lead_document_removal(text, text, uuid) from public, anon, authenticated;
revoke all on function public.finish_lead_document_removal(text, text, uuid) from public, anon, authenticated;
grant execute on function public.request_lead_document_removal(text, text, uuid) to anon, authenticated;
grant execute on function public.finish_lead_document_removal(text, text, uuid) to anon, authenticated;

comment on table public.lead_documents is
  'Identity-document upload slots / files of a lead (Storage bucket lead-documents). anon: no access (register / confirm / request_removal / finish_removal functions). Admin: read only; rows cascade with the lead, files are removed by the app.';
