-- Safe to rerun in SQL Editor; existing ticket email records are preserved.
begin;

create table if not exists public.ticket_email_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  fingerprint text not null,
  recipient text not null,
  tickets jsonb not null,
  created_at timestamptz not null default now(),
  attempted_at timestamptz not null default now(),
  accepted_at timestamptz,
  provider_id text,
  primary key (user_id, request_id)
);
alter table public.ticket_email_jobs enable row level security;
revoke all on public.ticket_email_jobs from anon, authenticated;
grant all on public.ticket_email_jobs to service_role;

-- Only the Edge Function may create jobs. Serialize requests per user so
-- retries and rate limits work even with concurrent calls.
create or replace function public.claim_ticket_email(
  p_user_id uuid, p_request_id uuid, p_fingerprint text, p_recipient text, p_tickets jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  job public.ticket_email_jobs;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into job from public.ticket_email_jobs where user_id = p_user_id and request_id = p_request_id;
  if found then
    if job.fingerprint <> p_fingerprint or job.recipient <> p_recipient then
      return jsonb_build_object('error', 'order_conflict');
    end if;
    if job.accepted_at is not null then
      return jsonb_build_object('accepted', true, 'tickets', job.tickets, 'recipient', job.recipient);
    end if;
    -- Resend keeps idempotency keys for 24 hours; do not retry past that window.
    if job.created_at < now() - interval '23 hours' then
      return jsonb_build_object('error', 'retry_expired');
    end if;
    if job.attempted_at > now() - interval '30 seconds' then
      return jsonb_build_object('error', 'in_progress');
    end if;
    update public.ticket_email_jobs set attempted_at = now() where user_id = p_user_id and request_id = p_request_id;
  else
    if (select count(*) from public.ticket_email_jobs where user_id = p_user_id and created_at > now() - interval '1 hour') >= 5 then
      return jsonb_build_object('error', 'rate_limit');
    end if;
    insert into public.ticket_email_jobs (user_id, request_id, fingerprint, recipient, tickets)
      values (p_user_id, p_request_id, p_fingerprint, p_recipient, p_tickets) returning * into job;
  end if;
  return jsonb_build_object('accepted', false, 'tickets', job.tickets, 'recipient', job.recipient);
end;
$$;
revoke all on function public.claim_ticket_email(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_ticket_email(uuid, uuid, text, text, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
