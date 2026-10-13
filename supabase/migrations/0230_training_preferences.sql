-- Persoonlijke voorkeuren van een renner: wat het schema over dit lid moet weten
-- en wat nergens anders in de app staat.
--
-- Waarom een eigen tabel. Wat een lid in de coachchat vertelde ("in de winter
-- motiveren indoor races mij meer dan lange duurritten") ging hooguit één keer
-- mee: de eerste 120 tekens van een aangevinkt bericht, als reden van één
-- herziening. Daarna was het weg. Het doel kent alleen uren, dagen en een
-- intensiteit in drie standen. Wat een renner van zichzelf weet en wat een
-- trainer over hem weet, had dus geen plek waar elke volgende generatie het
-- terugvindt.
--
-- Elke rij is één voorkeur in gewone taal, van het lid zelf of van een
-- aangewezen trainer. Ze gaan mee in elke schemageneratie
-- (preferencesForAi() in src/lib/training/preferences.ts) en staan voor lid en
-- trainer op het tabblad Uitgangspunten.
--
-- profile_id en niet athlete_id: gelijk aan de andere training_*-tabellen.

create table if not exists public.training_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Blijft de voorkeur staan als de trainer zijn account opheft: het lid ziet
  -- hem nog en kan hem weghalen.
  author_id uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('member', 'trainer')),
  body text not null check (char_length(body) between 1 and 1000),
  -- 'chat' = vastgelegd met het vinkje in de coachchat.
  source text not null default 'manual' check (source in ('manual', 'chat')),
  created_at timestamptz not null default now()
);

create index if not exists training_preferences_profile_idx
  on public.training_preferences (profile_id, created_at);

alter table public.training_preferences enable row level security;

-- Zelfde kring als de coachchat (0167): het lid en zijn aangewezen trainers,
-- niet iedereen met training.manage_assignments. Het is vrije tekst waarin
-- gezondheid en privéomstandigheden kunnen staan.
drop policy if exists "training_preferences_select" on public.training_preferences;
create policy "training_preferences_select" on public.training_preferences
  for select to authenticated
  using (public.current_user_in_training_chat(profile_id));

-- Schrijven en verwijderen hebben bewust geen policy: dat loopt via de
-- service-role in de server-actions, na een controle op de koppeling. Zelfde
-- patroon als de coachchat.

notify pgrst, 'reload schema';
