begin;

do $$
declare
  first_user_id uuid;
  second_user_id uuid;
  first_operation_id uuid;
begin
  insert into public.users (email, email_normalized)
  values ('first@example.com', 'first@example.com')
  returning id into first_user_id;

  begin
    insert into public.users (email, email_normalized)
    values ('FIRST@example.com', 'first@example.com');
    raise exception 'expected normalized email uniqueness violation';
  exception
    when unique_violation then null;
  end;

  insert into public.users (email, email_normalized)
  values ('second@example.com', 'second@example.com')
  returning id into second_user_id;

  begin
    insert into public.account_security (user_id, session_version)
    values (first_user_id, 0);
    raise exception 'expected positive session_version constraint violation';
  exception
    when check_violation then null;
  end;

  insert into public.account_security (user_id, session_version)
  values (first_user_id, 1);

  insert into public.email_verification_tokens (
    user_id,
    token_hash,
    expires_at
  ) values (
    first_user_id,
    decode(repeat('ab', 32), 'hex'),
    now() + interval '1 hour'
  );

  begin
    insert into public.email_verification_tokens (
      user_id,
      token_hash,
      expires_at
    ) values (
      second_user_id,
      decode(repeat('ab', 32), 'hex'),
      now() + interval '1 hour'
    );
    raise exception 'expected verification token hash uniqueness violation';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.email_verification_tokens (
      user_id,
      token_hash,
      expires_at
    ) values (
      second_user_id,
      decode(repeat('cd', 32), 'hex'),
      now() - interval '1 second'
    );
    raise exception 'expected token expiry constraint violation';
  exception
    when check_violation then null;
  end;

  begin
    update public.email_verification_tokens
    set used_at = created_at - interval '1 second'
    where user_id = first_user_id;
    raise exception 'expected token consumption timestamp constraint violation';
  exception
    when check_violation then null;
  end;

  begin
    update public.email_verification_tokens
    set used_at = expires_at + interval '1 second'
    where user_id = first_user_id;
    raise exception 'expected token consumption before expiry constraint violation';
  exception
    when check_violation then null;
  end;

  insert into public.password_reset_operations (user_id)
  values (first_user_id)
  returning id into first_operation_id;

  insert into public.password_reset_tokens (
    operation_id,
    user_id,
    token_hash,
    expires_at,
    status_query_expires_at
  ) values (
    first_operation_id,
    first_user_id,
    decode(repeat('ef', 32), 'hex'),
    now() + interval '30 minutes',
    now() + interval '1 hour'
  );

  begin
    insert into public.password_reset_tokens (
      operation_id,
      user_id,
      token_hash,
      expires_at,
      status_query_expires_at
    ) values (
      gen_random_uuid(),
      second_user_id,
      decode(repeat('ef', 32), 'hex'),
      now() + interval '30 minutes',
      now() + interval '1 hour'
    );
    raise exception 'expected recovery token hash uniqueness violation';
  exception
    when unique_violation then null;
  end;
end
$$;

rollback;
