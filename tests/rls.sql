-- Created by Tommy. Run only against an isolated PostgreSQL test database.
\set ON_ERROR_STOP on
begin;
create schema auth;
create role anon nologin;
create role authenticated nologin;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
\ir ../supabase/migrations/202609110001_journal.sql
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.journal_entries values
('11111111-1111-4111-8111-111111111111', repeat('a',32), '2026-09-01', 'trading', 12345, 'EUR', 'private');
do $$ begin
  begin
    insert into public.journal_entries values ('22222222-2222-4222-8222-222222222222', repeat('b',32), '2026-09-01', 'trading', 1, 'USD', '');
    raise exception 'Cross-user insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.journal_entries set user_id = '22222222-2222-4222-8222-222222222222';
    raise exception 'Owner reassignment succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.journal_entries values ('11111111-1111-4111-8111-111111111111', repeat('c',32), '2026-09-01', 'salary', -1, 'USD', '');
    raise exception 'Negative salary accepted';
  exception when check_violation then null; end;
  begin
    update public.journal_entries set currency = 'GBP';
    raise exception 'Unsupported currency accepted';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  if exists (select 1 from public.journal_entries) then raise exception 'Another user can read records'; end if;
end $$;
update public.journal_entries set amount = 999;
delete from public.journal_entries;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin
  if (select amount from public.journal_entries where id = repeat('a',32)) != 12345 then raise exception 'Another user changed a record'; end if;
end $$;
update public.journal_entries set amount = 100, currency = 'UAH';
delete from public.journal_entries;
reset role;
set local role anon;
do $$ begin
  begin
    perform * from public.journal_entries;
    raise exception 'Anonymous read succeeded';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
