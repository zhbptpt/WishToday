do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'wishtoday_auth_repository') then
    create role wishtoday_auth_repository nologin;
  end if;
end
$$;

grant usage on schema public to wishtoday_auth_repository;
do $$
begin
  if not pg_has_role(current_user, 'wishtoday_auth_repository', 'usage') then
    execute format(
      'grant wishtoday_auth_repository to %I',
      current_user
    );
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(320) not null,
  email_normalized varchar(320) not null,
  email_verified_at timestamptz,
  status varchar(16) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_normalized_unique unique (email_normalized),
  constraint users_email_normalized_canonical check (
    email_normalized = lower(btrim(email_normalized))
    and length(email_normalized) between 3 and 320
  ),
  constraint users_status_valid check (status in ('active', 'disabled')),
  constraint users_verified_after_creation check (
    email_verified_at is null or email_verified_at >= created_at
  )
);

create table if not exists public.password_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  password_hash varchar(512) not null,
  algorithm varchar(32) not null default 'argon2id',
  parameters_version smallint not null default 1,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint password_credentials_algorithm_valid check (algorithm = 'argon2id'),
  constraint password_credentials_parameters_version_positive check (parameters_version > 0),
  constraint password_credentials_hash_not_plaintext check (
    password_hash like '$argon2id$%'
  )
);

create table if not exists public.account_security (
  user_id uuid primary key references public.users(id) on delete cascade,
  session_version integer not null default 1,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_security_session_version_positive check (session_version > 0),
  constraint account_security_failed_login_count_nonnegative check (failed_login_count >= 0)
);

revoke all on public.users, public.password_credentials, public.account_security from public;
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format(
        'revoke all on public.users, public.password_credentials, public.account_security from %I',
        role_name
      );
    end if;
  end loop;
end
$$;
grant select, insert, update, delete
  on public.users, public.password_credentials, public.account_security
  to wishtoday_auth_repository;
