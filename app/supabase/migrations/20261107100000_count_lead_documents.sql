-- =====================================================================================
-- T18.8  count_lead_documents(p_secret, p_token): number of uploaded identity documents.
--
-- ADDITIVE and backward compatible with the app on `main`: one new function, no change to
-- existing functions, tables, policies or data. The complete route needs it to refuse a
-- completion without the required identity document files (anon cannot read
-- lead_documents). Idempotent (create or replace).
-- Same hardening as the other lead functions: secret check first, token lock on an
-- in-progress lead, security definer, search_path = '', no PUBLIC, anon + authenticated.
-- Errors: invalid_secret (28000), lead_not_found (P0002).
-- =====================================================================================

create or replace function public.count_lead_documents(p_secret text, p_token text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lead  uuid;
  v_count integer;
begin
  perform private.check_lead_secret(p_secret);
  v_lead := private.lock_lead_by_token(p_token);
  select count(*) into v_count from public.lead_documents d
   where d.lead_id = v_lead and d.status = 'uploaded' and d.kind = 'id_document';
  return v_count;
end;
$$;
comment on function public.count_lead_documents(text, text) is
  'Server only (LEAD_API_SECRET): number of uploaded identity documents (kind id_document, status uploaded) of the in-progress lead owning the token.';
alter function public.count_lead_documents(text, text) owner to postgres;
revoke all on function public.count_lead_documents(text, text) from public, anon, authenticated;
grant execute on function public.count_lead_documents(text, text) to anon, authenticated;
