create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_id uuid not null default gen_random_uuid(),
  refresh_token_hash bytea unique,
  rotation_counter integer not null default 0,
  session_version integer not null,
  device_summary varchar(256),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_sessions_refresh_hash_length check (
    refresh_token_hash is null or octet_length(refresh_token_hash) = 32
  ),
  constraint auth_sessions_rotation_nonnegative check (rotation_counter >= 0),
  constraint auth_sessions_version_positive check (session_version > 0),
  constraint auth_sessions_expiry_after_creation check (expires_at > created_at),
  constraint auth_sessions_revoked_after_creation check (
    revoked_at is null or revoked_at >= created_at
  )
);

create index if not exists auth_sessions_user_active_idx
  on public.auth_sessions (user_id, expires_at)
  where revoked_at is null;

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_verification_hash_length check (octet_length(token_hash) = 32),
  constraint email_verification_expiry_after_creation check (expires_at > created_at),
  constraint email_verification_used_after_creation check (
    used_at is null or used_at >= created_at
  ),
  constraint email_verification_used_before_expiry check (
    used_at is null or used_at <= expires_at
  )
);

create unique index if not exists email_verification_one_active_per_user
  on public.email_verification_tokens (user_id)
  where used_at is null;

create table if not exists public.password_reset_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status varchar(16) not null default 'pending',
  target_session_version integer,
  result_code varchar(64),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint password_reset_operation_status_valid check (
    status in ('pending', 'completed', 'failed')
  ),
  constraint password_reset_target_version_positive check (
    target_session_version is null or target_session_version > 0
  ),
  constraint password_reset_completion_consistent check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique references public.password_reset_operations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  status_query_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint password_reset_hash_length check (octet_length(token_hash) = 32),
  constraint password_reset_expiry_after_creation check (expires_at > created_at),
  constraint password_reset_query_after_expiry check (status_query_expires_at >= expires_at),
  constraint password_reset_used_after_creation check (
    used_at is null or used_at >= created_at
  ),
  constraint password_reset_used_before_expiry check (
    used_at is null or used_at <= expires_at
  )
);

revoke all on public.auth_sessions,
  public.email_verification_tokens,
  public.password_reset_operations,
  public.password_reset_tokens
  from public;
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format(
        'revoke all on public.auth_sessions, public.email_verification_tokens, public.password_reset_operations, public.password_reset_tokens from %I',
        role_name
      );
    end if;
  end loop;
end
$$;
grant select, insert, update, delete
  on public.auth_sessions,
  public.email_verification_tokens,
  public.password_reset_operations,
  public.password_reset_tokens
  to wishtoday_auth_repository;
