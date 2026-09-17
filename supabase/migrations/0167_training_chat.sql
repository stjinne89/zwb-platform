-- Coachchat in ZWBeter Worden: één doorlopend gesprek per lid.
--
-- Waarom een gesprek en niet nóg een tekstveld. De redenering achter een schema
-- staat nu in training_plans.summary, als "Let op: "-alinea's die plan-summary.ts
-- er weer uithaalt en PlanCautions bij de eerstvolgende workout toont. Dat is
-- eenrichtingsverkeer: een lid dat wil weten waarom er vandaag negentig minuten
-- staat terwijl er twee uur beschikbaar is, kan die vraag nergens stellen. En wie
-- iets wéét wat het schema zou moeten weten (ziek geweest, een week weg), kan dat
-- alleen indirect kwijt via de beschikbaarheidsschuifjes.
--
-- Het lid stelt de vraag, de AI-coach antwoordt met het eigen schema als context,
-- en de aangewezen trainer leest mee en kan er zelf in reageren.
--
-- profile_id en niet athlete_id: gelijk aan training_plans, training_workouts en
-- training_goals, én daardoor gratis meegenomen in de AVG-export, die over elke
-- tabel met een profile_id-kolom loopt (src/app/api/account/export/route.ts).

create table if not exists public.training_chat_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Null bij een antwoord van de AI-coach; die is geen profiel.
  author_id uuid references public.profiles(id) on delete set null,
  role text not null check (role in ('member', 'trainer', 'coach')),
  -- Leeg zolang een coach-antwoord nog bij OpenAI draait; zie status.
  body text not null default '',
  status text not null default 'sent'
    check (status in ('sent', 'pending', 'failed')),
  -- Het schema waar het gesprek op dat moment over ging. Een herziening maakt een
  -- nieuw plan, dus zonder deze kolom is later niet meer te zien bij welke versie
  -- een vraag hoorde.
  plan_id uuid references public.training_plans(id) on delete set null,
  -- Alleen bij role='coach': welk model antwoordde en welke achtergrondresponse
  -- van OpenAI erbij hoort.
  model text,
  response_id text,
  -- Het lid vinkte "dit raakt mijn schema" aan.
  affects_plan boolean not null default false,
  -- Wat requestReplan() ermee deed: started | no_plan | cooldown | ignored | failed.
  -- Bewaard zodat het lid achteraf nog kan zien of er echt een herziening kwam.
  replan_result text,
  created_at timestamptz not null default now()
);

create index if not exists training_chat_messages_profile_idx
  on public.training_chat_messages (profile_id, created_at);

-- De GET-route handelt openstaande coach-antwoorden af; die moet hij goedkoop
-- kunnen vinden.
create index if not exists training_chat_messages_pending_idx
  on public.training_chat_messages (created_at)
  where status = 'pending';

-- Eigen toegangsfunctie, bewust níét current_user_can_train_profile() uit 0037.
--
-- Die functie laat óók iedereen met training.manage_assignments meelezen —
-- bestuur en communitybeheer. Voor schema's en belasting is dat verdedigbaar:
-- dat zijn cijfers. Een chat is vrije tekst waarin gezondheid en privéomstandig-
-- heden voorbijkomen, en de privacyverklaring belooft het lid dat zoiets bij hem
-- en zijn aangewezen trainer blijft. Dus alleen die twee.
create or replace function public.current_user_in_training_chat(target_profile uuid)
returns boolean language sql stable as $$
  select
    auth.uid() = target_profile
    or exists (
      select 1
      from public.training_coach_assignments tca
      where tca.athlete_id = target_profile
        and tca.trainer_id = auth.uid()
        and tca.status = 'active'
    );
$$;

alter table public.training_chat_messages enable row level security;

drop policy if exists "training_chat_select" on public.training_chat_messages;
create policy "training_chat_select" on public.training_chat_messages
  for select to authenticated
  using (public.current_user_in_training_chat(profile_id));

-- Verwijderen doet alleen de auteur, en dus nooit bij een coach-antwoord
-- (author_id is daar null): losse antwoorden weghalen laat een gesprek achter
-- waarin vragen zonder antwoord staan.
drop policy if exists "training_chat_delete_own" on public.training_chat_messages;
create policy "training_chat_delete_own" on public.training_chat_messages
  for delete to authenticated
  using (author_id is not null and author_id = auth.uid());

-- Schrijven heeft bewust geen policy: dat loopt uitsluitend via de service-role
-- in /api/training/chat, ná een expliciete controle op de koppeling. Zelfde
-- patroon als de rest van dit project.

-- Realtime, zodat een antwoord binnenkomt zonder verversen. Net als bij
-- event_chat_messages (0058) is de melding alleen een seintje: de client haalt
-- daarna zelf de berichten op.
do $$
begin
  begin
    alter publication supabase_realtime add table public.training_chat_messages;
  exception when duplicate_object then null;
  end;
end$$;

-- Een eigen voorkeur, los van on_training_plan: wie meldingen over zijn schema
-- wil maar niet over elk chatbericht, moet dat kunnen scheiden.
alter table public.notification_preferences
  add column if not exists on_training_chat boolean not null default true;

notify pgrst, 'reload schema';
