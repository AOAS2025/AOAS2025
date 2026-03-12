-- AOAS CRM migration
-- Run this in Supabase SQL Editor for existing projects.

begin;

alter table public.crm_accounts
  add column if not exists failed_reset_attempts integer not null default 0,
  add column if not exists reset_locked_until timestamptz;

alter table public.crm_hired_profiles
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text not null default '',
  add column if not exists revoked_reason text not null default '',
  add column if not exists revoke_note text not null default '';

create index if not exists idx_crm_hired_profiles_participant
  on public.crm_hired_profiles (participant_id);

create index if not exists idx_crm_hired_profiles_revoked
  on public.crm_hired_profiles (revoked_at desc);

create index if not exists idx_crm_hired_profiles_active
  on public.crm_hired_profiles (request_id, hired_at desc)
  where revoked_at is null;

drop trigger if exists trg_crm_hired_profiles_touch on public.crm_hired_profiles;
create trigger trg_crm_hired_profiles_touch
before update on public.crm_hired_profiles
for each row execute procedure public.touch_updated_at();

do $$
declare
  event_type_check_name text;
begin
  select con.conname
    into event_type_check_name
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum = any (con.conkey)
  where con.conrelid = 'public.crm_client_request_events'::regclass
    and con.contype = 'c'
    and att.attname = 'event_type'
  limit 1;

  if event_type_check_name is not null then
    execute format(
      'alter table public.crm_client_request_events drop constraint %I',
      event_type_check_name
    );
  end if;
end $$;

alter table public.crm_client_request_events
  add constraint crm_client_request_events_event_type_check
  check (event_type in ('submitted', 'approved', 'scheduled', 'declined', 'finalized', 'revoked'));

commit;
