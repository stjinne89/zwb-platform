# TTT-bot voor Discord

Stand: 2026-10-13, na de eerste race. De bot heeft een ZRL-ploegentijdrit
meegepraat (B-development, 20:08-20:50). Klok, Klim en de stem werkten; de coach
zag de ploeg, maar wees te vaak de verkeerde koprijder aan. Dat is dezelfde avond
bijgesteld op het logboek, zie "De eerste race". Een meting van Sauce naast het
logboek ontbreekt nog; wat hieronder "niet gemeten" heet, is een aanname.

Aanleiding: de [TTT-Timer van Andi Pätzold](https://andipaetzold.github.io/tttt-discord/)
(MIT). Die roept in een spraakkanaal om wie op kop moet en hoe lang, met namen en
seconden die je met de hand intypt, en loopt blind op de klok. Onze versie haalt
het plan uit de TTT Planner en luistert naar Sauce.

## Opzet

```
Platform (Netlify)                         Pc met Zwift + Sauce
  ttt_plans ──► GET /api/ttt/plan/<token> ──► bot ◄── Sauce (localhost:1080)
                                              │
                                              ▼
                                   Discord: spraak + statusbericht
```

- **Platform**: alleen een deellink per plan. `ttt_plans.share_token` (migratie
  `0229_ttt_plan_share_token.sql`), aangemaakt met de knop Botlink op de planpagina,
  in te trekken met Link intrekken. De route leest met de service-role en geeft
  `tttPlanExport` terug (`src/lib/ttt/plan-export.ts`): naam, event, schatting van
  ZwiftGopher en per renner volgorde, naam, Zwift-ID, kopbeurt-watts en -duur.
  FTP, gewicht en lengte gaan niet mee.
- **Bot** (`bot/`, eigen pakket): draait op de pc waar Zwift en Sauce staan. Een
  spraakbot heeft een proces nodig dat blijft draaien, en dat kan niet op Netlify.
  Installatie en commando's: `bot/README.md`.
- **Geen live data naar het platform.** De bot leest Sauce lokaal; er is geen
  ingest-endpoint en er wordt geen vermogen opgeslagen.

- **Plan rechtstreeks uit ZwiftGopher** (2026-10-13, op verzoek van de eigenaar:
  de calculator op zwiftgopher.com/TTT werkt handiger dan de planner). Export
  JSON en Export Link geven daar een link `…/TTT/?save=<blob>`; met `&json=true`
  geeft die het plan als JSON. `/ttt plan` neemt zo'n link aan, of het JSON als
  bestand. Gemeten vorm (versie 1.14.0): `riders` als object per Zwift-ID met
  `name`, `alt_name`, `order` (vanaf 0), `pull_power`, `pull_duration`. De bot
  spreekt de voornaam uit, zonder teamtag, of `alt_name` als die is ingevuld.
  `target_speed` is de snelheid op het vlakke en geen verwacht gemiddelde: een
  plan uit ZwiftGopher krijgt daarom geen tempomelding. De deellink van het
  platform blijft werken; daar is de migratie voor nodig, hier niet.

Waarom eigen bouw en geen fork: tttt-discord hangt aan Redis en aan Google
Translate voor de stem (namen gaan dan naar Google), en heeft geen plek voor
watts of live data. De commando's, het statusbericht en de aftelmomenten zijn
overgenomen.

## Onderdelen van de bot

| Bestand | Wat |
|---|---|
| `plan.ts` | Plan ophalen en valideren, in de vorm van het platform of die van ZwiftGopher. Haalt alleen `/api/ttt/plan/<token>` bij een toegestane herkomst (`PLAN_ORIGINS`) en `zwiftgopher.com/TTT/?save=…` op, niet zomaar een adres uit Discord. |
| `rotation.ts` | De rotatie, puur: wie rijdt, hoe lang nog, wie volgt; `skip`, `plus`, gelost/terug, en `syncLeader` voor wat Sauce ziet. |
| `coach.ts` | De regels op Sauce-metingen, zonder I/O. |
| `sauce.ts` | Websocket naar Sauce; `toSample` is de enige plek die de vorm van de data kent. |
| `speech.ts` | Wachtrij: één stem tegelijk, een wissel gaat voor op coaching, wat te lang wacht vervalt (klok 3 s, coaching 8 s). |
| `tts.ts` | De stem, lokaal, met een cache per zin: op Windows de Nederlandse Windows-stem (`windows-voice.ps1`, één PowerShell-proces dat blijft draaien), anders Piper. De klokzinnen worden bij `/ttt plan` klaargezet. Gemeten: 38 zinnen in een seconde; een nieuwe zin in minder dan 10 ms. Piper is niet getest. |
| `session.ts` | Eén ploegentijdrit: verbindt rotatie, coach en spraak. |
| `index.ts` | Discord: commando's, knoppen, spraakkanaal, statusbericht. |
| `listen.ts` | Luisteren naar de captain: opus uit Discord naar 16 kHz mono, wav, `whisper-cli`. |
| `voice-command.ts` | Van wat whisper verstond naar een commando, zonder I/O; de hint voor whisper en de bevestigingen. |

## Coachregels en drempels

Constanten bovenin `bot/src/coach.ts`. **Alle waarden zijn een eerste inschatting,
niet afgeleid uit een meting.**

| Regel | Drempel |
|---|---|
| Koprijder | de voorste renner van de ploeg. Wie aan de beurt is of als volgende komt: zodra hij daar 3 s ligt. Ieder ander: na 8 s en alleen als hij minstens 85% van zijn kopbeurtvermogen trapt |
| Rust na start en klim | de eerste 30 s na de start en na Hervat rotatie verlegt Sauce de rotatie niet |
| Vroege wissel | een andere koprijder dan de klok dacht: de rotatie gaat mee, de bot noemt alleen naam en watt. Zijn kopbeurt telt vanaf het moment dat hij vooraan kwam, niet vanaf het moment dat Sauce het zeker wist |
| Late wissel | geen bijsturing: de kopbeurt van de verwachte koprijder telt vanaf "Wissel". Tot 2026-11-17 begon die opnieuw als Sauce hem vooraan zag; dat maakte elke beurt de duur van de wissel langer (zie de race van 17 november) |
| Vermogen op kop | gemiddelde over hooguit 10 s, de eerste 4 s niet meegeteld en minstens 4 s gemeten; melding vanaf 15 W of 6% afwijking, afgerond op 5 W, hooguit eens per 20 s per renner; alleen als klok en Sauce het over de koprijder eens zijn. Niet in de laatste 12 s van een kopbeurt, en niet als iemand meer dan 25% onder zijn doel zit (dan rijdt hij niet op kop) |
| Finish | iedereen in beeld 15 s lang onder 50 W en onder 20 km/u: de bot stopt en verlaat het kanaal |
| Voorste | de voorste renner die meedraait en rijdt (10 km/u of meer); een geloste of met de hand geloste renner telt niet mee |
| Lossen | meer dan 3 s achter de voorste, 10 s lang, of 10 s uit beeld, of 10 s stilstaan terwijl de ploeg rijdt. De renner krijgt geen kopbeurt meer. Eén renner tegelijk: zouden er twee of meer in dezelfde meting lossen, dan lost er niemand (in het logboek `drops-ignored`) |
| Terug | binnen 1,5 s van de voorste (ervoor of erachter), rijdend, 5 s lang |
| Vier over | één keer, als er van een grotere ploeg vier renners over zijn (de ploegentijd is de vierde renner) |
| Tempo | elke 5 minuten het gemiddelde van de voorste renner naast `estimatedSpeedKmh` |

Een renner die met de hand gelost is gezet, beoordeelt de coach niet meer.
Renners die Sauce nooit zag en renners zonder Zwift-ID blijven buiten de regels.

## De eerste race: 13 oktober 2026

ZRL-ploegentijdrit, vijf renners, plan uit ZwiftGopher. Bron: het logboek
(`bot/.cache/ttt-2026-10-13.log`, 299 regels in het race-uur). De meting met
`sauce-ttt-probe.mjs` is niet gestart, dus er zijn geen ruwe metingen om de
drempels op te ijken.

**Werkte.** 42 wissels op de klok. Alle vijf renners zijn als koprijder gezien en
niemand is als "uit beeld" gelost: Sauce hield de ploeg in beeld. De knop Klim is
twee keer gebruikt (4 en 3 minuten); de bot zweeg en pakte daarna op met de
renner die vooraan reed. Eén losmelding, terecht: Jeroen loste aan de voet van de
tweede klim, de bot meldde het tien seconden na het hervatten. De ploeg was
positief.

**Ging mis, en wat eraan gedaan is.**

| Wat | Hoe het bleek | Aanpassing |
|---|---|---|
| Vooraan rijden gold als op kop rijden | 23 keer verlegde Sauce de rotatie. Om 20:31:39 werd Wouter koprijder in Jeroens beurt, gevolgd door "Wouter, 75 watt erbij"; Marc werd die ronde overgeslagen. Zelfde patroon bij -70 en -95 watt | Wie niet aan de beurt is, moet 8 s vooraan liggen en 85% van zijn doel trappen |
| Onrust na start en klim | "Wouter" vijf seconden na de start; drie wissels in 20 s na de eerste klim | 30 s rust na start en na Hervat rotatie |
| "Nog 10" en "vijf" klonken te dicht op elkaar | Melding van de ploeg. De zin begon met de naam, dus "tien" klonk pas twee à drie tellen na het moment | Het getal eerst: "Nog 10. Marc klaarmaken." Wattmeldingen zwijgen in de laatste 12 s, zodat ze het aftellen niet ophouden |
| Meldingen na de finish | "Marc, 295 watt erbij" om 20:50 | Geen wattmelding meer dan 25% onder het doel; de bot stopt als de ploeg stilvalt |
| Deel 2 over deel 1 heen geladen | De optie `deel` vergeten; de hele race reed op het plan van deel 2 | Het antwoord zegt welk deel is geladen en wat het vervangt, met een knop "Dit is deel 2" |

**Waargenomen, niet aangepast.**

- Een renner reed mediaan 14 s na "Wissel" echt vooraan. Omdat zijn kopbeurt dan
  pas begint, zat er 40 tot 48 s tussen twee wissels in plaats van 30. Dat is zo
  bedoeld, en de ploeg klaagde er niet over.
- 34 wattmeldingen, ongeveer één per kopbeurt, meestal 20 tot 40 W. Of dat te
  veel is of dat het plan te laag stond, is zonder meting niet te zeggen.
- Eén renner zat niet in Discord en hoorde de bot niet. Dat verklaart mogelijk
  een deel van de onrust; de bot kan daar niets aan doen.

**Vrouwenstem.** Wens van de ploeg. Windows heeft voor het Nederlands alleen
Frank; de bot spreekt daarom sinds dezelfde avond met Piper en de Vlaamse stem
`nl_BE-nathalie-medium`, na een luisterfragment gekozen door de eigenaar. Piper
is daarmee voor het eerst getest: een zin kost ongeveer een seconde (Frank: een
paar milliseconden), dus de bot zet nu ook de coachmeldingen vooraf klaar.

**Open.** De nieuwe drempels en de nieuwe stem zijn niet in een race gehoord. De
tragere rotatie is bewust niet aangeraakt: één renner reed zonder Discord en kan
de oorzaak zijn. Bij de volgende ploegentijdrit de meting wel starten.

## Proef: wat ziet Sauce van een ploeg?

Deels gedaan. Op 2026-10-13, buiten een race (15 s, 61 renners in beeld), klopten
punt 1 en 2 hieronder. Punt 3 en 4 kunnen alleen in een ploegentijdrit.

```bash
node scripts/sauce-ttt-probe.mjs --url http://192.168.0.134:1080 --seconds 120 --ids <zwift-id's van de ploeg>
```

Laat Zwift daarbij meekijken met een ploeglid in een ploegentijdrit of groepsrit.
Het script schrijft per bericht Zwift-ID, gat, vermogen, snelheid en draft naar
`.tmp/` (niet in git, zonder namen) en vat samen:

1. **Adres en verzoek. Gemeten: klopt.** `ws://<pc>:1080/api/ws/events` met een
   `subscribe` op `nearby` geeft één bericht per seconde.
2. **Veldnamen. Gemeten: kloppen.** Per renner `athleteId`, `gap` in seconden ten
   opzichte van de gevolgde renner, en `state.power`, `state.speed`. Een negatief
   gat is ervoor (57 van 57 renners op dezelfde weg, vergeleken met hun positie).
   De snelheid is in km/u. `gap` verloopt vloeiend, tot op honderdsten. Er is ook
   `state.draft`; de bot gebruikt dat nog niet.
3. **Ziet Sauce de hele ploeg?** In een massarace waren het hooguit drie renners
   tegelijk (`live-zrl-dashboard.md`). In een ploegentijdrit rijdt de ploeg bij
   elkaar, maar dat is niet gemeten.
4. **Is de koprijder uit `gap` af te leiden?** Renners in een waaier liggen
   tienden van seconden uit elkaar. Is `gap` daar te grof voor, dan vervallen het
   volgen van wissels en de vermogensregel; lossen en tempo blijven bruikbaar.

Valt punt 3 tegen, dan blijft de bot een timer met watts. Dat eerst melden, geen
ander databron erachter bouwen.

## Een race in delen

Op verzoek van de eigenaar (2026-10-13): een tweede plan voor een vlakker deel,
met een andere indeling. `/ttt plan deel:2` zet een plan klaar zonder de lopende
rit te storen; `/ttt deel 2` of de knop Deel 2 schakelt over (`replan` in
`rotation.ts`, `usePart` in `session.ts`). De koprijder maakt zijn kopbeurt af,
daarna gelden volgorde, watt en duur van het nieuwe plan. Gelost blijft gelost en
de coach houdt wat hij al zag, met de nieuwe doelen. Staat de koprijder niet in
het nieuwe plan, dan begint de eerste renner daarvan meteen. Twee delen: meer
knoppen passen niet naast Klim in één rij.

## Vrij rijden op een klim

Op verzoek van de eigenaar (2026-10-13): op een flinke klim rijdt iedereen zijn
eigen tempo. Zonder ingreep zou de coach daar onzin roepen: wissels bij elke
inhaalactie, "watt eraf" voor wie boven zijn plan klimt, "lost" voor wie een gat
laat. De knop Klim (`/ttt klim`, `setFree` in `session.ts`) zet klok en coach
stil. Hervat rotatie (`/ttt hervat`, of Volgende) begint de rotatie opnieuw met
de voorste renner uit de laatste Sauce-meting, als die hooguit 5 s oud is, en
anders met de volgende in het plan (`resume` in `rotation.ts`).

De bot herkent een klim niet zelf. Sauce geeft per renner `state.grade`, maar de
eenheid en het gedrag zijn niet gemeten; het proefscript neemt het sinds deze
ronde wel op, samen met `state.eventDistance`. Daarmee kan automatisch herkennen
later, net als automatisch overschakelen op deel 2.

Overschakelen gaat met de hand. Sauce geeft per renner wel de afstand in het
event (`state.eventDistance`), dus automatisch op een kilometerpunt kan later;
dat is niet gebouwd en niet gemeten.

## Besturen met spraak

Op verzoek van de eigenaar (2026-11-17): de captain moet tijdens het rijden de
bot kunnen bedienen zonder muis. `/ttt start spraak:True` laat de bot luisteren
naar wie dat commando gaf, en alleen naar die persoon. Commando's beginnen met
"Coach": start (tijdens het aftellen), klim, hervat, volgende, plus (tien/twintig/dertig), deel twee, en
"<naam> gelost" of "<naam> terug". Stoppen bewust niet: per ongeluk stoppen
midden in een race is lastig te herstellen.

**Horen.** `@discordjs/voice` 0.19.2 ontvangt per gebruiker een opusstroom en
ontsleutelt ook Discords end-to-endversleuteling (DAVE, via `@snazzah/davey`);
nagekeken in `dist/index.js`. Pakketjes van wie niet geabonneerd is, worden niet
eens ontsleuteld. De bot moet daarvoor niet doof in het kanaal zitten
(`selfDeaf: false`); zonder spraak blijft hij doof. Discord documenteert
ontvangen door bots niet officieel: een wijziging bij Discord kan dit breken.

**Verstaan.** Lokaal, om dezelfde reden als de stem: geen stemmen naar Google of
een andere dienst. Vergeleken op 2026-11-17:

- **whisper.cpp** (gekozen): een exe plus model, net als Piper. Versie `b5454`,
  model `ggml-base.bin` (141 MB).
- **Vosk** (kleiner, vaste woordenlijst mogelijk): het Node-pakket is van 2022 en
  hangt aan `ffi-napi`; naar verwachting niet te installeren op Node 22+. Niet
  geprobeerd.
- **Spraakherkenning van Windows**: voor zover bekend geen Nederlands voor
  desktopprogramma's. Niet geprobeerd.

**Meting, 2026-11-17** (laptop, Ryzen AI 7 350, 4 threads). Zeven zinnen van
Piper (Nathalie): zes commando's en "Ja hoor, daar komt de klim, rustig aan
jongens."

| Opzet | Resultaat | Tijd per zin |
|---|---|---|
| Zonder hint | commando's meestal goed, "Coach" als "Kootje"/"Koch", "plus tien" als "+ team" | ~1,3 s |
| Met de commando's als `--prompt` | 7 van 7 goed, de gewone zin bleef gewone tekst | ~1,4 s (`whisper-cli`, model per keer geladen) |
| Model geladen (`whisper-server`) | idem | ~1,2 s |
| `--audio-ctx 256` (kleiner venster) | slechter ("Koutch klum", "een coach plastic") en trager | 3–4 s |
| Hele keten zoals in de bot: 48 kHz stereo, opus heen en terug, naar 16 kHz, `whisper-cli` met hint, `parseVoiceCommand` | 7 van 7 goed, de gewone zin geeft geen commando | 1,3–2,0 s |

Gekozen: `whisper-cli` per zin met de hint. De server scheelt 0,2 s maar vraagt
een proces en een poort om te beheren. Een zin is af na 0,7 s stilte; korter dan
0,4 s of langer dan 8 s wordt niet verstaan. Whisper vult elke zin aan tot 30 s,
dus een langere zin kost niet meer rekenwerk. Komt er een zin binnen terwijl de
vorige nog wordt verstaan, dan wacht hij; komt er nog een, dan vervangt die de
wachtende.

**Eerste test in Discord, 2026-11-17.** Ontvangen in Discord werkt, met DAVE.
De captain gaf 28 zinnen met "Coach" (plan: Sven Hund, Harmen Reinders, Terrence,
E sli, Stijn Martens), 1,3 tot 2,3 s per zin. De commandowoorden gingen allemaal
goed; de namen niet. 14 van de 28 zinnen deden wat bedoeld was. Wat misging:

| Wat | Voorbeeld uit het logboek | Nu |
|---|---|---|
| Naam zoals whisper hem hoort | "terrens", "terenst" (Terrence); "tein" (Stijn) | Herkend: namen worden vergeleken op klank (c/k, ij/ei, dubbele letters) en mogen 1 letter afwijken, bij 6 letters of meer 2 |
| "gelost" verkeerd geschreven | "sli is koelost" | Herkend: een woord op "lost" telt als gelost |
| Losse "Coach", pauze, dan het commando | "Coach." en daarna een zin zonder "Coach" | De bot wacht 6 s op het commando in plaats van "Niet verstaan" |
| Een zin vervalt terwijl de vorige nog verstaan wordt | 2 keer "overgeslagen" | Hij wacht nu |
| De stem van de bot in de microfoon | "Noch 30 seconden. Darna, Harmen Reinders. Coach, volgende." | Ging goed (het wekwoord zoekt verder), maar een koptelefoon voorkomt het |
| Naam die op niemand lijkt | "eens die", "als diestroos", "als literum" (E sli); "Dennis"; "dein", "tijdens" (Stijn) | Blijft "Niet verstaan": gokken zet de verkeerde renner gelost |

Met dezelfde teksten door de nieuwe herkenning: 18 van de 28 goed, en de twee
losse "Coach." wachten op het commando. Daarnaast staat elke renner nu in de hint
zoals de captain hem noemt, in een zin ("Coach, Esli gelost. Coach, Stijn
terug."); korte delen van een naam gaan aan elkaar ("E sli" wordt "Esli"). Of dat
whisper helpt, is niet gemeten: de opnames zijn na het verstaan weg.

**Niet gemeten:** de belasting naast Zwift op de Zwift-pc, en hoe vaak een zin
zonder herkend "Coach" toch een commando was (21 keer "geen Coach"; die tekst
komt bewust niet in het logboek).

**Race van 2026-11-17 (B3 met Sauce, ZWB Cycling A zonder Sauce).** Twee
logboeken; daarnaast de stream van B1 (Kevin Plasmans) bekeken, zonder geluid.

| Wat | Gezien | Nu |
|---|---|---|
| Whisper verzint de hint | B3: 11 keer "Coach, deel twee", soms vier keer in één zin; de captain zei het niet (bevestigd). Er was geen deel 2, dus elke keer "Geen deel 2." Ook "[muziek]" | Een commando dat zich in één zin herhaalt, telt niet (`echo`). "deel …" staat alleen in de hint voor een deel dat klaarstaat. "deel N" zonder plan: niets zeggen. Tekst tussen haken valt weg. Het geluidsniveau van elke zin staat in het logboek, om later een drempel voor ruis te kiezen |
| Kopbeurten langer dan het plan | B3, koprijder tot koprijder volgens Sauce: Stijn 30 → 41 s, Sven 60 → 69 s, Marc 60 → 72 s. Sauce zag de nieuwe man 8 tot 16 s na "Wissel", en dan begon de kopbeurt opnieuw | De kopbeurt telt vanaf "Wissel" (zie Coachregels) |
| Alle vier tegelijk "gelost" | B3, laatste 3 km: Koen was sinds 19:30 gelost en uit het event; de ploeg reed langs de plek waar hij stond (eigenaar). Hij lag vooraan, dus de andere vier "losten", met twee wissels in dezelfde milliseconde, drie keer heen en weer | Een geloste of stilstaande renner is nooit de voorste; nooit meer dan één renner tegelijk gelost |
| Keuzemenu zette een renner terug | A: na "Coach, Bart gelost" riep de klok Bart 15 s later toch weer op. Het menu draaide de stand om, wat het label ook zei | Elke keuze draagt wat erop staat ("lost" of "terug") |
| "los" niet herkend | A: "Coach, remco los." | Telt als gelost |
| "Unknown interaction" | A: `/ttt start` antwoordde pas na het plaatsen van het statusbericht, op een trage pc na meer dan 3 s | Eerst `deferReply` |
| Oude versie | A draaide een versie van vóór `d492f06e`: 103 zinnen vervielen terwijl whisper bezig was | Bijwerken op de bot-pc |

Ook gezien, niet veranderd: Harmen reed bijna elke beurt onder zijn 310 W
(gemiddeld 19 W te weinig), Sven begon vaak te hard (95, 75, 65 W eraf). In de
stream van B1 duurden de beurten 28 tot 36 s; het plan van B1 is daar niet uit
af te lezen. "bat" voor Bart blijft onherkend: een naam van 3 letters moet exact
kloppen. "Coach, min tien" en "Coach, stop" bestaan niet; stoppen blijft bewust
zonder spraak.

**Privacy.** Alleen de captain, alleen als die het zelf aanzet. De opname staat
kort in `.cache/` en gaat na het verstaan weg. In het logboek komt alleen wat met
"Coach" begon; van andere zinnen alleen dat er geen "Coach" in zat.

## Logboek en meekijkstand

De bot schrijft per dag `bot/.cache/ttt-<datum>.log`: elke klokmelding (`klok`),
elk advies van de coach (`coach`, als JSON) en wat hij daarvan uitsprak (`zegt`).
Met `COACH=log` spreekt alleen de klok en grijpt de coach niet in; het logboek
laat dan zien wat hij gedaan zou hebben. Leg het naast de opname van
`sauce-ttt-probe.mjs` om de drempels af te stellen.

## Bewust niet gebouwd

- **Live data naar het platform** of een Sauce-mod die pusht: de bot leest Sauce
  op dezelfde pc, dus er hoeft niets over het netwerk.
- **Hosting in de cloud.** Keuze van de eigenaar: eigen pc. Gevolg: de pc moet
  tijdens de race aanstaan.
- **Zwift-tussentijden in de bot** (voorsprong op andere ploegen per segment):
  die staan op `/live/zrl/[eventId]` en in de Sauce-mod. Kan later, de JSON is er.
- **Meerdere ploegen tegelijk.** Discord laat een bot in één spraakkanaal per
  server; Sauce volgt één renner.
- **Automatisch starten** op de eigen starttijd: een ZRL-ploeg start in een rij
  met 60 s tussenruimte en Zwift geeft de rij niet. De captain geeft `/ttt start`.
- **Koppeling Discord-gebruiker ↔ renner**: er staat geen Discord-ID in het
  platform. Gelost/terug gaat op naam.

## Privacy

De deellink toont aan wie hem heeft: plannaam, eventtitel en per renner naam,
Zwift-ID, kopbeurt-watts en -duur. De link wordt alleen op verzoek van de captain
aangemaakt en is in te trekken. `/privacy` noemt dit onder "TTT-plannen".
