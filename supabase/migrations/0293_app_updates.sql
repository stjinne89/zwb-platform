-- App-updates: elke week kort wat er nieuw is en wat er opgelost is, op
-- /updates en als pop-up vanaf donderdag 17:00 (wens eigenaar, 2026-10-30).
--
-- * Eén update per week (`week_start`, de maandag). Verschijnen doet hij op
--   `publish_at`, de donderdag van die week om 17:00 Nederlandse tijd; de
--   server rekent dat uit (src/lib/app-updates/schedule.ts). Zo kan de update
--   eerder klaarstaan zonder dat leden hem al zien, en hoeft er geen deploy
--   voor.
-- * Wie schrijft: het recht notifications.broadcast, hetzelfde als een
--   pushbericht aan alle leden. Een eigen recht zou de check-constraint van
--   community_role_permissions vragen (zie 0254).
-- * Lezen: elk ingelogd lid, zodra publish_at voorbij is; wie schrijft ziet
--   ook wat nog klaarstaat. Schrijven via de gewone client, de policy checkt
--   het recht.
-- * Geen persoonsgegevens, dus niet in de data-export.

create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start) = 1),
  publish_at timestamptz not null,
  -- De korte tekst in de pop-up.
  summary text not null check (length(btrim(summary)) between 10 and 400),
  -- Eén regel per punt.
  changes text[] not null default '{}',
  fixes text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(changes) + cardinality(fixes) between 1 and 30)
);

create index if not exists app_updates_publish_idx on public.app_updates (publish_at desc);

alter table public.app_updates enable row level security;

revoke all on public.app_updates from anon, authenticated;
grant select, insert, update, delete on public.app_updates to authenticated;
grant all on public.app_updates to service_role;

drop policy if exists "app_updates_select" on public.app_updates;
create policy "app_updates_select" on public.app_updates
  for select to authenticated
  using (
    publish_at <= now()
    or public.current_user_has_permission('notifications.broadcast')
  );

drop policy if exists "app_updates_write" on public.app_updates;
create policy "app_updates_write" on public.app_updates
  for all to authenticated
  using (public.current_user_has_permission('notifications.broadcast'))
  with check (public.current_user_has_permission('notifications.broadcast'));

-- ──────────────────────────────────────────────────────────────────────
-- De geschiedenis tot en met week 44
-- ──────────────────────────────────────────────────────────────────────
--
-- Wat er sinds de start (20 mei) per week bijkwam, uit de tijdlijn "Zo groeide
-- ZWBasis" (stand 17 oktober) en de rondes in PLAN.md daarna. Een week loopt
-- van vrijdag tot en met donderdag, zoals een update op donderdag 17:00. Weken
-- zonder iets voor leden ontbreken. Alleen wat op main staat; wat na 29 oktober
-- 17:00 live ging, hoort in de update van week 45. Bestaat een week al, dan
-- blijft die staan.

insert into public.app_updates (week_start, publish_at, summary, changes, fixes) values
(
  '2026-05-18', '2026-05-21T15:00:00.000Z',
  'De eerste versie van de clubapp staat: een account, je eigen dashboard en de clubkalender.',
  array[
    'Registreren, met goedkeuring door een beheerder.',
    'Je eigen dashboard als startscherm.',
    'Je profiel, en per veld kies je wat andere leden zien.',
    'Kalender met groepsritten en races: aanmelden met Ja of Misschien, routekaart, GPX en het weer op de dag zelf.'
  ],
  '{}'::text[]
),
(
  '2026-05-25', '2026-05-28T15:00:00.000Z',
  'Strava en intervals.icu gekoppeld, badges verdienen, elkaar live volgen op de kaart en een seintje bij nieuwe events.',
  array[
    'Teams met de actuele stand uit de Zwift Racing League en de Club Ladder.',
    'Strava koppelen: je ritten komen vanzelf binnen en leveren weekbadges en mijlpalen op, in brons, zilver, goud en platina.',
    'Training via intervals.icu: je planning en belasting in de app. Een trainer kijkt alleen mee als jij dat toestaat.',
    'Live op de kaart tijdens een buitenrit, met een deelbare liveticker. Je kiest per rit of je zichtbaar bent.',
    'Polls, foto''s bij een rit en pushmeldingen bij nieuwe events en vlak voor de start.',
    'Ledenvoordeel van de sponsors en een prikbord voor Vraag en Aanbod.'
  ],
  '{}'::text[]
),
(
  '2026-06-01', '2026-06-04T15:00:00.000Z',
  'Cols worden vanzelf herkend, je kunt een trainingsschema laten maken en captains stellen hun ploeg samen.',
  array[
    'Cols automatisch herkend, van Alpe d''Huez tot de Limburgse heuvels en de klimmen in Zwift, met je tijd naast die van clubgenoten.',
    'Trainingsschema voor jouw doel, goedgekeurd door een trainer. Workouts gaan door naar je Wahoo of Garmin.',
    'Ritverslagen met foto''s en reacties.',
    'Clubstatistieken: wat de club deze maand samen reed.',
    'Een hulppagina met uitleg.',
    'Teamroosters: geef je beschikbaarheid door, captains stellen de ploeg samen en plannen de ploegentijdrit met de TTT-planner.'
  ],
  '{}'::text[]
),
(
  '2026-06-08', '2026-06-11T15:00:00.000Z',
  'Nieuwe leden krijgen een rondleiding, je ziet je vermogensprofiel en je kunt clubgenoten feliciteren.',
  array[
    'Welkomstrondleiding langs profiel, koppelingen en meldingen.',
    'Inloggen kan ook met een wachtwoord.',
    'Segmentcollecties, live timing op events en je powercurve met records per duur.',
    'Verjaardagen: wie dat wil deelt zijn verjaardag, clubgenoten feliciteren en rijden een verjaardagsrondje mee.'
  ],
  '{}'::text[]
),
(
  '2026-06-15', '2026-06-18T15:00:00.000Z',
  'Races waar clubgenoten voor ingeschreven staan, komen vanzelf op de kalender.',
  array[
    'Eventscan voor Zwift en MyWhoosh: races van clubgenoten op de kalender, met deelnemers en na afloop de uitslag.'
  ],
  '{}'::text[]
),
(
  '2026-06-22', '2026-06-25T15:00:00.000Z',
  'Routes met hoogteprofiel en klimmen, je fietsen met onderhoudsmeldingen en ritten importeren zonder Strava.',
  array[
    'Interactief hoogteprofiel met de klimmen, bezienswaardigheden en Street View, en het weer langs de route.',
    'Je vorm, belasting en de volgende workout op je dashboard.',
    'Je fietsen met hun kilometers. Voeg ketting, cassette, banden of remblokken toe en krijg een melding als iets aan vervanging toe is.',
    'Ritten importeren uit je Strava-export of een los GPX-bestand.'
  ],
  '{}'::text[]
),
(
  '2026-06-29', '2026-07-02T15:00:00.000Z',
  'Het herstel-advies leest je slaap, HRV en rusthartslag nu per apparaat.',
  array[
    'Herstel per apparaat: slaap, HRV en rusthartslag van Garmin, Wahoo, ring of horloge, zodat het advies klopt.'
  ],
  '{}'::text[]
),
(
  '2026-07-27', '2026-07-30T15:00:00.000Z',
  'Trainen krijgt een eigen plek in de app, met maandplanning, een workoutbibliotheek en meer inzicht in je vermogen.',
  array[
    'Een eigen menu voor trainen, met maandplanning en workoutbibliotheek.',
    'Na elke training zie je hoe hij ging en wat hij je kostte.',
    'Hoe je vermogen standhoudt na uren fietsen, en je reserve boven je drempel.',
    'Trainers zien meer van de renners die zij begeleiden.'
  ],
  '{}'::text[]
),
(
  '2026-08-03', '2026-08-06T15:00:00.000Z',
  'De app werkt beter op je telefoon en je training staat klaar in Zwift.',
  array[
    'Grafieken, tabellen en menu''s opnieuw ingericht voor een klein scherm.',
    'Core en mobiliteit als vast onderdeel van je week.',
    'Je training van vandaag staat klaar in Zwift.'
  ],
  '{}'::text[]
),
(
  '2026-08-10', '2026-08-13T15:00:00.000Z',
  'Nieuw: ZWBlokken. En je schema beweegt mee met wat je echt gereden hebt.',
  array[
    'ZWBlokken: elke buitenrit kleurt blokken in op de kaart, voor jou en de club. Start en finish tellen niet mee, voor je privacy.',
    'Herplannen rekent met wat je echt reed, je doel en de afbouw naar je piekdag.',
    'Clubevents komen in je schema zodra je je aanmeldt.'
  ],
  '{}'::text[]
),
(
  '2026-08-17', '2026-08-20T15:00:00.000Z',
  'De app heet voortaan ZWBasis. Ook nieuw: Mijn garage en het ZWB Omnium.',
  array[
    'De naam ZWBasis, gekozen door 56% in de ledenpoll.',
    'Mijn garage: al je fietsen, onderdelen en onderhoud op één pagina.',
    'ZWB Omnium: de clubcompetitie met onderdelen, klassementen en uitslagen.',
    'Per week aangeven hoeveel tijd je hebt om te trainen.',
    'De FTP-test staat op het juiste moment in je schema.'
  ],
  '{}'::text[]
),
(
  '2026-08-31', '2026-09-03T15:00:00.000Z',
  'Een pacingplan bij events, een jaarplanning en meer regie over je eigen schema.',
  array[
    'Pacingplan bij events: je krachten verdeeld over de route, afgestemd op jouw vermogen en de klimmen.',
    'Jaarplanning: je doelen en events van het hele seizoen boven je schema.',
    'Trainingen zelf verwijderen of inkorten.',
    'Kies tussen watt en W/kg, met zonekleuren zoals in Zwift.',
    'Krachtreeksen bij de core-oefeningen.',
    'Filter "Voor mij" op de kalender: de events van jouw teams en aanmeldingen.'
  ],
  '{}'::text[]
),
(
  '2026-09-07', '2026-09-10T15:00:00.000Z',
  'Een nieuwe Strava-rit staat binnen enkele minuten in de app.',
  array[
    'Ritten sneller binnen, met badges, cols en ZWBlokken erbij.'
  ],
  '{}'::text[]
),
(
  '2026-09-14', '2026-09-17T15:00:00.000Z',
  'Coachchat, voeding, ZWBlokken in Zwift en de ZWBgame.',
  array[
    'Pacingplan op maat: afdalingen en geneutraliseerde stukken tellen mee, en vanuit een gewenste eindtijd zie je wat je moet trappen.',
    'ZWBlokken ook in de Zwift-werelden, met titels als Koning(in) van een land of Gouverneur van een provincie.',
    'Coachchat: je vraag aan je trainer, bij je eigen trainingsdata.',
    'Voeding: een kennisbank, recepten bij je trainingsdag en een tip op je dagoverzicht.',
    'ZWBgame: een racespel in de app.'
  ],
  '{}'::text[]
),
(
  '2026-09-21', '2026-09-24T15:00:00.000Z',
  'De ZRL-raceweek op één pagina, de live ZRL-stand en een pacingplan voor Zwift.',
  array[
    'Bij een geplande training zie je passende Zwift-events en rondjes vanaf je voordeur.',
    'Pacingplan voor Zwift: met het raceformat, je fiets, slipstream, wegdek en powerups.',
    'ZRL-raceweek: één event met alle teams, opstelling, racelinks en pacingplan. Aanmelden zet je in je team.',
    'Live ZRL-stand: de punten van je team tijdens de race, voor elk format.',
    'ZWB Omnium klaar voor editie 1, met routes en sprinttijden uit Zwift.'
  ],
  '{}'::text[]
),
(
  '2026-09-28', '2026-10-01T15:00:00.000Z',
  'Live volgen via je eigen fietscomputer, FRR-tours, de Sunday Race Club en meedoen zonder Strava.',
  array[
    'Live op de kaart via de live-functie van je Garmin of Wahoo, zonder aparte app.',
    'FRR-tours met etappes, tijdsloten, klassement en rivalen.',
    '"Jouw races" bovenaan je dashboard.',
    'MyWhoosh Sunday Race Club: elke zondag op de kalender, met teamplanning, uitslagen en een herinnering. Aanmelden met één klik.',
    'Ritten ook via intervals.icu, en meerdere GPX-bestanden tegelijk uploaden.',
    'De nieuwste Instagram-foto''s van de club op je dashboard.',
    'ZWBgame op echte Zwift-routes, met de Club Ladder, ZRL-formats en een FRR-tour.',
    'Strava ontkoppelen: je kiest zelf of je ritten bewaard blijven.',
    'De segmentverkenner is weg: hij maakte de app traag. Collecties en coltijden blijven.'
  ],
  array[
    'Het dashboard, de statistieken en de trainingspagina''s openen sneller.'
  ]
),
(
  '2026-10-05', '2026-10-08T15:00:00.000Z',
  'Een dagmenu met 120 recepten, een voorlopig FRR-klassement, een trainingskamp in je jaarplan en warming-ups per race.',
  array[
    'Ook Instagram-stories en berichten waarin de club getagd is.',
    'Dagmenu dat bij je training past, met 120 recepten, favorieten en je eigen recepten.',
    'Voorlopig FRR-klassement na elke etappe, ook op je dashboard.',
    'Trainingskamp als eigen periode in je jaarplan.',
    'Overal waar een lid genoemd wordt, tik je door naar het profiel.',
    'Warming-up per soort race, met korte bursts.',
    'TTT-plannen van ZwiftGopher overnemen en publiceren voor je team.'
  ],
  array[
    'Komt je rit later binnen via Garmin of Wahoo, dan krijgt je training alsnog de tijd per zone.',
    'De SRC-uitslag blijft 48 uur bij het scorebord staan.'
  ]
),
(
  '2026-10-12', '2026-10-15T15:00:00.000Z',
  'Labels op de kalender, ZWB in je eigen agenda, eetdagboek, protocollen en de eerste ZWBeter racen-analyses.',
  array[
    'Kalender met labels en kleuren: Training, Social en Goed doel. Programma''s bundelen events op één pagina.',
    'ZWB in Google Agenda, Outlook of Apple Agenda met één persoonlijke link.',
    'Lange duurritten met cadans, golvend terrein of variatie. Bloksdoelen in watt, W/kg of % FTP.',
    'Schema''s in blokken van twaalf weken; het volgende blok volgt vanzelf.',
    'Wat je in de coachchat over je wensen zegt, weegt mee in elk nieuw schema.',
    'Eetdagboek, ook met barcode of rond de rit.',
    'Kracht in vier tabs met figuren en een spierkaart.',
    'Protocollen: hittetraining, supplementen, lage cadans en darmtraining.',
    'ZWBeter racen: analyse van elke gereden race, voor de ploeg en je eigen rit.',
    'TTT-bot in Discord en tussentijden in de live ZRL-stand.',
    'Wie weet wat: zie wie verstand heeft van een onderwerp en stel een vraag.'
  ],
  array[
    'Een nieuw trainingsblok hield na acht weken op.',
    'Het FRR-klassement kwam niet meer binnen.',
    'Kopvermogen in TTT-plannen bijgesteld naar 105 tot 115%.'
  ]
),
(
  '2026-10-19', '2026-10-22T15:00:00.000Z',
  'Het nieuwe tegelsdesign voor iedereen, ZWBriljant, ZWBieb, Stats → Ik, het weekoverzicht en racebriefingen.',
  array[
    'Het tegelsdesign in de clubkleuren is de standaard.',
    'ZWBriljant: een steen die laat zien hoe je ervoor staat, voor iedereen met intervals.icu.',
    'ZWBieb: kennis en spullen van leden lenen, met een leeszaal vol artikelen.',
    'Stats → Ik: je eigen ritgeschiedenis, piekvermogen, tijd per zone en herstel.',
    'Je profiel zoals anderen het zien, met je fietsen erop.',
    'Weekoverzicht op zondagavond: terugblik en vooruitblik.',
    'Bewijsniveau bij elk artikel en elke workout.',
    'ZWB DS: raceoverzicht tijdens een Zwift-race, ook zonder Sauce.',
    'Racebriefing per ZRL-race, als plaatje te delen, met de snelste fiets.',
    'Hulp in categorieën, en het vraagteken opent de uitleg bij de pagina waar je bent.',
    'Q&A: stel je vraag over de app.',
    'Berichten op je fietscomputer: push voor Garmin, Telegram voor Wahoo.',
    'ZWBeter materiaal: kennisbank en rekenaar.',
    'Doeltijd bij een trainingsdoel, met haalbaarheid in de pacingcalculator.',
    'Boodschappenlijst voor meerdere dagen, recepten van een link of van Allerhande.',
    'voorZpWelBokaal: wedden met ZWBallen op het veldrijden.'
  ],
  array[
    'Weekbadges telden maar 1000 ritten mee.',
    'Ritten via intervals.icu stonden dubbel naast de Strava-rit.',
    'Trainingen stonden dubbel in de kalender na het ruilen van een rit.',
    'De herziening streepte de training van vandaag weg.',
    'Live renners zonder positie waren onzichtbaar op de eventpagina.',
    'Nieuwere Wahoo ELEMNT''s gaven geen positie door.',
    'Je geslacht wijzigen verplaatste je SRC-inschrijving.',
    'De eventscan draait weer.',
    'De barcodescanner leest ook een gedraaide barcode.',
    'Het jaarplan volgt een verschoven event.'
  ]
),
(
  '2026-10-26', '2026-10-29T16:00:00.000Z',
  'Een nieuwe AI-coach en een schema dat volgt wat je aankunt. Ook nieuw: ZWBekers, het clubverhaal, ZWB Rankings en de Ladderpuzzel.',
  array[
    'Je schema volgt je fitheid (CTL); je beschikbare uren zijn een grens, geen doel.',
    'Schema''s en de coachchat draaien op Claude van Anthropic.',
    'Coach je jezelf, dan maak je je schema met één knop bij je doel.',
    'Naleving per onderdeel: duur, TSS, IF, zones en RPE.',
    'TSS uit hartslag voor ritten zonder vermogensmeter.',
    'Ritvoeding: een plan per rit, een zweettest en sportvoeding scannen met de barcode.',
    'ZWBriljant in het weekoverzicht en op je Strava-rit.',
    'ZWB Rankings in plaats van Achievements, met alle ranglijsten per week.',
    'Racebriefje met sprint- en rondesegmenten, segmentrecords en powerups.',
    'Racetips van leden onder ZWBeter racen.',
    'ZWBeter racen: verwachting vooraf en een terugblik na de race.',
    'ZWBekers: de prijzenkast van de club, met bekers die leden voordragen.',
    'Clubverhaal: je verhalen en foto''s voor het verhaal van ZWB.',
    'Club Ladder: de Ladderpuzzel om de teams te maken.'
  ],
  array[
    'Rustige duurritten komen niet meer onder de 90 minuten.',
    'Racebriefje en live stand kozen de verkeerde groep als A en B1 in één event reden.',
    'Ritkoolhydraten tellen mee in het dagmenu.',
    'Een ZRL-raceweek zonder parcours heeft zijn route weer.',
    'De ZWBriljant-terugblik rekent met je gewicht van toen.',
    'De tabbalk op de iPhone blijft niet meer hangen na het toetsenbord.'
  ]
)
on conflict (week_start) do nothing;
