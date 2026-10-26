-- 1A Traveller: "Register your interest" emails from the 1atraveller.com page
-- Run once in Supabase → SQL Editor (the same project as the app). Safe to run again.

create table if not exists public.interest_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,                                   -- where the visitor came from, if known
  created_at timestamptz not null default now()
);
-- One row per email address, whatever the capitals
create unique index if not exists interest_signups_email_key on public.interest_signups (lower(email));

-- Nobody can read or change the list from the website: row-level security
-- is on and there are no policies. View it in Supabase → Table Editor.
alter table public.interest_signups enable row level security;

-- The page saves an email only through this function.
-- Returns 'added', 'exists' (already on the list) or 'invalid'.
create or replace function public.register_interest(p_email text, p_source text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
begin
  if length(e) < 6 or length(e) > 254 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid';
  end if;
  insert into public.interest_signups (email, source)
  values (e, nullif(left(trim(coalesce(p_source, '')), 100), ''))
  on conflict ((lower(email))) do nothing;
  if found then return 'added'; end if;
  return 'exists';
end;
$$;

revoke all on function public.register_interest(text, text) from public;
grant execute on function public.register_interest(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
