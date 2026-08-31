-- De jaarplanning: wat er boven één trainingsschema hangt.
--
-- Tot nu toe kende het trainingsdeel precies één horizon: een doel
-- (training_goals) met één target_date, waar buildTrainingInput() de planperiode
-- uit afleidt. Daarboven zat niets. Een lid kon nergens kwijt dat het in juli
-- twee weken weg is, dat de gran fondo in mei het echte mikpunt is en de
-- ZRL-ronde in maart alleen meegepakt wordt, of dat er in november een
-- winterstop zit.
--
-- Voor amateurs is dat juist de laag die telt. Hun jaar wordt niet gestuurd door
-- een piek maar door vakanties, drukke werkweken en een winterstop. Een schema
-- dat daar niets van weet plant een opbouwblok dwars door de zomervakantie, het
-- lid haalt het niet, en de nalevingslogica concludeert vervolgens dat het
-- schema te zwaar was — precies de verkeerde conclusie.
--
-- Twee tabellen, en bewust géén derde tabel voor "het jaarplan zelf". Zo'n
-- container zou het lid dwingen eerst een jaarplan aan te maken voordat het één
-- vakantie kan invullen, terwijl het venster gewoon uit de datums volgt. De
-- jaarplanning is het beeld dat je uit deze rijen tekent, niet een rij.

-- Mikpunten: één datum met een prioriteit. Optioneel gekoppeld aan een clubevent
-- uit de kalender, en aan het doel dat er uiteindelijk voor is aangemaakt.
create table if not exists public.training_season_targets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  goal_id uuid references public.training_goals(id) on delete set null,
  title text not null,
  target_date date not null,
  -- 'a' = piekdag (hier wordt naartoe getaperd), 'b' = belangrijk maar geen
  -- piek, 'c' = meedoen zonder dat de opbouw erop wordt aangepast.
  priority text not null default 'b' check (priority in ('a', 'b', 'c')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

-- Eén mikpunt per lid per clubevent; hetzelfde event twee keer op de tijdlijn is
-- geen mikpunt maar een fout. Handmatige mikpunten (event_id null) mogen wél
-- naast elkaar bestaan, vandaar de partiële index — zelfde truc als
-- training_workouts_event_unique in 0116.
create unique index if not exists training_season_targets_event_unique
  on public.training_season_targets (profile_id, event_id)
  where event_id is not null;

create index if not exists training_season_targets_date_idx
  on public.training_season_targets (profile_id, target_date);

-- Periodes waarin niet of minder getraind wordt.
create table if not exists public.training_season_periods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  -- 'rust' = niet of nauwelijks fietsen (vakantie, winterstop), 'rustig' =
  -- ongeveer de helft van het normale weekvolume (drukke werkweken).
  kind text not null check (kind in ('rust', 'rustig')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint training_season_periods_range check (end_date >= start_date)
);

create index if not exists training_season_periods_range_idx
  on public.training_season_periods (profile_id, start_date, end_date);

drop trigger if exists training_season_targets_touch on public.training_season_targets;
create trigger training_season_targets_touch
  before update on public.training_season_targets
  for each row execute function public.touch_training_updated_at();

drop trigger if exists training_season_periods_touch on public.training_season_periods;
create trigger training_season_periods_touch
  before update on public.training_season_periods
  for each row execute function public.touch_training_updated_at();

alter table public.training_season_targets enable row level security;
alter table public.training_season_periods enable row level security;

-- Lezen mag het lid zelf en zijn trainer, net als bij de andere training_*-tabellen.
drop policy if exists "training_season_targets_select" on public.training_season_targets;
create policy "training_season_targets_select" on public.training_season_targets
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

drop policy if exists "training_season_periods_select" on public.training_season_periods;
create policy "training_season_periods_select" on public.training_season_periods
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

-- Schrijven doet het lid zelf. Net als bij training_availability is dit geen
-- trainerswerk: het gaat over de agenda en de vakanties van het lid. De trainer
-- kijkt mee en denkt mee, maar zet niemands vakantie op een andere week.
drop policy if exists "training_season_targets_insert" on public.training_season_targets;
create policy "training_season_targets_insert" on public.training_season_targets
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_season_targets_update" on public.training_season_targets;
create policy "training_season_targets_update" on public.training_season_targets
  for update to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_season_targets_delete" on public.training_season_targets;
create policy "training_season_targets_delete" on public.training_season_targets
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_season_periods_insert" on public.training_season_periods;
create policy "training_season_periods_insert" on public.training_season_periods
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_season_periods_update" on public.training_season_periods;
create policy "training_season_periods_update" on public.training_season_periods
  for update to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_season_periods_delete" on public.training_season_periods;
create policy "training_season_periods_delete" on public.training_season_periods
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

notify pgrst, 'reload schema';
