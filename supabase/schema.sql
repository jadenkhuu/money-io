-- money-io database schema. Run this in the Supabase SQL Editor (paste the whole
-- file and hit Run). Safe to run once on a fresh project.
--
-- One row per manual entry, mapped 1:1 onto the Transaction/Split model in
-- src/lib/data.ts. Row Level Security scopes every row to the user who owns it.

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null
                  references auth.users (id) on delete cascade
                  default auth.uid(),
  amount        numeric(12,2) not null,        -- signed: + income, − expense (your real share for splits)
  title         text not null default '',      -- '' when blank
  note          text not null default '',      -- '' when blank
  category      text not null default '',      -- '' = uncategorised
  date          date not null default current_date,  -- attribution day
  -- Split: present when you paid for others. owed = what others owe you back.
  split_owed    numeric(12,2)                   -- null = no split
                  check (split_owed is null or split_owed >= 0),
  split_settled boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Activity log reads newest-first, per user.
create index transactions_user_date_idx
  on public.transactions (user_id, date desc, created_at desc);

-- Row Level Security: a user can only read/write their own rows.
alter table public.transactions enable row level security;

create policy "select own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);
