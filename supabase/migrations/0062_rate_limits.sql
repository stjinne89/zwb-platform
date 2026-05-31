-- F5 — Rate limiting. Fixed-window teller per (bucket, sleutel). Atomair via een
-- security-definer functie zodat de teller niet te omzeilen is. De tabel zelf is
-- afgeschermd (RLS aan, geen policies → alleen de functie/serice-role komt erbij).

create table if not exists public.rate_limits (
  bucket text not null,          -- bv. 'signup', 'chat', 'scrape'
  key text not null,             -- identifier: ip-adres of profiel-id
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket, key, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- Geen policies: directe toegang geweigerd; alleen via rate_limit_hit() (definer).

-- Registreert een hit en geeft terug of die nog binnen het maximum valt.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_key text,
  p_window_seconds int,
  p_max int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count int;
begin
  insert into public.rate_limits (bucket, key, window_start, count)
  values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

-- Opruimen van oude venster-rijen (aanroepen vanuit de bestaande cleanup-cron).
create or replace function public.rate_limit_cleanup()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
