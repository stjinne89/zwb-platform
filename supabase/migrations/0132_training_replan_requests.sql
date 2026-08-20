-- Een openstaand verzoek om het schema te herzien.
--
-- Het lid vraagt zo'n herziening indirect aan: het past zijn beschikbaarheid
-- aan, plant zelf een rit in, zegt een clubevent toe of meldt zich er weer voor
-- af. requestReplan() start dan meteen een generatie — maar niet altijd. Er zit
-- een cooldown van vijf minuten op (een lid dat wat zit te schuiven mag niet
-- vijf generaties per minuut afvuren), de generatie loopt in de achtergrond en
-- moet door de browser van het lid worden opgehaald, en een call kan mislukken.
-- In al die gevallen was de wijziging wél opgeslagen maar nooit ingepland.
--
-- Tot 0132 werd dat afgeleid uit tijdstempels: is de beschikbaarheid nieuwer dan
-- de laatste herziening? Dat werkt voor een gewijzigde rij, maar niet voor een
-- afmelding: syncEventWorkout() vérwijdert het blok, en aan een rij die er niet
-- meer is valt niets af te lezen. Vandaar dat het verzoek zelf wordt vastgelegd.
--
-- Eén rij per lid: meerdere wijzigingen op een avond horen samen één herziening
-- op te leveren, niet vier. De nieuwste reden wint, want die beschrijft de
-- laatste stand van zaken.

create table if not exists public.training_replan_requests (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  requested_at timestamptz not null default now()
);

-- De nacht-cron loopt de openstaande verzoeken langs op ouderdom.
create index if not exists training_replan_requests_requested_idx
  on public.training_replan_requests (requested_at);

alter table public.training_replan_requests enable row level security;

-- Lezen mag het lid zelf en zijn trainer, net als bij de andere training_*-tabellen.
drop policy if exists "training_replan_requests_select" on public.training_replan_requests;
create policy "training_replan_requests_select" on public.training_replan_requests
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));

-- Schrijven doet niemand met de hand: de rij wordt gezet door requestReplan() en
-- weggehaald zodra er een herziening uit is gekomen, allebei met de service-role
-- die RLS omzeilt. Daarom staan er bewust geen insert/update/delete-policies.

notify pgrst, 'reload schema';
