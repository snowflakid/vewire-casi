-- Copy and paste this into the SQL Editor in your Supabase Dashboard

-- 1. Create the Users table
create table public.users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text unique not null,
  password_hash text not null, -- In a real app, use Supabase Auth! This is for prototype compatibility.
  balance numeric default 1000,
  weekly_balance numeric default 100,
  in_weekly_challenge boolean default false,
  total_bets bigint default 0,
  total_wagered numeric default 0,
  total_wins bigint default 0,
  theme text default 'default'
);

-- 2. Enable Row Level Security (RLS) is recommended, but for this prototype we will allow public access 
--    (since we are handling auth manually in the app for now).
--    WARNNG: This means anyone with your anon key can read/write this table. 
--    For a real casino, you MUST use Supabase Auth and RLS policies.

alter table public.users enable row level security;

create policy "Enable access to all users"
on public.users
for all
using (true)
with check (true);
