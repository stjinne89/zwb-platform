# ZWBgame — Zwift-racegame, implementatie en verificatie

Sinds 28 september 2026 (spelversie 4) is ZWBgame een Zwift-racegame op `/zwbgame`.
Spelversie 6 (19 oktober 2026) maakt hem tactischer: slipstream volgens Pack Dynamics
4.1, Meerijden dat geen aanvallen meer volgt, en vertraagde tijd waar de koers beslist
wordt (zie "Spelversie 6" hieronder). Spelversie 7 (dezelfde dag) voegt een
nabespreking, oefenkoersen, onverhard, vier powerups, slimmere bots en nieuwe
ploegorders toe (zie "Spelversie 7"). ZWBgame leert het tactische deel van Zwift-racen in de spelvormen die ZWB rijdt. Deze
ronde bouwt de Zwift-engine, echte Zwift-routes en de Club Ladder; ZRL en FRR-tours
volgen op dezelfde engine (bouwplan: [ZRL en FRR](zwbgame-zrl-frr.md)). ZRL is
dezelfde dag gebouwd (spelversie 5), FRR daarna. Versies 1–3 (17–19 september) waren een arcade-clubkoers
in Flamme Rouge-stijl; zie "Eerdere versies" onderaan. Onderzoek naar
Zwift-racetactiek en een voorstel om de game tactischer te maken (19 oktober 2026,
nog niet gebouwd): [Tactiek](zwbgame-tactiek.md).

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

Balanssimulatie (sinds 19 oktober 2026 in de repo, `scripts/zwbgame-balance/sim.ts`):

```sh
SEEDS=12 LEVELS=3 npm run zwbgame:balance
# ONLY=passief,tacticus  TRACE=1 (groepen per km en finishgaten)
```

Zes spelersstrategieën (passief, sparen, roekeloos, vol gas, bot, tacticus) rijden
dezelfde races op de drie fixture-routes, in een veld van 41 fictieve renners rond FTP
240, 270 en 300. Uitvoer: gemiddelde plek per strategie, grootte van de kopgroep,
speeltijd en hoeveel daarvan vertraagd liep.

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
  tint voor de tegenstanders. Sinds 19 oktober 2026 met een zon die schaduwen werpt
  (alleen in "3D · hoog"), een contactschaduw onder elke fiets, een luchtkoepel met
  verloop en Neutral tone mapping. De renners en fietsen staan in `rider-model.ts`:
  benen die de pedalen volgen, een ineengedoken houding in de afdaling, op de pedalen
  bij een aanval, en een frame in de helmkleur van de ploeg. Het landschap staat in
  `scenery.ts`: glooiende grond met kleurvlakken, bomen en struiken in groepen
  (geseed op de route-id) en heuvelruggen aan de horizon.

## Spelregels en model

**Physics.** Snelheid volgt uit de vermogensbalans van het pacingplan: luchtweerstand
met `ZWIFT_BASE_CDA`, rolweerstand 0,004, zwaartekracht en een massa van 75 kg plus
`ZWIFT_BASE_BIKE_KG`, met traagheid (versnellen kost tijd). In het wiel geldt
een besparing op de CdA die afhangt van je plek in de rij: 27% als tweede, 36% als
derde, 43% vanaf vierde (Zwift Insider mat met Pack Dynamics 4.1.1 24, 32 en 39%
minder vermogen; dat is de **aanname**, want Zwift publiceert zijn draftmodel niet).
Volle beschutting tot 5 m achter een wiel, daarna aflopend tot 10 m achter één
renner en 18 m achter een groep. Minder dan 1,8 m opzij. Wie minder dan 1 m achter
een renner zit die zelf in de wind rijdt, zit ook in de wind (PD 4.1: voorbijgaan
kost echt vermogen), behalve in de ploegentijdrit. Omdat het via luchtweerstand
loopt, helpt het wiel op een klim vanzelf nauwelijks. Het pacingplan rekent nog met
`DRAFT_CDA_FACTOR` 0,7; de game niet meer.

**Privacy van de physics.** Elke renner is hetzelfde referentielichaam. Zijn vermogen
is 250 W × coëfficiënt^2,5 (vlak mengt naar klim tussen 0 en 8% helling) × dagvorm ×
(1 − vermoeidheid). De browser krijgt dus nog steeds alleen de dimensieloze
coëfficiënten. De exponent 2,5 rekt de samengedrukte coëfficiënten terug: 180 W tegen
330 W wordt ×1,5 in vermogen (echt ×1,83) in plaats van ×1,18.

**Standen (spelversie 6).** Meerijden houdt een wiel binnen 20 m: in het wiel tot
105% van de drempel (genoeg voor elke tempowissel, niet voor een aanval), een gat in
de wind dichten tot 125%. Net over de top van een klim (de 100 m ervoor ≥ 3%, nu en
straks < 1,5%) maximaal 100%, zodat er een gat valt als je niets doet. Zonder wiel
binnen 20 m rijdt Meerijden 82% (op een klim tot 97%). Een gekozen wiel (een renner
aangeklikt, Volg tijdens een aanval, of een ploeggenoot die je terugbrengt of
afzet) volgt tot 60 m en 160%. In het wiel trapt Meerijden geen minimum meer: het
blok schuift niet vanzelf door. Sparen houdt het wiel tot 100%. Naar voren rijdt
100% in de wind, met een groep achter je tot 115% (een beurt op kop: +2,5% per renner
in je groep, tot zes), en 130% in de eerste 90 s (de Zwift-start). Aanvallen is 160%,
in de laatste 400 m een sprint op 650 W × sprintcoëfficiënt^1,5. Een lege W′ laat
maximaal 97% toe. Supertuck: Sparen bij ≤ −3% en > 60 km/u, alleen buiten het wiel,
geeft 0 W en CdA ×0,7 (**aanname**; sneller dan meerijden op −6%).

**Zichtbare aanval.** Wie ≥ 130% rijdt en niet in het wiel zit, telt als aanvaller
(`surge`, seconden). Een aanval vanuit het wiel is dus pas zichtbaar als je eruit
komt: de slingshot. Bots zien hem na 1 s + 0,08 s per meter afstand + 0–2 s
(per renner); daarna gaat een bot mee met een kans uit zijn karakter, zijn reserve
en hoe sterk de aanvaller is. Een ploeggenoot wordt niet gevolgd.

**W′ en frisheid.** W′ = 20 kJ × sprintcoëfficiënt², met herstel volgens Skiba via
`recoveryTau` uit het pacingplan. Frisheid: elke volle W′ die je gebruikt kost 4%
drempel, en werk boven 70% van de drempel telt voor een vijfde mee; maximaal 25%. Dat
is een **spelkeuze**, geen gemeten fysiologie: zonder zou W′ onder de drempel gratis
terugkomen en werd steeds vol gas rijden beloond.

**Powerups (spelversie 7).** Bij het passeren van het einde van een benoemd
Zwift-segment of een rondestreep krijg je er één als je slot leeg is, uit
`powerupPool`: veer, aerohelm en draft boost elk twee keer zo vaak als burrito en
spook; het aambeeld alleen op een route met ≤ −3%, de stoomwals alleen met
onverhard. Effecten (`GAME_POWERUPS`): veer −10% gewicht 30 s, aerohelm −25% CdA 15 s
(Zwift Insider), draft boost +50% op de slipstreambesparing 40 s (Zwift-forum en
gearmashers.com), stoomwals rolweerstand van asfalt 30 s, aambeeld +10% gewicht 15 s
alleen bij ≤ −1,5% (**aanname** uit het pacingplan), burrito 20 s geen slipstream
voor wie achter je zit, spook 15 s geen zichtbare aanval en niet bruikbaar in de
laatste 400 m (Zwift 1.39, 2023). In Zwift zijn burrito en spook alleen in sommige
events toegestaan; in de game zitten ze overal in de pool.
Zelf gedetecteerde klimmen (`klim-…`) krijgen geen boog. De spatiebalk gebruikt hem.

**Tijd (spelversie 6).** De client draait per 0,2 s beeldtijd `timeScale`
simulatiestappen (verwachte racetijd / 330 s, naar boven afgerond, tussen 3 en 16).
Op een beslismoment (`momentAt`: de start, een zichtbare aanval binnen 60 m in de
eerste 8 s, een gat van 6–40 m terwijl je meerijdt of spaart, de top of voet van een
klim, de aanloop van een sprint of de laatste 250 m van een KOM, de laatste
kilometer) zijn dat er `KEY_SCALE` = 3, en dat blijft een seconde zo na het moment.
In de tijdrit en ploegentijdrit vertraagt alleen de laatste kilometer. Een race
speelt in ongeveer 6 tot 6,5 minuut, waarvan bijna drie vertraagd. Na je finish rekent de client de rest van
de race in één keer uit, zodat uitslag en ploegscore compleet zijn. Een race stopt na
1,8× de verwachte duur; wie dan niet binnen is, scoort niets.

**Bots.** Harde start (een deel op kop), daarna meerijden met beurten op kop: wie
bij de eerste drie van een groep van minstens drie zit, gaat naar voren als de kop
onder 95% rijdt. Een groep jaagt een groep tot 600 m voor zich op; een solist een
renner tot 250 m. Ze volgen een zichtbare aanval of niet (zie hierboven), schuiven
voor een klim naar voren, en klimmers of aanvallende renners trappen door over de
top. Klimmers en punchers vallen soms aan op een klim; zelden een aanval op het vlak;
de finale hangt af van rennerstype en seed (sprinter ±230 m, diesel ±1300 m). Veer op
de klim, aerohelm in de sprint, draft boost bij een gat.

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
Meerijden in het wiel minstens 95% (85% bij lange beurten); op kop 100%, 92% bij
lange beurten, en 80% bij "Wacht op de vierde" als de vierde renner meer dan 10 m
achter ligt. De vierde renner bepaalt de tijd; met minder dan vier renners binnen
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
rijdt een ploeggenoot binnen 25 m van je op aanvalstempo voor je uit, in de laatste
800 m een tweede (springplanken). Sinds spelversie 7 ook: Maak het hard (ploeggenoten
binnen 40 m rijden Naar voren tot 1,5 km voor de streep), Niet meewerken
(ploeggenoten meer dan 15 m achter je sparen), Ga mee (ploeggenoten volgen elke
zichtbare aanval van een andere ploeg binnen 40 m meteen) en Een-twee (is jouw aanval
teruggehaald, dan valt de ploeggenoot met de meeste reserve binnen 25 m aan; één
tegelijk). In de ploegentijdrit: Korte beurten, Lange beurten, Wacht op de vierde.
Andere ploegen rijden per race een vast plan uit `teamOrder` (seed en route): op een
heuvelroute vaak hard maken, anders meegaan, een-twee of vrij; in een ploegentijdrit
korte beurten of wachten op de vierde.

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

## Spelversie 7: nabespreking, oefenen en slimmere tegenstanders (19 oktober 2026)

Modules D tot en met I uit [Tactiek](zwbgame-tactiek.md), plus de extra powerups.
Lopende races van versie 6 vervallen; uitslagen, ladder, tour en gehaalde
oefeningen staan op vaste sleutels.

- **Nabespreking (D).** De engine houdt voor jou per kilometer bij: racetijd, tijd
  in de wind, W′ aan het eind, je groep (0 = kopgroep, renners die al binnen zijn
  tellen als groep ervoor), de grootte ervan en je achterstand; en als momenten je
  aanvallen, powerups, een lege W′, gelost en terug in de kopgroep (`RaceState.log`,
  hooguit 80 momenten, alleen getallen; gaat mee in de opslag). Na de finish staat
  het als drie stroken op één afstandsas, een lijst momenten en een tabel voor
  schermlezers (`debrief.tsx`).
- **Koers lezen (G).** In de koerslijst een vlam bij `surge > 0` en een icoon per
  rennerstype. Geen nieuwe gegevens: type en inspanning had de browser al.
- **Bots en ploegorders (H).** Zie "Bots" en "Ploegorders" hierboven.
- **Tijdrittempo en ploegentijdrit (I).** `{ type: "tempo" }` zet je tempo in de
  tijdrit en de Race of Truth op 97% + 3% per stap (−2 tot +2). Zonder slipstream is
  Meerijden nu ook in de Race of Truth je tijdrittempo (was 82%).
- **Onverhard (F).** `GameRoute.rough`: stukken waar een racefiets in Zwift trager
  rolt (`crrFor(surface, "road") > 0,0045`, dus geen zand), uit `surfaceSections` van
  het pacingplan, dat het wegdek uit de routevorm haalt (`surfacesAlongShape`). De
  routecatalogus haalt daarom ook `zwift_routes.shape` op. In beeld een bruine weg en
  strook, in de HUD het wegdek, en een beslismoment "Onverhard".
- **Oefenen (E).** `src/lib/zwbgame/drills.ts`: zeven getekende korte koersen met elk
  een startopstelling en een doel. Niet opgeslagen of hervatbaar; je browser bewaart
  alleen welke je haalde (`zwbgame:v5:<lid>:drills`).

**Balans** (`npm run zwbgame:balance`, 12 seeds × 3 routes, gemiddelde plek van 24):

| Strategie | FTP 240 | FTP 270 | FTP 300 |
| --- | --- | --- | --- |
| Passief | 18,6 | 16,5 | 17,4 |
| Sparen | 21,8 | 20,3 | 20,8 |
| Roekeloos | 12,2 | 10,0 | 9,1 |
| Vol gas | 14,4 | 13,5 | 13,4 |
| Bot | 15,0 | 12,7 | 10,0 |
| Tacticus | 7,4 | 6,0 | 2,8 |

Met de slimmere bots wordt de tacticus 1,2–1,9 plek slechter dan in spelversie 6
(8,3/4,1/2,3); hij wint nog 9 tot 15 plekken op passief. Speeltijd gemiddeld 6,1–6,6
minuut, hooguit 7,4.

**Oefeningen** (`DRILLS=1 npm run zwbgame:balance`, 10 races per oefening, FTP 270):

| Oefening | Passief | Roekeloos | Bot | Tacticus |
| --- | --- | --- | --- | --- |
| Eerste selectie | 0 | 5 | 6 | 9 |
| Over de top | 0 | 7 | 7 | 10 |
| Slingshot | 0 | 1 | 0 | 6 |
| Overbruggen | 0 | 7 | 0 | 5 |
| Wegrijden | 0 | 3 | 0 | 8 |
| Puntenjacht | 0 | 5 | 0 | 0 |
| Ploegentijdrit | 3 | 3 | 3 | 3 (vol gas: 7) |

Passief meerijden haalt geen enkele weg-oefening. De tacticus is niet op punten
geschreven, dus 0 bij de puntenjacht zegt niets over de haalbaarheid; roekeloos haalt
hem de helft van de keren. In de ploegentijdrit wint vooral wie zelf beurten op kop
neemt.

**Verificatie.** Unit-tests (+6): het koerslogboek en opslaan met log, vaste plannen
van andere ploegen en een-twee en hard maken, tijdrittempo en langere beurten trager,
onverhard trager en de powerup-pool per route, burrito en spook (ook niet in de
laatste 400 m), elke oefening start en het doel van overbruggen. Playwright: 22
groen, met een nieuwe test voor een oefening (gekozen, gereden, uitslag en
koersverloop, niets bewaard) en de ploegentijdrit-orders. Screenshots op telefoon
bekeken: oefenlijst, tempo, acht ploegorders en de nabespreking. Die laatste had
eerst labels in de SVG die op een telefoon onleesbaar klein werden; nu staan ze als
tekst boven drie losse stroken. **Niet lokaal te verifiëren:** of de routes op
productie een `shape` hebben, en dus onverhard tonen; met de fixtures alleen in de
oefening Wegrijden gezien.

## Spelversie 6: tactiek (19 oktober 2026)

Waarom en het onderzoek: [Tactiek](zwbgame-tactiek.md), modules A, B en C. Lopende
races van versie 5 vervallen; uitslagen, de ladder en de tourstand blijven (hun
opslagsleutels staan nu vast op `v5`).

**Balans, voor en na** (`npm run zwbgame:balance`, 12 seeds × 3 routes per cel,
gemiddelde plek van 24; hetzelfde simulatiescript op beide engines):

| Strategie | FTP 240 voor → na | FTP 270 voor → na | FTP 300 voor → na |
| --- | --- | --- | --- |
| Passief (meerijden, sprint op 300 m) | 10,1 → 18,9 | 7,6 → 16,0 | 6,5 → 17,1 |
| Sparen | 23,5 → 21,8 | 23,6 → 20,0 | 23,3 → 19,7 |
| Roekeloos (aanvallen bij W′ > 60%) | 11,5 → 12,0 | 9,8 → 9,7 | 9,8 → 8,7 |
| Vol gas (steeds Naar voren) | 20,2 → 14,5 | 17,8 → 13,3 | 17,0 → 13,4 |
| Bot (de botstrategie) | 14,4 → 15,1 | 11,4 → 13,1 | 9,3 → 9,5 |
| Tacticus | 12,3 → 8,3 | 9,4 → 4,1 | 8,4 → 2,3 |

De tacticus rijdt wat het onderzoek als goed Zwift-racen beschrijft: hard starten,
een groep binnen 200 m meteen achterna, een aanval in de groep volgen, voor een klim
naar voren, over de top doortrappen, anders sparen in het wiel en laat sprinten met
de aerohelm. Voorheen was passief meerijden de beste strategie en verloor de tacticus
daar één à twee plekken op; nu wint hij 11 tot 15 plekken op passief. De kopgroep bij
de finish (finishers minder dan 1,5 s uit elkaar) bleef even groot: gemiddeld 4,3
tegen 4,1 renners bij FTP 270. Speeltijd gemiddeld 6,1–6,6 minuut, hooguit 7,4
(was 4,9–5,3).

**Kanttekeningen.** De tacticus ziet in de simulatie de inspanning van andere renners
direct; een speler ziet alleen het label "Aanval" en de knop Volg. Echte spelers
halen dit verschil dus niet helemaal. Dat de tacticus bij FTP 300 gemiddeld 2,3e
wordt, zegt ook dat de bots nog weinig tactiek rijden (module H). Passief meerijden
is nu een strategie voor de achterste helft: dat is de bedoeling, maar wie de game
zonder uitleg speelt, merkt het meteen.

**Verificatie.** Unit-tests (+6): meer beschutting dieper in de rij en geen op 12 m
achter één renner, naast de kop in de wind, Meerijden volgt tempo maar geen aanval
(wel met een gekozen wiel), geen supertuck in het wiel, beslismomenten met de
aanvaller om te volgen, opslagsleutels van ladder en tour blijven. De speeltijdtest
rekent nu met de vertraagde momenten. Playwright: alle 20 groen. Met een headless
browser een vrije race gespeeld: de labels "Start", "Sprint", "Aanval" met de knop
"Volg", en "Finale" verschenen; op een telefoon stond het label eerst tegen de rand
en staat het nu op een eigen regel. **Niet gedaan:** met de hand spelen, op een
telefoon of op de echte routebibliotheek. Of het speelgevoel klopt, moet de eigenaar
beoordelen.

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
