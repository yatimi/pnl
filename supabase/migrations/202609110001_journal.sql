-- Created by Tommy. New PostgreSQL database; legacy D1 migrations remain immutable.
create table public.journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-f0-9]{32}$'),
  date date not null check (date >= '2000-01-01' and date < '2100-01-01'),
  category text not null check (category in ('trading', 'salary', 'other')),
  amount bigint not null check (amount between -99999999999 and 99999999999),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'UAH')),
  note text not null default '' check (length(note) <= 500),
  primary key (user_id, id),
  check (category = 'trading' or amount >= 0)
);
create index journal_entries_user_date_idx on public.journal_entries(user_id, date);
alter table public.journal_entries enable row level security;
alter table public.journal_entries force row level security;
revoke all on public.journal_entries from anon;
grant select, insert, update, delete on public.journal_entries to authenticated;
create policy "Read own entries" on public.journal_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Insert own entries" on public.journal_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own entries" on public.journal_entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own entries" on public.journal_entries for delete to authenticated
  using ((select auth.uid()) = user_id);
