create table if not exists public.rate_limit_counters (
  subject_hash bytea not null,
  window_kind varchar(32) not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (subject_hash, window_kind, window_start),
  constraint rate_limit_subject_hash_length check (octet_length(subject_hash) = 32),
  constraint rate_limit_request_count_positive check (request_count > 0),
  constraint rate_limit_expiry_after_window check (expires_at > window_start)
);

create index if not exists rate_limit_counters_expiry_idx
  on public.rate_limit_counters (expires_at);

revoke all on public.rate_limit_counters from public;
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format(
        'revoke all on public.rate_limit_counters from %I',
        role_name
      );
    end if;
  end loop;
end
$$;
grant select, insert, update, delete on public.rate_limit_counters
  to wishtoday_auth_repository;
