-- ZWBriljant: per week je score en het niveau per facet, en of je je steen met
-- andere deelnemers deelt. De score is een niveau met decimalen (4,5 = niveau 4,
-- halverwege naar 5), zonder plafond. De rekenregels staan in src/lib/briljant.
--
-- Wat hier bewust niet staat:
--
-- * Geen ruwe waarden. Geen watt, W/kg, gewicht, CTL, ZRS of HRV: alleen het
--   niveau per facet, de score en de consistentie (0–1). Wat er aan bronnen was,
--   staat als ja/nee in `provenance`, zonder getal.
-- * Geen vorm of vermoeidheid. Die is het weer op je eigen steen en wordt bij het
--   openen live berekend, nooit bewaard.
-- * Geen schrijfrechten voor leden. Snapshots komen alleen van de server
--   (service_role): zo kan niemand zijn eigen score ophogen.
--
-- Delen gebeurt bij het lezen (zwbriljant_shares): wie de toestemming intrekt
-- of zijn steen verbergt, is meteen voor niemand meer zichtbaar. De eigen historie
-- blijft van het lid. Het lid mag zijn eigen snapshots wissen (RLS hieronder);
-- een knop daarvoor is er bewust nog niet (eigenaar, 2026-10-21).

create table if not exists public.zwbriljant_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- Null: alleen voor jezelf. Gezet: je deelt je steen met andere deelnemers.
  consent_version text check (consent_version is null or consent_version = '2026-10-21'),
  -- Met toestemming toch even verbergen, zonder de toestemming op te geven.
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zwbriljant_snapshots (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Maandag van de week (Amsterdam). Een terugblik gebruikt de maandag van de
  -- week waarin de periode eindigt.
  week date not null check (extract(isodow from week) = 1),
  -- Null: te weinig facetten voor een score. Geen plafond, wel een grens tegen
  -- onzin.
  score numeric(5, 2) check (score is null or score between 0 and 100),
  -- {"sprint": 4.8, "durability": null, ...}; alleen de zeven facetten.
  facets jsonb not null check (
    jsonb_typeof(facets) = 'object'
    and facets - array['sprint', 'anaeroob', 'vo2max', 'drempel', 'durability', 'fitheid', 'racen'] = '{}'::jsonb
  ),
  consistency numeric check (consistency is null or consistency between 0 and 1),
  source text not null check (source in ('week', 'terugblik')),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  primary key (profile_id, week)
);

create index if not exists zwbriljant_snapshots_week_idx
  on public.zwbriljant_snapshots (week desc);

drop trigger if exists zwbriljant_preferences_touch on public.zwbriljant_preferences;
create trigger zwbriljant_preferences_touch
  before update on public.zwbriljant_preferences
  for each row execute function public.touch_training_updated_at();

-- Deelt dit lid zijn steen op dit moment? Security definer: de voorkeuren zelf
-- zijn alleen voor het lid leesbaar.
create or replace function public.zwbriljant_shares(p_profile uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.zwbriljant_preferences pref
    join public.profiles p on p.id = pref.profile_id
    where pref.profile_id = p_profile
      and pref.consent_version = '2026-10-21'
      and pref.visible
      and p.is_approved
  )
$$;

revoke all on function public.zwbriljant_shares(uuid) from public, anon;
grant execute on function public.zwbriljant_shares(uuid) to authenticated;

alter table public.zwbriljant_preferences enable row level security;
alter table public.zwbriljant_snapshots enable row level security;

revoke all on public.zwbriljant_preferences, public.zwbriljant_snapshots from anon, authenticated;
grant select, insert, update, delete on public.zwbriljant_preferences to authenticated;
grant select, delete on public.zwbriljant_snapshots to authenticated;
grant all on public.zwbriljant_preferences, public.zwbriljant_snapshots to service_role;

drop policy if exists "zwbriljant_preferences_own" on public.zwbriljant_preferences;
create policy "zwbriljant_preferences_own" on public.zwbriljant_preferences
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
  );

-- Je eigen steen altijd; die van een ander alleen als jullie allebei delen.
drop policy if exists "zwbriljant_snapshots_read" on public.zwbriljant_snapshots;
create policy "zwbriljant_snapshots_read" on public.zwbriljant_snapshots
  for select to authenticated using (
    profile_id = (select auth.uid())
    or (
      public.zwbriljant_shares(profile_id)
      and public.zwbriljant_shares((select auth.uid()))
    )
  );

-- Wissen mag alleen je eigen steen.
drop policy if exists "zwbriljant_snapshots_delete" on public.zwbriljant_snapshots;
create policy "zwbriljant_snapshots_delete" on public.zwbriljant_snapshots
  for delete to authenticated using (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select tablename, rowsecurity from pg_tables where tablename like 'zwbriljant_%';  -- overal true
-- select has_function_privilege('anon', 'public.zwbriljant_shares(uuid)', 'execute');  -- false
