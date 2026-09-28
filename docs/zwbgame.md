# ZWBgame — Zwift-racegame, implementatie en verificatie

Sinds 28 september 2026 (spelversie 4) is ZWBgame een Zwift-racegame op `/zwbgame`:
het leert het tactische deel van Zwift-racen in de spelvormen die ZWB rijdt. Deze
ronde bouwt de Zwift-engine, echte Zwift-routes en de Club Ladder; ZRL en FRR-tours
volgen op dezelfde engine (bouwplan: [ZRL en FRR](zwbgame-zrl-frr.md)). ZRL is
dezelfde dag gebouwd (spelversie 5), FRR daarna. Versies 1–3 (17–19 september) waren een arcade-clubkoers
in Flamme Rouge-stijl; zie "Eerdere versies" onderaan.

## Lokale speeltest

```sh
npm run zwbgame:preview
# http://127.0.0.1:3199
npm run test:zwbgame:browser
npx vitest run tests/unit/zwbgame.test.ts tests/unit/zwbgame-database.test.ts tests/unit/zwbgame-server.test.ts tests/unit/privacy-version.test.ts
```

De preview bundelt de echte client en simulatie met uitsluitend fictieve renners,
vervangende serveracties en drie fixture-routes (`tests/fixtures/zwbgame/routes.ts`:
Flat Route, Hilly Route en Cobbled Climbs, met lengtes, lead-ins en segmenten uit
`zwift-data`, maar **met de hand benaderde hoogteprofielen**). Hij luistert alleen
op localhost en is geen productieroute of authenticatie-bypass.

## Architectuur

- `src/lib/zwbgame/engine.ts`: vaste simulatiestap van 0,2 s, deterministisch uit de
  seed. Physics, W′, frisheid, powerups, bots en ploegtaken.
- `src/lib/zwbgame/routes.ts`: de ladderroutes (slug + ronden) en de compacte
  spelroute: helling per 100 m, segmenten met boog-vlag, rondestrepen.
- `src/lib/zwbgame/route-catalog.ts` (server): leest `zwift_routes.profile`, rolt het
  met `pacingRouteFromZwift` (dezelfde code als het pacingplan) uit over lead-in en
  ronden en voegt de sprints en KOM's uit `zwift-data` toe. Een profiel dat meer dan
  10% van de routelengte afwijkt, of ontbreekt, laat de route weg.
- `src/lib/zwbgame/ladder.ts`: ploegen, puntentelling, uitdagen en leapfrog.
- `src/lib/zwbgame/server.ts`: roster en kwaliteiten zoals voorheen, plus de
  routecatalogus en je ZWB-ladderteam (`teams.type = 'ladder'`, een actief team vóór
  een team op het kerkhof). Geen migratie.
- `src/app/(app)/zwbgame`: client (lobby met Ladder/Vrije race en routekeuze, HUD en
  bediening) en de Three.js-scène met sprint- en KOM-bogen, rondestreep en een warme
  tint voor de tegenstanders.

## Spelregels en model

**Physics.** Snelheid volgt uit de vermogensbalans van het pacingplan: luchtweerstand
met `ZWIFT_BASE_CDA`, rolweerstand 0,004, zwaartekracht en een massa van 75 kg plus
`ZWIFT_BASE_BIKE_KG`, met traagheid (versnellen kost tijd). In het wiel geldt
`DRAFT_CDA_FACTOR` 0,7 (**aanname** uit de pacing-spike: Zwift publiceert zijn
draftmodel niet). Beschut ben je met een renner 0,3–8 m voor je en minder dan 1,8 m
opzij (de "blob"). Omdat het via luchtweerstand loopt, helpt het wiel op een klim
vanzelf nauwelijks.

**Privacy van de physics.** Elke renner is hetzelfde referentielichaam. Zijn vermogen
is 250 W × coëfficiënt^2,5 (vlak mengt naar klim tussen 0 en 8% helling) × dagvorm ×
(1 − vermoeidheid). De browser krijgt dus nog steeds alleen de dimensieloze
coëfficiënten. De exponent 2,5 rekt de samengedrukte coëfficiënten terug: 180 W tegen
330 W wordt ×1,5 in vermogen (echt ×1,83) in plaats van ×1,18.

**Standen.** Meerijden trapt minstens 82% van de drempel (op een klim oplopend tot
97%), volgt versnellingen tot 160% en springt over een renner die een gat laat vallen
naar het wiel ervoor. In het wiel is 82% sneller dan het wiel zelf, dus renners
schuiven door het blok en een groep rijdt sneller dan een solist: het blob-effect.
Sparen trapt alleen wat nodig is om het wiel te houden, tot 110%, en zakt naar
achteren. Naar voren rijdt 100% in de wind (130% in de eerste 90 s: de Zwift-start).
Aanvallen is 145%, in de laatste 400 m een sprint op 650 W × sprintcoëfficiënt^1,5.
Een lege W′ laat maximaal 97% toe. Supertuck: Sparen bij ≤ −3% en > 60 km/u geeft
0 W en CdA ×0,7 (**aanname**; sneller dan meerijden op −6%).

**W′ en frisheid.** W′ = 20 kJ × sprintcoëfficiënt², met herstel volgens Skiba via
`recoveryTau` uit het pacingplan. Frisheid: elke volle W′ die je gebruikt kost 4%
drempel, en werk boven 70% van de drempel telt voor een vijfde mee; maximaal 25%. Dat
is een **spelkeuze**, geen gemeten fysiologie: zonder zou W′ onder de drempel gratis
terugkomen en werd steeds vol gas rijden beloond.

**Powerups.** Bij het passeren van het einde van een benoemd Zwift-segment of een
rondestreep krijg je er één als je slot leeg is: veer, aerohelm of draft boost, met de
effecten uit `POWERUP_EFFECTS`: veer −10% gewicht 30 s, aerohelm −25% CdA 15 s
(Zwift Insider), draft boost +50% op de slipstreambesparing 40 s (Zwift-forum en
gearmashers.com).
Zelf gedetecteerde klimmen (`klim-…`) krijgen geen boog. De spatiebalk gebruikt hem.

**Tijd.** De client draait per 0,2 s beeldtijd `timeScale` simulatiestappen
(verwachte racetijd / 390 s, naar boven afgerond, tussen 2 en 10), zodat een race van
ruim 30 minuten in 5 tot 6,5 minuut speelt. Na je finish rekent de client de rest van
de race in één keer uit, zodat uitslag en ploegscore compleet zijn. Een race stopt na
1,8× de verwachte duur; wie dan niet binnen is, scoort niets.

**Bots.** Harde start (een deel op kop), daarna meerijden met af en toe een beurt op
kop; klimmers en punchers vallen soms aan op een klim; zelden een aanval op het vlak;
een groep op meer dan 60 m halen ze met Naar voren; de finale hangt af van rennerstype
en seed (sprinter ±230 m, diesel ±1300 m). Veer op de klim, aerohelm in de sprint,
draft boost bij een gat.

**Club Ladder** (race book gelezen op 28 september 2026, clubladder.notion.site):
5 tegen 5, punten 10‥1 op finishplek, hoogste totaal wint, gelijkspel is verlies voor
de uitdager, uitdagen tot 7 plekken hoger, leapfrog bij winst. **Niet overgenomen:** de
bonusval na drie nederlagen, "friendly" onder drie starters, echte tegenstanders van
andere clubs (hun renners hebben we niet) en het weigeren van een route door de
verdediger. De spelladder telt tien ploegen: jouw ploeg en negen clubploegen van vijf,
gevormd uit de 45 rosterleden die het dichtst bij jouw niveau zitten, oplopend in
sterkte. De indeling volgt uit het roster en een vaste seed per lid en wordt niet
bewaard; in de browser staan alleen de volgorde van ploeg-ID's en de laatste twintig
duels. De tegenstander rijdt een lead-out voor zijn kopman (beste sprinter, of beste
klimmer op een heuvelroute).

**ZRL** (spelversie 5, 28 september 2026; regels van wtrl.racing/zrl/resources,
gelezen op 22 en 28 september 2026). Jouw ploeg tegen vijf clubploegen, verdeeld als
een divisie (slangverdeling over de sterkste renners, zodat de ploegen ongeveer even
sterk zijn). Je ZRL-team rijdt mee: een subteam (B1) gaat voor zijn paraplu (B). De
puntenrace en de Race of Truth tellen met `scoreRace` uit `src/lib/zrl-live/scoring.ts`
(dezelfde code als het live-dashboard), gevoed met de segmentpassages van de engine
(`RaceState.passes`). De Race of Truth kent geen slipstream. Scratch telt alleen
finish en podium. In de ploegentijdrit geeft alleen je eigen ploeg beschutting en rijdt
Meerijden op 95%. De vierde renner bepaalt de tijd; met minder dan vier renners binnen
heb je geen uitslag en geen leaguepunten. Leaguepunten: evenveel als er ploegen zijn
voor de winnaar, dan één minder per plek; bij een gelijke stand dezelfde plek.
**Niet overgenomen:** de regel dat een ploeg met drie starters achter ploegen met vier
eindigt (in de game starten altijd vijf), echte WTRL-tegenstanders, en een klassement
over een hele ronde. Het format van een raceweek staat niet in onze kalender (WTRL
maakt het per ronde bekend), dus je kiest het zelf. Alleen "Race of Truth" in de
titel zet het vooraf.

De ZRL-route van de week komt uit de clubkalender: een event van het type `zrl` in de
komende 14 dagen met `zwift_route_id`, waarbij je eigen team voorgaat, uitgerold over
`laps`. Zonder route of profiel valt de game terug op de ladderroutes. Elke ploeg
stuurt in punten-formats zijn beste sprinter als puntenjager op de bogen af (sprint:
aanvallen vanaf 350 m voor de streep, KOM: de hele klim). Die van jouw ploeg gaat
alleen op je order "Pak de punten".

**FRR-tour** (28 september 2026; regels van flammerougeracing.com/tour-rules, gelezen
op 28 september 2026). Vier etappes met hetzelfde veld van 24 renners rond jouw
niveau (`newTour`, `pickOpponents`): de vlakste route, de heuvelachtigste, een
tijdrit op de vlakste die overblijft, en een slotrit. De tijdrit is zoals een
Zwift-tijdrit: iedereen start tegelijk, zonder slipstream en zonder powerups.
Meerijden is er 97% van de drempel. Een gespreide start is daarom niet gebouwd.
Klassement: opgeteld tijdverlies op de etappewinnaar (eGAP), alleen voor wie alle
etappes uitreed. Finishpunten 25-20-16-13-11-10-9-8-7-6, dubbel in de tijdrit.
Segmenten alleen op FTS, maal CDR (klim) of SSR (sprint per etappe).
Truien: geel, groen, bolletjes en blauw; een puntentrui vraagt minstens één punt.
Bezemwagen: 20 punten straf op het totaal.

**Eigen keuzes, niet van FRR**, omdat de puntentabellen op de FRR-site afbeeldingen
zijn die niet meer laden (gecontroleerd op 28 september 2026):
- punten na plek 10: 5-4-3-2-1, daarna 1 voor elke finisher;
- dezelfde schaal voor segmenten, voor de beste vijftien per doorkomst;
- de CDR uit de hoogtemeters van de klim (< 30 m = 1, < 60 = 2, < 120 = 3,
  < 250 = 4, anders 5);
- SSR 3 (×1,3) in een vlakke rit (minder dan 0,4% gemiddeld klimmen), anders 1;
- een bezemwagengrens van 20%.

**Niet overgenomen:** klassen (het hele veld is één klasse), ploegenklassement,
dubbele segmentpunten in koninginnenritten, straffen bij klasse-upgrades, en
etappes uit de clubkalender. De tourstand staat in de browser, met alleen renner-id's
en getallen (`zwbgame:v5:<lid>:tour`).

**Ploegorders.** Breng me terug: bij een gat van 12–400 m wacht de ploeggenoot met de
meeste reserve op 45% en sleept je dan op 105% terug. Lead-out: in de laatste 1100 m
rijdt een ploeggenoot binnen 25 m van je op aanvalstempo voor je uit.

## Gegevens en toestemming

Migratie **0170** voegt spelvoorkeuren, afgeleide rennerprofielen en uitsluitingen
van ongeclaimde rosterleden toe. De service-role bouwt het zichtbare spelroster;
de client krijgt geen sleutels, ruwe vermogenswaarden, gewicht of wellness.
Iedere serveractie controleert login, goedgekeurd lidmaatschap en de actuele
privacyversie. De UI verstuurt invoer alleen voor het eigen account.

**Spelkwaliteiten uit platformdata (sinds 17 september 2026, op keuze van de
eigenaar).** Eerder kreeg een lid pas kwaliteiten na een aparte opt-in plus
handmatige invoer; in de praktijk reed daardoor het hele veld van 102 renners met
basisprofielen, zodat ook compensatie, extra kaarten en knechten nooit
aansloegen. Nu leidt `loadGame` voor elk lid kwaliteiten af, in deze volgorde:

1. een geldig eigen spelprofiel (eigen meting of Intervals met bevestigde herkomst);
2. `rider_power_profiles` (Intervals-sync van de teampagina's): FTP, gewicht,
   15 s, 1 min, 5 min en 20 min, met gewicht uit het profiel als de curve het mist;
3. `profiles.ftp_watts` en `profiles.weight_kg`;
4. anders een basisprofiel (ook voor alle rosterleden zonder account).

Vlak volgt FTP in watts, klimmen W/kg, sprint het 15-secondenvermogen. Ruwe
waarden verlaten de server niet; de revisie is een hash, zodat er geen watts in
browseropslag komen. Een onleesbare `rider_power_profiles` houdt de game open
met profieldata. Er is geen aparte opt-out voor dataverwerking: wie niet wil dat
anderen zijn kwaliteiten zien, zet herkenbare deelname uit. De per-veld
zichtbaarheid van FTP en gewicht op het ledenprofiel wordt hier niet gevolgd;
`rider_power_profiles` is sowieso voor alle leden leesbaar. Privacyversie
`2026-09-17-zwbgame-kracht` beschrijft dit.

Een eigen spelprofiel opslaan zet zelf de speltoestemming `2026-09-17`; met
Platformgegevens gebruiken wordt die gewist. Wijziging van voorkeuren
maakt een nieuwe revisie en wist het oude spelprofiel in dezelfde transactie.
Een late sync wordt geweigerd als de toestemmingsrevisie is veranderd. Verwijderen
of wijzigen van de Intervals-koppeling wist het Intervals-spelprofiel. RLS staat
leden alleen eigen voorkeuren en eigen afgeleide profielinzage toe; afgeleide
profielen en rosteruitsluitingen kunnen niet rechtstreeks worden geschreven.

Profielen vervallen na 30 dagen: verlopen rijen tellen niet mee en worden bij
een volgende succesvolle sync vervangen. Er is geen nieuwe opruimcron toegevoegd.
Toestemming intrekken/account verwijderen wist de rij wel direct.

Voor een **eigen Intervals-spelprofiel** gebruikt de game geen
`rider_power_profiles` als bewijs van gegevensherkomst. Bij Intervals
worden een 90-dagencurve en activiteiten opgehaald; elk gebruikt curvepunt moet
een activiteit-ID hebben dat matcht op een expliciet toegestane bron (UPLOAD,
GARMIN_CONNECT, WAHOO, ZWIFT, SUUNTO, COROS of POLAR), zonder Strava-ID. Een
20-minutenpunt met bewezen bron is vereist; de game schat FTP op 95% daarvan.
Gewicht vult het lid zelf in. Ontbrekende bronmetadata resulteert in een
afwijzing van de sync, nooit in stilzwijgend gebruik van een gemengde cache.
API-sync is begrensd op drie pogingen per lid per uur via de bestaande limiter.

De [Intervals API-voorwaarden](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087)
staan afgeleide toepassingen toe en vragen Garmin-bronvermelding. Bij herkende
Garmin-gegevens toont de game die vermelding. De herkomstcontrole is met fixtures
getest; de actuele bronvelden/volledigheid bij echte leden zijn **niet live
geverifieerd**. Intervals-gegevens zonder bruikbare herkomst blijven uitgesloten.

Er is geen directe Strava-koppeling in de game. **Wel een bewust aanvaard risico:**
de platformroute filtert niet op bron, en een Intervals-curve kan activiteiten
bevatten die leden via Strava in Intervals hebben gezet. Strava's voorwaarden
beperken het tonen van afgeleide gegevens aan anderen en noemen virtuele races
(zie [API Policy](https://www.strava.com/legal/api_policy)). De eerste versie sloot
dit daarom uit; de eigenaar koos op 17 september 2026 voor automatische kwaliteiten
voor iedereen. Niet uitgezocht of Intervals Strava-activiteiten in de curve via zijn
API meeneemt.

## Verificatie FRR (28 september 2026)

- Simulatie van een hele tour op de drie fixture-routes (24 renners): etappes van
  4,9–6,2 minuut, 0,2–0,3 s rekentijd per etappe, geen beschutting in de tijdrit,
  geen bezemwagen bij deze spreiding.
- Unit-tests (+5): tourplan en vast veld, tijdrit zonder slipstream en powerups,
  finishpunten en dubbele tijdritpunten, segmentpunten × SSR, klassement alleen voor
  wie alles uitreed, bezemwagenstraf, geen puntentrui zonder punten, opslag zonder
  namen en een kapotte tourstand geweigerd.
- Playwright (+2 × 2): een nieuwe tour starten, en een gefinishte etappe die het
  klassement bijwerkt, de tour naar etappe 2 zet en te stoppen is. Screenshots
  bekeken: op mobiel braken de vier tabs af en plakte de tourlijst tegen de
  rennerskaart (opgelost), en je kreeg de bolletjestrui zonder klimpunten (opgelost).
- **Niet lokaal te verifiëren:** een tour op de echte routebibliotheek. Met de
  fixtures kwam Cobbled Climbs twee keer voor, omdat er maar drie routes zijn.

## Verificatie ZRL (spelversie 5, 28 september 2026)

- Simulatie van de vier formats op Hilly Route (30 renners): winnaar na 4,8–5,1
  minuut, laatste renner na 5,2–5,7 minuut; rekentijd 0,4–0,7 s per hele race. In de
  Race of Truth zat niemand in het wiel; in de ploegentijdrit 52% van de tijd.
- Unit-tests (+6): ploegen van gelijke sterkte, slipstreamregels per format,
  puntenrace via `scoreRace` (FAL voor de eerste gelijk aan het aantal starters,
  podium 30 punten, ploegtotalen kloppen, puntenjagers pakken meer FAL), scratch
  zonder segmentpunten, TTT met de vierde tijd en zonder uitslag bij drie
  finishers, jagers alleen in punten-formats, opslaan en hervatten met passages.
  Servertests (+3): subteam gaat voor paraplu, de ZRL-race van je eigen team uit de
  kalender met zijn ronden, geen race zonder route of profiel.
- Playwright (+2 × 2): ZRL-lobby met de race van de week, format, ploegpunten, order
  en een TTT zonder orders; een gefinishte ZRL-race met ploegplaats en leaguepunten.
  Op mobiel stond de race van de week eerst in een verborgen badge; nu staat hij in
  de ZRL-sectie zelf.
- **Niet lokaal te verifiëren:** of de ZRL-events op productie een
  `zwift_route_id` hebben en of die route een profiel heeft.

## Verificatie en uitrol (28 september 2026)

- Balanssimulatie (scratchpad, niet gecommit): 12 tot 16 races per route en per
  spelerstrategie, in velden van FTP 200–340 en 220–320. Gemiddelde plek van 24:
  meerijden en op 300 m sprinten 7,1–8,1 (in het tweede veld 13,8); aanvallen zodra
  W′ boven 60% zit 8,8–11,3; steeds vol gas 7,4–11,8; de botstrategie 12–14; de hele
  race sparen ±23. De les "zit in het wiel en kies je moment" is dus zichtbaar maar
  klein (een à twee plekken): wie actief rijdt, zit vaker in de goede groep.
  Ladderduels tegen ploegen rond je eigen niveau: 2–5 van de 12 gewonnen, meestal met
  enkele punten verschil. Winnaar na 5,1–5,4 min, laatste renner na hooguit 6,6 min.
- Unit-tests (`tests/unit/zwbgame.test.ts`, 23): determinisme bij opslaan en hervatten,
  een veld rond je niveau, het wiel spaart op het vlak (< 80%) en niet op 7% (> 90%),
  W′ en frisheid, lege W′, supertuck, powerups alleen bij een boog en één tegelijk,
  racetijd per route, sparen vanaf de start kost de kopgroep, roekeloos aanvallen
  maakt vermoeider, ladderpunten/gelijkspel/DNF, leapfrog en bereik, ploegtaken,
  routecompactie, opslag zonder namen of profiel, oude uitslagen leesbaar.
  Servertests (+2): de routecatalogus (afwijkend profiel weggelaten, geen watts of
  gewicht in de bootstrap) en het ladderteam (actief vóór kerkhof, alleen zichtbare
  teamgenoten).
- Playwright (12, desktop en mobiel): ladder uitdagen, route kiezen, standen,
  ploegorder, pauzeren en hervatten, vrije race met spatie en Esc, een gewonnen
  ladderduel met score en ladderstijging, instellingen, zonder WebGL en liggend.
  Screenshots bekeken; op mobiel liep de ladderlijst eerst te breed. Dat is opgelost
  en de test controleert het nu.
- **Niet lokaal te verifiëren:** of `zwift_routes` op productie profielen heeft voor
  alle zeven ladderroutes (zonder profiel verschijnt een route niet; zonder enkele
  route toont de game "Er is nog geen route beschikbaar"), de echte hoogteprofielen in
  de game (alleen fixtures gezien), speelgevoel en fps op een echte telefoon, en de
  draftfactor tegen echte Zwift. De powerup-effecten zijn gepubliceerd, niet door
  ons gemeten.

## Eerdere versies (1–3, 17–19 september 2026)

Solo-clubkoers op eigen tegelparcoursen van 3,5–4 km in Flamme Rouge-stijl, met eten
en drinken, bonuskaarten (Rugwind, Goede benen, Tweede adem, Verrassingsaanval),
compensatie voor zwakkere renners (extra energie, herstel en kaarten) en knechten. Dat
alles is met spelversie 4 vervallen, op keuze van de eigenaar: Zwift kent geen voeding,
powerups vervangen de kaarten, en een veld rond je niveau (zoals een categorie)
vervangt de compensatie. Uitslagen van toen blijven zichtbaar onder hun oude
parcoursnaam; lopende v3-races zijn niet hervatbaar. Migratie **0170**, de
toestemmingslogica en privacyversie `2026-09-17-zwbgame-kracht` zijn ongewijzigd.

### Nog geldig uit de eerste ronde

- Migratie 0170 is uitgevoerd in PGlite met nagebouwde noodzakelijke basistabellen.
  Volgens de eigenaar is hij op 17 september 2026 op de gekoppelde
  Supabase-database uitgevoerd; dat is niet vanuit deze repo gecontroleerd. Geen
  Docker of volledige lokale Supabase beschikbaar. De echte game toont bij ontbrekende
  tabellen 'nog niet beschikbaar', zodat voorkeuren nooit worden overgeslagen.
- Fysieke telefoons, iOS/Safari, lange sessies op echte hardware en het doel van
  minimaal 30 fps zijn niet gemeten. De mobiele browserchecks zijn emulatie.
- Privacyversie 2026-09-17-zwbgame-kracht vraagt opnieuw akkoord op de
  platformverklaring. Daarna gelden platformkwaliteiten voor iedereen; een eigen
  spelprofiel blijft een aparte keuze.
- Hoeveel leden echt FTP en gewicht in het platform hebben, is niet gemeten; alleen
  met mocks getest. Rosterleden zonder account blijven basisrenners.

Geen multiplayer, publiek klassement, seizoenen, ZRL- of FRR-spelvorm,
consolebesturing of Strava-koppeling gebouwd. Uitbreidingsideeën horen in het gedeelde
plannenboek, niet in de actieve werkvoorraad van PLAN.md.
