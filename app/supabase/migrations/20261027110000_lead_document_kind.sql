-- =====================================================================================
-- Phase 14 (T14.3)  Lead documents: `kind` ('id_document' | 'bill') with per-kind limits.
--
-- ADDITIVE and backward compatible with the app currently in production (same Supabase
-- project for preview and production). The production app calls
-- register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes) without a kind:
-- the new function keeps accepting that call (p_kind defaults to 'id_document') with the
-- same rules and the same result as before. No data change, no RLS policy change.
--
-- 1. lead_documents.kind text not null default 'id_document', check in ('id_document','bill').
--    Constant default: instant, existing rows become 'id_document'.
-- 2. register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes, p_kind default
--    'id_document'): the old 4-argument function is dropped and the function recreated with
--    the extra parameter (identical security definer, search_path = '', grants: no PUBLIC,
--    anon + authenticated). Limits per kind:
--      id_document: image/jpeg or application/pdf, 1..5 MiB, max 2 uploaded/pending (as today);
--      bill:        application/pdf only, 1..4 MiB, max 1 uploaded/pending
--                   (else bill_limit_reached, 22023).
--    The 20-slot total cap (existing rows + document_removed_count, all kinds) is unchanged.
--    The result also contains "kind".
-- 3. confirm_lead_document recreated (same signature, grants, token binding): the "max
--    uploaded" re-check is now per kind (2 id documents, 1 bill), otherwise a bill could
--    never be confirmed next to two id documents. Result also contains "kind".
-- request/finish removal functions are unchanged (a bill is removed like any document).
-- Idempotent: add column if not exists, constraint dropped and re-added, drop function if
-- exists / create or replace.
-- =====================================================================================

alter table public.lead_documents
  add column if not exists kind text not null default 'id_document';
alter table public.lead_documents drop constraint if exists lead_documents_kind_values;
alter table public.lead_documents
  add constraint lead_documents_kind_values check (kind in ('id_document', 'bill'));
comment on column public.lead_documents.kind is
  'id_document = identity document (max 2, JPEG or PDF); bill = a recent bill (max 1, PDF only).';

-- The old 4-argument signature is replaced (a second overload would make calls ambiguous).
drop function if exists public.register_lead_document(text, text, text, integer);

-- register_lead_document(p_secret, p_token, p_mime_type, p_size_bytes, p_kind default 'id_document')
--   -> {"id", "lead_id", "path", "bucket", "expires_at", "kind"}
-- Errors: invalid_secret (28000), lead_not_found (P0002), invalid_document (22023),
--         document_limit_reached (22023, id_document), bill_limit_reached (22023, bill).
create or replace function public.register_lead_document(
  p_secret text, p_token text, p_mime_type text, p_size_bytes integer,
  p_kind text default 'id_document')
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
  v_kind    text := coalesce(p_kind, 'id_document');
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);  -- row lock: serializes slots of one lead

  if v_kind not in ('id_document', 'bill')
     or p_mime_type is null or p_mime_type not in ('image/jpeg', 'application/pdf')
     or p_size_bytes is null or p_size_bytes not between 1 and 5242880
     or (v_kind = 'bill' and (p_mime_type <> 'application/pdf' or p_size_bytes > 4194304)) then
    raise exception 'invalid_document' using errcode = '22023';
  end if;

  select count(*) filter (where d.kind = v_kind and (d.status = 'uploaded' or d.expires_at > now())),
         count(*)
    into v_active, v_total
    from public.lead_documents d
   where d.lead_id = v_lead;
  select l.document_removed_count into v_removed from public.leads l where l.id = v_lead;
  -- Max 20 issued slots per lead (expired and removed included), all kinds together.
  if v_total + coalesce(v_removed, 0) >= 20 then
    raise exception 'document_limit_reached' using errcode = '22023';
  end if;
  -- Max 2 identity documents, max 1 bill per lead.
  if v_kind = 'bill' and v_active >= 1 then
    raise exception 'bill_limit_reached' using errcode = '22023';
  end if;
  if v_kind = 'id_document' and v_active >= 2 then
    raise exception 'document_limit_reached' using errcode = '22023';
  end if;

  v_path := v_lead::text || '/' || encode(extensions.gen_random_bytes(16), 'hex')
            || case p_mime_type when 'image/jpeg' then '.jpg' else '.pdf' end;

  insert into public.lead_documents (lead_id, object_path, mime_type, size_bytes, status, expires_at, kind)
  values (v_lead, v_path, p_mime_type, p_size_bytes, 'pending', v_expires, v_kind)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'lead_id', v_lead, 'path', v_path,
                            'bucket', 'lead-documents', 'expires_at', v_expires, 'kind', v_kind);
end;
$$;
comment on function public.register_lead_document(text, text, text, integer, text) is
  'Server only (LEAD_API_SECRET): issue a one-time, 5-minute upload slot in bucket lead-documents for the in-progress lead owning the token (kind id_document: max 2, JPEG/PDF; kind bill: max 1, PDF only, 4 MiB; 20 slots incl. removed ones). Returns {id, lead_id, path, bucket, expires_at, kind}.';
revoke all on function public.register_lead_document(text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.register_lead_document(text, text, text, integer, text) to anon, authenticated;

-- confirm_lead_document(p_secret, p_token, p_document_id)
--   -> {"id", "lead_id", "mime_type", "size_bytes", "created_at", "kind"}
create or replace function public.confirm_lead_document(p_secret text, p_token text, p_document_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead uuid;
  v_doc  public.lead_documents;
  v_count integer;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);

  select * into v_doc
    from public.lead_documents d
   where d.id = p_document_id and d.lead_id = v_lead and d.status = 'pending';
  if v_doc.id is null then
    raise exception 'document_not_found' using errcode = 'P0002';
  end if;
  -- A slot that expired before confirmation could otherwise exceed the per-kind limit.
  select count(*) into v_count from public.lead_documents d
   where d.lead_id = v_lead and d.status = 'uploaded' and d.kind = v_doc.kind;
  if v_count >= (case when v_doc.kind = 'bill' then 1 else 2 end) then
    raise exception 'document_limit_reached' using errcode = '22023';
  end if;

  update public.lead_documents d
     set status = 'uploaded', uploaded_at = now()
   where d.id = v_doc.id
  returning * into v_doc;

  return jsonb_build_object('id', v_doc.id, 'lead_id', v_doc.lead_id, 'mime_type', v_doc.mime_type,
                            'size_bytes', v_doc.size_bytes, 'created_at', v_doc.created_at,
                            'kind', v_doc.kind);
end;
$$;
comment on function public.confirm_lead_document(text, text, uuid) is
  'Server only (LEAD_API_SECRET): mark an upload slot of the in-progress lead owning the token as uploaded (the name can no longer be written).';
revoke all on function public.confirm_lead_document(text, text, uuid) from public, anon, authenticated;
grant execute on function public.confirm_lead_document(text, text, uuid) to anon, authenticated;
