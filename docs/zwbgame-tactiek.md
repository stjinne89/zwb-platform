# ZWBgame als tactiekspel — onderzoek naar Zwift-racetactiek en bouwvoorstel

Opgesteld op 19 oktober 2026, op vraag van de eigenaar: ZWBgame moet meer een
tactisch spel worden dat Zwift-tactiek leert. **Status: A, B en C zijn dezelfde dag
gebouwd (spelversie 6, zie [ZWBgame](zwbgame.md#spelversie-6-tactiek-19-oktober-2026));
D tot en met I zijn nog niet gebouwd.** De diagnose hieronder gaat over spelversie 5,
zoals die toen op `main` stond. Bronnen staan onderaan. Het zijn bijna allemaal
praktijkverslagen en tests van Zwift Insider en Zwift zelf. Zwift publiceert zijn
draftmodel niet, dus elk getal over de slipstream is gemeten door derden.

## De conclusie in het kort

1. De game modelleert Zwift-racen van **vóór Pack Dynamics 4**: een blok dat
   voortdurend doorschuift ("churn") en elke aanval vanzelf terughaalt. Zwift
   veranderde dat in 2023 (PD4 en PD4.1). Het peloton is nu 1,5–2 km/u trager, je
   rijdt niet meer gratis langs de man op kop, en ontsnappingen houden vaker stand.
   Dat verklaart voor een deel waarom tactiek in de balanssimulatie van 28 september
   maar een à twee plekken verschil gaf.
2. **Meerijden neemt de speler de beslissingen af.** Het volgt elke versnelling tot
   160% van de drempel, ook een echte aanval, en dicht een gat tot 60 m vanzelf.
   Daardoor bestaan drie lessen die in Zwift het verschil maken niet: doortrappen
   over de top, een aanval wel of niet volgen, en het moment waarop je gelost bent.
3. **Bots zien alles meteen.** Een aanval wordt in dezelfde stap gevolgd. Zwift-tactiek
   als de slingshot, onopvallend wegrijden ("niet in het oranje") en aanvallen op een
   onverwacht moment heeft in de game dus geen effect.
4. **Na de race weet je niet waarom het zo liep.** Wie een tactiek moet leren, moet
   kunnen zien waar de koers beslist werd en waar zijn W′ heen ging.
5. Mijn voorstel is om eerst de koers te veranderen (punten 1 tot 3, modules A–C
   hieronder) en een nabespreking toe te voegen (module D). Pas daarna nieuwe
   inhoud: oefenkoersen, onverhard, extra powerups en meer ploegorders.

## Wat Zwift-racen tactisch anders maakt dan buiten

Deze feiten bepalen welke tactiek op Zwift werkt. Waar een getal staat, komt het
uit een test van Zwift Insider of uit de releasenotes. Het blijven metingen van
derden.

| Feit | Getal of bron | In de game nu |
| --- | --- | --- |
| Het wiel spaart op het vlak ongeveer een kwart tot ruim een derde | Vier renners op een rij, PD 4.1.1: plek 2 spaart 24%, plek 3 32%, plek 4 39% | Eén vaste factor (CdA × 0,7), hoe ver achter je ook zit |
| Op een klim spaart het wiel weinig, in een afdaling het meest | Hilly KOM: steil 2–3%, minder steil 10–12%, vlak 23–27%, afdaling 18–46% | Klopt vanzelf, omdat het via luchtweerstand loopt |
| Het wiel van een sterke renner spaart meer dan dat van een zwakke | 330 W-leider: 27% op het vlak, 270 W-leider: 23% | Klopt vanzelf (hogere snelheid) |
| De slipstream heeft een bereik in watt | Achter 300 W houd je het wiel ook met 250 W, misschien met 225 W | Sparen doet dit (trapt alleen wat nodig is) |
| De slipstream van een groep reikt verder dan die van één renner | PD4: de "schaduw" van een groep loopt ongeveer 20 m door en valt dan snel weg (waarneming, geen specificatie) | Beschutting tot 8 m, daarna niets |
| Inhalen kost sinds PD4.1 echte watt | Langs een renner die niet in het wiel zit, kom je alleen met genoeg "netto" vermogen, alsof je zelf in de wind zat | Meerijden trapt in het wiel 82% en schuift daardoor vanzelf naar voren |
| Supertuck alleen buiten het wiel | ≥ 58 km/u, ≤ −3%, < 11 W en niet in het wiel (PD4) | Sparen bij ≤ −3% en > 60 km/u, **ook in het wiel** |
| Het blok is sneller dan de solist | 50 renners op 250 W houden één renner op 350 W bij | Zit erin |
| De start is de eerste selectie | 1–2 minuten op ongeveer 150% FTP, daarna zakt het tempo | Zit erin (130% de eerste 90 s, bots hard weg) |
| Een gat van ongeveer 5 seconden is meestal het einde van je koers | Zwift Insider, startgids | Meerijden dicht tot 60 m (5 à 6 s) zelf, met 160% |
| Bergop opent een aanval het grootste gat | Snelheid loopt bergop bijna recht evenredig met vermogen, op het vlak veel minder | Zit erin, via de physics |
| Onverhard werkt als een korte klim | Hogere rolweerstand, langzamer, en stof in beeld | Ontbreekt: Crr is overal 0,004 |
| Je ziet de inspanning van anderen | In de rennerslijst wordt W/kg oranje vanaf 8 W/kg; de staande sprint-animatie verschijnt bij 2× FTP | Ontbreekt: je ziet plek en tijdverschil, geen inspanning |
| Een lead-out werkt anders dan buiten | Je rijdt door renners heen; ploeggenoten rijden daarom met 1–2 s ertussen vooruit, als springplanken | Lead-out is één ploeggenoot direct voor je |

## Catalogus van tactieken

Per tactiek: wat het is, waarom het op Zwift werkt, en wat de game er nu mee doet.
**Ja** = zit erin en de speler beslist zelf. **Deels** = het effect bestaat, maar
de speler kiest het niet of merkt er weinig van. **Nee** = ontbreekt.

### Voor de start

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| De route kennen: waar klimmen, sprints, onverhard en de finish liggen | Aanvalspunten en powerups plan je vooraf | Ja: hoogteprofiel en volgende segment in de HUD |
| De tegenstanders kennen (ZwiftPower-inschrijvingen, rennersprofiel) | Een tijdrijder zonder sprint valt vroeg aan; een sprinter wacht | Deels: rennerstypes staan in het clubpeloton, niet in de koers zelf |
| Een plan per ploeg: wie rijdt waarvoor, wie krijgt welke powerup | Ploegen die het vooraf afspreken, scoren meer | Deels: ploegorders bestaan, rollen niet |
| Vroeg in het startvak staan, opwarmen, 10 s voor de start al trappen | Plek vooraan en geen vertraging bij het startschot | Nee, en niet nodig (zie "Niet bouwen") |

### Start

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Hard starten en de eerste selectie halen | De eerste splitsing valt in de eerste 1–2 minuten; wie er dan af valt, ziet de kopgroep niet meer terug | Ja: Naar voren is 130% in de eerste 90 s |
| Na de start meteen terug in het wiel | Het tempo zakt na twee minuten; wie dan op kop blijft, verspilt | Deels: Meerijden doet het vanzelf |

### Positie en het wiel

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Nooit gelost raken | Alleen haal je een groep niet meer terug | Deels: Meerijden dicht elk gat tot 60 m zelf |
| Niet meer trappen dan het wiel vraagt | Elke watt boven het minimum is weg voor de finale | Ja: Sparen |
| Kopwerk alleen met een doel, op hooguit een vijfde van je sprintvermogen | Je moet twee aanvallen achter elkaar kunnen beantwoorden | Deels: Naar voren is altijd 100% |
| In het voorste derde zitten, niet helemaal vooraan | Vooraan zit je in de wind; achteraan sla je gaten dicht van renners die lossen | Deels: Sparen zakt naar achteren, maar achteraan zitten kost niets |
| Vóór een klim naar voren schuiven | Dan heb je ruimte om terug te zakken op de klim zonder te lossen | Deels: het effect bestaat, de straf achteraan ontbreekt |
| Doortrappen over de top | Een gat van 5 m op de top groeit in de afdaling tot 10–15 m | Nee: Meerijden dicht het vanzelf |

### Terrein

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Aanvallen op een klim of een korte steile helling | Daar ontstaan de grootste gaten | Ja |
| Aanvallen over de top en doorrijden tot je op snelheid bent | De groep zakt even in op de top | Deels: bots doen het niet bewust |
| Supertuck in de afdaling, alleen | Wie achter je rijdt moet trappen; sinds PD4 kan een groep niet meer samen tucken | Deels: tucken mag ook in het wiel |
| Aanvallen onderaan een afdaling | Wie dan wegrijdt, neemt snelheid mee; aanvallen bovenaan alleen is riskant, want een groep heeft meer vaart | Nee: geen bot of les doet dit |
| Aanvallen op onverhard | Het werkt als een korte klim | Nee |

### Aanvallen en ontsnappen

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Slingshot: 5–10 fietslengtes terugzakken en dan vanuit het wiel aanvallen | Je komt met snelheid de groep uit, zodat niemand je wiel pakt | Nee: wie in Meerijden zit volgt toch |
| Onopvallend weg: niet in het oranje, niet staand | Wat anderen niet zien, volgen ze niet | Nee: bots zien alles meteen |
| Aanvallen op een onlogisch moment, bijvoorbeeld op het vlak ver van de finish | Niemand verwacht het, dus niemand reageert meteen | Nee |
| Aanvallen als het veld moe is | Na lang hard rijden wil niemand achtervolgen | Deels: frisheid bestaat, bots kiezen er niet op |
| Met meer wegrijden | Een solist houdt het zelden; met twee tot vijf renners wel | Deels: kan, maar zonder afspraak |
| Een tegenaanval zodra een aanval is teruggehaald | Dan zit iedereen even stil | Nee: geen bot doet het |
| Niet elke aanval volgen | Elke achtervolging kost W′ voor de finale; kies op wie je reageert | Nee: Meerijden volgt alles |

### Achtervolgen en overbruggen

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Snel beslissen: alleen achterna of op de groep wachten | Een gat dat langer blijft, kost meer | Deels: alleen bij > 60 m een echte keuze |
| Samen achtervolgen | Sinds PD4 houdt een ontsnapping stand als de groep niet samenwerkt | Deels: churn maakt elke groep vanzelf snel |
| Overbruggen in de afdaling met supertuck | Een groep kan sinds PD4 niet samen tucken | Deels |
| Gelosten opsparen tot een groep die samenwerkt | Een tweede groep kan terugkomen | Deels: emergent, niet zichtbaar |

### Powerups

Gelezen op de releasenotes van Zwift 1.39 (2023) en Zwift Insider. Oudere
artikelen noemen kortere duren (veer en draft boost van vóór 1.39).

| Powerup | Effect | Beste gebruik | Game |
| --- | --- | --- | --- |
| Veer | −10% gewicht, 30 s | Korte steile klim, aanval bergop | Ja |
| Aerohelm | −25% CdA, 15 s | Net voor de sprint, zodat hij op de streep opraakt; overbruggen; afdaling | Ja |
| Draft boost | +50% slipstreambesparing, 40 s | Alleen in het wiel: herstellen of in een wiel van de sprint wachten | Ja |
| Burrito | 20 s geen slipstream voor wie in een kegel achter je zit | Op het vlak wegrijden | Nee (alleen in events) |
| Ghost | 15 s onzichtbaar, niet in de laatste 400 m | Samen met een slingshot | Nee (alleen in events) |
| Aambeeld | Zwaarder in procenten van je gewicht, 15 s, alleen bij ≤ −1,5% | Afdaling, met supertuck | Nee |
| Stoomwals | Minder rolweerstand, 30 s, op onverhard | Onverhard | Nee |
| Je powerup opmaken vóór de boog | Alleen dan krijg je er een nieuwe | Ja (één slot) |
| Powerups per ploeg afspreken | Aerohelm voor de sprinter, veer voor wie lang gaat | Nee |

### Finale

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Meestal beslist het in de laatste 500 m | Ontsnappingen houden zelden stand | Ja |
| Niet als eerste aanzetten | Wie het eerst gaat, wint zelden; geduldige renners winnen in de laatste 200 m | Deels: Sprinten vanaf 400 m, bots op vaste afstanden per type |
| Aerohelm zo laat dat hij op de streep opraakt | Op 600 m aangezet is hij op 150 m op | Ja |
| Draft boost aan in het wiel van wie het eerst springt, en er dan overheen | Je zit in het wiel met minder vermogen | Ja |
| Een oplopende finish anders aanpakken dan een vlakke | Op een helling wint W/kg, op het vlak watt | Ja (physics) |

### Ploegtactiek

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Lead-out met springplanken: ploeggenoten 1–2 s uit elkaar vooruit | Je rijdt door renners heen, dus een trein buiten-stijl werkt slecht | Deels: één renner direct voor je |
| Eén renner gaat lang, de anderen volgen in het wiel of wachten in de groep | Twee kansen op punten; de ploeg in de groep hoeft niet te achtervolgen | Nee |
| Niet meewerken als een ploeggenoot weg is | Wie in de groep op kop gaat, haalt zijn eigen man terug | Nee: Meerijden schuift vanzelf door en helpt dus achtervolgen |
| Een-twee: na de teruggehaalde aanval valt de volgende ploeggenoot aan | Een moe veld moet opnieuw reageren | Nee |
| Het hard maken: de ploeg rijdt tempo om de sprinters te lossen | Een sprintersroute wordt een koers voor klimmers | Nee |
| Breng me terug | Een ploeggenoot wacht en sleept je terug | Ja |
| Rollen per segment: sprinter op de FAL, klimmer op de FTS | Elke renner scoort waar hij sterk is | Deels: één puntenjager per ploeg |
| Een ploegleider die koers leest en roept | Ploegen met een DS winnen vaker | Niet nodig: de speler is de DS |

### Formats

| Format | Tactiek | Game |
| --- | --- | --- |
| Puntenrace (FAL, FTS, finish) | Vroege sprints volop rijden als het daarna rustig wordt; FTS valt meestal in de eerste ronde (grootste groep, frisse benen); één segment per renner kiezen | Deels: puntenjager, geen keuze per segment |
| Scratch | Alleen de finish telt: overleven en wachten | Ja |
| Race of Truth / tijdrit | Rijd je drempel voor de verwachte duur; begin ongeveer 5% onder je gemiddelde en bouw op; niet te hard in de eerste twee derde | Deels: Meerijden is 97%, verder geen keuze in tempo |
| Ploegentijdrit | Volgorde en vermogen vooraf; beurten van 30 s, op een klim harder; op een rij 2–3 m uit elkaar; de vierde renner telt, een renner die niet meer kan trekken, trekt nog één keer voluit en laat los | Deels: vierde renner telt, geen eigen beurten of tempo |

### De koers lezen

| Tactiek | Waarom het werkt | Game |
| --- | --- | --- |
| Zien wie hard rijdt (oranje W/kg in de lijst) | Een aanval zie je in de lijst voor je het op de weg ziet | Nee |
| De grootte van je groep en het gat kennen | Bepaalt of een ontsnapping kans heeft | Ja: groepen en tijdverschil |
| Weten wie je moet volgen | Een sterke renner volgen, een zwakke laten gaan | Deels: je kunt een renner aanklikken, maar ziet niet wie sterk is |

## Wat dit voor de game betekent

Drie dingen houden de tactiek klein. Ze zitten in de engine, niet in de inhoud.

**1. Meerijden is een automatische piloot.** `stepRace` laat een renner in Meerijden
elke versnelling van het wiel volgen tot `RIDE_CAP` (160%), en een gat tot
`FOLLOW_RANGE` (60 m) dichten met tot 2,5 m/s extra. Een aanval is 145%. Wie in
Meerijden zit, volgt dus elke aanval zolang zijn W′ het toelaat. De speler hoeft
niet te beslissen of hij een aanval volgt, of hij over de top doortrapt, of hij een
gat dichtrijdt. Juist die beslissingen leert Zwift-racen.

**2. Bots reageren zonder vertraging en zien alles.** Een bot in Meerijden reageert
in dezelfde stap op een aanval; zijn eigen keuze herziet hij elke 2 s racetijd.
Slingshot, onopvallend wegrijden en een verrassingsaanval kunnen daardoor niet
werken.

**3. De versnelde tijd laat geen ruimte om te reageren.** Bij `timeScale` 14 is één
seconde op je scherm 14 seconden koers. Een mens die na een seconde reageert op een
aanval, staat dan al 100 m achter. Daarom moest Meerijden wel automatisch volgen.
Wie de automatische piloot uitzet, moet dit eerst oplossen.

Dan nog twee kleinere punten. Het blok schuift door zoals vóór PD4 (`RIDE_BASE`
82% in het wiel is sneller dan het wiel zelf). En er is geen terugkoppeling: de
uitslag zegt wie won, niet waarom.

## Bouwvoorstel

Volgorde naar wat het meeste tactiek oplevert. A–D veranderen hoe de koers loopt en
horen bij elkaar; E–I voegen inhoud toe. Elke module krijgt dezelfde toets als de
balanssimulatie van 28 september: per spelerstrategie de gemiddelde plek over een
reeks races. **Doel voor A–C samen:** de beste tactiek wint minstens vier tot vijf
plekken van de 24 op passief meerijden, in plaats van een à twee. Hoeveel het
oplevert, weten we pas na die simulatie; het is geen belofte.

### A. Beslismomenten in vertraagde tijd

**Wat.** De tijd loopt langzamer (bijvoorbeeld 2× in plaats van 6–14×) waar de koers
beslist wordt: de start, de voet en de top van een benoemde klim, een aanval in
jouw groep, de laatste 1,5 km en de aanloop naar een sprint- of KOM-boog. Daarbuiten
loopt hij sneller dan nu, zodat de race in dezelfde 5–6,5 minuut blijft. Een kleine
markering in de HUD laat zien dat de tijd vertraagd is.

**Engine.** Niets: de simulatie blijft per 0,2 s deterministisch. Alleen de client
kiest per beeld hoeveel stappen hij draait. Een pure functie
`momentAt(state) → "normal" | "key"` in `engine.ts`, zodat de test het kan
controleren.

**Leert.** Dit maakt B en C mogelijk: een mens heeft tijd om te zien en te kiezen.

**Risico.** De race moet in de tijdsnorm blijven. Opslaan en hervatten veranderen
niet.

### B. Meerijden volgt het tempo, niet de aanval

**Wat.** Meerijden volgt het tempo van de groep tot ongeveer 115–120% van de drempel
en dicht een gat tot de rand van de slipstream (zie C). Een echte aanval volgen is
een keuze: een renner aanklikken (dat kan al) of Aanvallen. Doortrappen over de top
wordt een eigen beslissing: wie op de top op Meerijden blijft, laat een gat van een
paar meter vallen, en dat groeit in de afdaling.

**Engine.** `RIDE_CAP` per stand, en het automatisch dichtrijden begrensd. Bots
houden een volgdrempel per persoonlijkheid (`personality`), zodat sommigen alles
volgen en anderen niet.

**Leert.** Niet gelost raken, over de top doortrappen, kiezen wie je volgt.

**Risico.** De grootste ingreep in de balans. Moet samen met A, anders is de game
op telefoon niet te spelen.

### C. Slipstream en blok zoals in Pack Dynamics 4.1

**Wat.**
- Besparing per plek in de rij: plek 2 ongeveer 24%, plek 3 32%, plek 4 en verder
  39% (PD 4.1.1). Achteraan in een groep is het wiel dus goedkoper, maar je zit er
  verder van de aanval. Dat is precies de afweging "voorste derde".
- Een groepsschaduw die tot ongeveer 20 m langzaam afneemt in plaats van op 8 m weg
  te vallen.
- Langs een renner die niet in het wiel zit, kom je alleen met het vermogen dat je
  solo nodig zou hebben. Het blok schuift dan niet meer vanzelf door; naar voren
  komen kost moeite.
- Supertuck alleen buiten het wiel.

**Engine.** `stepRace` rekent de besparing uit het aantal renners voor je in de
schaduw, niet uit één renner. De inhaalregel komt in de snelheidsberekening van
wie in het wiel zit. `RIDE_BASE` wordt opnieuw ingesteld, want de reden van 82%
(het blok moet sneller zijn dan een solist) komt dan uit de getrapte besparing.

**Leert.** Positie in de groep, het verschil tussen naar voren gaan en in het wiel
blijven, en dat een ontsnapping kan blijven als de groep niet samenwerkt.

**Risico.** De getallen zijn metingen van derden met vier renners op een rij, niet
het echte model. We schrijven ze in de documentatie dan ook als aanname.

### D. Nabespreking na de race

**Wat.** Na de finish een tijdlijn van de koers met alleen feiten, zonder uitleg:
waar de groep brak en in welke groep jij zat, waar je W′ leeg was, je tijd in de
wind per kilometer, welke powerup je waar gebruikte, en bij ploegkoersen de punten
per segment. Op het hoogteprofiel, dat er al is.

**Engine.** Een lichte registratie in de race: per kilometer je tijd in de wind en
je W′, en de momenten waarop een groep uit elkaar valt (`groupsOf` per kilometer).
Geen namen in de opslag, alleen indexen, zoals `passes`.

**Leert.** Zelf zien waar de koers verloren werd. Zonder dit leert de speler alleen
door te raden.

**Huisregel.** AGENTS.md vraagt korte schermen zonder uitleg. Daarom feiten en
labels in het scherm, en wat ze betekenen op `/hulp/wedstrijden#zwbgame`. Bij een
strikte lezing kan dit tegen de regel ingaan. **Keuze voor de eigenaar.**

### E. Oefenkoersen

**Wat.** Korte scenario's van één tot twee minuten speeltijd met één doel en een
duidelijke uitkomst, zoals de Zwift SkillZ & DrillZ. Bijvoorbeeld:
1. **Eerste selectie:** haal na de start de kopgroep.
2. **Over de top:** blijf in de groep over drie korte hellingen.
3. **Slingshot:** win de sprint vanuit het wiel tegen drie sprinters.
4. **Overbruggen:** een groep van vijf rijdt 8 s voor je met een afdaling ervoor.
5. **Ontsnappen:** blijf voor het blok vanaf het onverhard (vraagt F).
6. **Puntenjacht:** scoor de meeste punten op twee sprints en een KOM.
7. **Ploegentijdrit:** kom met vier binnen onder de tijd (vraagt I).

**Engine.** Een scenario is een `RaceConfig` met een startstand (afstand, gat,
W′), een stuk route en een succesfunctie. De engine hoeft er weinig voor te
veranderen. Alleen een geslaagd scenario bewaren in de browser, zoals de uitslagen.

**Leert.** Elke tactiek uit de catalogus apart, met de uitleg op `/hulp`.

### F. Onverhard en wegdek

**Wat.** Rolweerstand per stuk route uit de bestaande wegdekmodule
(`src/lib/zwift/surfaces`, `surfacesAlongShape` en `ZWIFT_CRR`, al gebruikt door het
pacingplan). Een racefiets op onverhard is trager, dus het werkt als een korte klim.
In beeld een andere kleur weg en in de HUD het wegdek. Daarna de stoomwals.

**Engine.** `GameRoute` krijgt een Crr per 100 m, net als `grades`. De routecatalogus
haalt het wegdek op zoals `route-loader.ts` dat doet. Geen fietskeuze (zie "Niet
bouwen").

**Leert.** Aanvallen op onverhard, en vooraan zitten als je moeite hebt.

**Te controleren.** Of de echte ladder- en ZRL-routes onverhard hebben. De zeven
ladderroutes zijn grotendeels asfalt; zonder onverhard heeft dit alleen effect op
de ZRL-route van de week en de oefenkoersen.

### G. Koers lezen

**Wat.**
- In de koerslijst een markering bij renners die nu duidelijk boven hun drempel
  rijden, zoals het oranje in Zwift. De browser heeft `effort` al per renner, als
  verhouding tot de drempel. Er gaan dus geen watt of gewicht naar de browser.
- Het rennerstype (sprinter, klimmer, …) als icoon in de koerslijst, zoals je op
  ZwiftPower de profielen bekijkt. Het type staat nu al in het clubpeloton.
- Bots zien die markering ook. Een aanval onder de grens (de "stille" aanval) wordt
  later of niet gevolgd. Een slingshot vanaf 5–10 lengtes begint onder de grens,
  omdat het wiel helpt.

**Leert.** Wie je moet volgen, en hoe je wegrijdt zonder dat iemand reageert.

**Privacy.** Het type en de inspanning zijn geen nieuwe gegevens: de browser
heeft ze al. Geen nieuwe privacyversie nodig. Wel even nalopen.

### H. Bots met echte tactiek en meer ploegorders

**Bots.** Nu hangt het meeste af van toeval (`roll`) en een vaste finale-afstand
per type. Voorstel: aanvalspunten uit de route (top van een klim, onverhard, onderaan
een afdaling, een onverwacht moment op het vlak), een tegenaanval zodra een aanval
wordt teruggehaald, een volgdrempel per renner (wie volgt alles, wie wacht), en
achtervolgen in een groep alleen als er genoeg renners meedoen. Vermoeide velden
laten aanvallen eerder gaan.

**Ploegorders.** Bij de bestaande vier:
- **Maak het hard:** de ploeg rijdt tempo op kop om sprinters te lossen.
- **Niet meewerken:** als een ploeggenoot weg is, gaan je ploeggenoten in de groep
  op Sparen en rijden ze niet naar voren.
- **Ga mee:** een ploeggenoot springt mee met een aanval van een andere ploeg.
- **Een-twee:** na jouw aanval valt een ploeggenoot aan zodra die is teruggehaald.
- **Springplanken** in plaats van de huidige lead-out: twee ploeggenoten 1–2 s uit
  elkaar voor je in de laatste kilometer.

Tegenstanders gebruiken dezelfde orders, zodat je ze leert herkennen.

### I. Ploegentijdrit en tijdrit met eigen tempo

**Wat.** In de ploegentijdrit kies je hoe lang je op kop rijdt (kort, normaal, lang)
en wanneer je ploeggenoten een "laatste beurt" geven en loslaten. Die bediening stond
al in het ZRL-plan ("Op kop" en "Wissel") en is toen niet gebouwd. In de tijdrit en
de Race of Truth een tempo in stappen (bijvoorbeeld 92–105% van de drempel) in
plaats van de vaste 97%.

**Leert.** De vierde renner binnenhouden en doseren over de verwachte tijd.

### Extra powerups (bij E of H)

Burrito en ghost alleen samen met G, want zonder bots die pas reageren als ze iets
zien, doet de ghost niets. Aambeeld alleen samen met C (supertuck buiten het wiel).
Stoomwals alleen samen met F. In Zwift zijn burrito en ghost alleen in sommige
events toegestaan; in de game per spelvorm aan of uit.

## Niet bouwen, met reden

- **Zelf sturen of een eigen rijstrook kiezen.** Zwift zet je automatisch op de weg;
  sturen kan alleen met een paar apparaten. Op een telefoon maakt het de bediening
  zwaarder zonder dat het een Zwift-tactiek leert.
- **Wind en waaiers.** Zwift heeft geen wind. Een waaier zou buitentactiek leren.
- **Startvak, opwarmen, 10 s voor de start al trappen.** Dat is voorbereiding, geen
  keuze tijdens de koers. Het past in de hulptekst, niet in het spel.
- **Fiets wisselen voor onverhard (gravelbike).** Werkt echt in ZRL, maar alleen op
  een paar routes, en een fietskeuze vraagt een eigen scherm. Pas als F er is en
  de ZRL-route van de week onverhard heeft.
- **Categorieën, sandbaggers, zPower, double draft.** Geen tactiek die je in de game
  kunt kiezen.
- **Kans op een powerup bij een boog.** Alleen een lezersreactie zegt dat het een
  kans is; de game geeft er nu altijd een, en dat blijft zo tot een betere bron.
- **Een ploegleider (DS) als aparte rol.** De speler is in de game al de ploegleider.

## Voorstel voor de volgorde

1. **A + B + C** in één ronde, met een nieuwe balanssimulatie vóór en na. *Gebouwd
   op 19 oktober 2026 (spelversie 6). De tacticus wint nu 11 tot 15 plekken op
   passief meerijden, waar hij eerst één à twee plekken verloor. Afwijkingen van het
   voorstel hierboven: Meerijden gaat in het wiel tot 105% (in de wind 125%), niet
   115–120%, omdat 120% in het wiel nog steeds een aanval van 145% bijhoudt;
   Aanvallen ging van 145 naar 160%; vertraagde tijd is 3× in plaats van 2×, en de
   gewone tijd loopt sneller (racetijd / 330 s in plaats van / 390 s). Daarbij nodig
   gebleken: bots die om de beurt op kop gaan en als groep achtervolgen, en een
   zwaardere beurt op kop in een grote groep. Zonder die twee reed een groep op het
   tempo van één renner op 82% en hield elke ontsnapping stand.*
2. **D**, na de keuze over de huisregel.
3. **G** en de bots uit **H**: zonder bots die tactiek gebruiken, valt er weinig te
   lezen.
4. **E** (oefenkoersen), met de lessen op `/hulp`.
5. **I**, **F** en de ploegorders uit **H**, dan de extra powerups.

## Vragen voor de eigenaar

1. **Hoeveel automatische piloot?** *Beantwoord op 19 oktober 2026: voor iedereen
   alleen het tempo volgen, geen aparte stand.*
2. **Mag de nabespreking (D)** op het scherm staan als feiten zonder uitleg, met de
   betekenis op `/hulp`?
3. **Plannenboek.** Volgens AGENTS.md horen toekomstplannen in het plannenboek in je
   Drive. Dit document staat in `docs/` als onderzoek, zoals het ZRL- en FRR-plan
   eerder. Moet ik het voorstel ook in het plannenboek zetten?

## Bronnen

Gelezen op 19 oktober 2026.

- Zwift Insider, *Bike Racing Tactics: 9 Tips for Zwift Races* (Aki Sato): https://zwiftinsider.com/aki-sato-tips/
- Zwift Insider, *10 Tips for Sneaking Away in a Zwift Race*: https://zwiftinsider.com/sneaking-away
- Zwift Insider, *5 Intermediate Zwift Racing Tips*: https://zwiftinsider.com/5-racing-tips/
- Zwift Insider, *How to Start a Zwift Race: 5 Tips*: https://zwiftinsider.com/zwift-race-start-5-tips
- Zwift Insider, *Pack Dynamics 4 Is Live*: https://zwiftinsider.com/pd4-release/
- Zwift Insider, *Pack Dynamics v4.1.1 Speed Tests: 4-Rider Drafting with Road Bikes*: https://zwiftinsider.com/road-bike-drafting-pd411/
- Zwift Insider, *Saving Watts In the Draft: Climbs vs Descents vs Flats*: https://zwiftinsider.com/draft-savings/
- Zwift Insider, *Racing on Zwift – Challenges and Opportunities for Riders*: https://zwiftinsider.com/?p=44254
- Zwift Insider, *How the Race Was Lost: The Breakaway That Got Away*: https://zwiftinsider.com/race-lost-pd41-breakaway/
- Zwift Insider, *How the Race Was Lost* (ZRacing, breakaway attempt): https://zwiftinsider.com/race-lost-attack/
- Zwift Insider, *How the Race Was Lost: Timing and Teammates*: https://zwiftinsider.com/how-the-race-was-lost-3/
- Zwift Insider, *How the Race Was Won: First Across the Line* (Crit City): https://zwiftinsider.com/race-won-crit-city/
- Zwift Insider, *How the Race Was Won: ZRL Team Tactics On Two Bridges Loop*: https://zwiftinsider.com/race-won-zrl-two-bridges-loop/
- Zwift Insider, *How the Race Was Won* (ZRL, chasing en sprintpunten): https://zwiftinsider.com/race-won-chasing/
- Zwift Insider, *Team Tactics: Learning the Nuances of Zwift Racing*: https://zwiftinsider.com/team-tactics-race-nuances
- Zwift Insider, *"Seeing" the Race on Zwift*: https://zwiftinsider.com/seeing-the-race
- Zwift Insider, *PowerUps in Zwift: Advanced Usage Tips*: https://zwiftinsider.com/powerup-usage
- Zwift Insider, *Zwift Update Version 1.39* (powerup-balans): https://zwiftinsider.com/update-1-39-0-110983
- Zwift Insider, ZRL-ploegentijdrit-verslagen (onder meer *Douce France TTT*): https://zwiftinsider.com/race-won-douce-france-ttt/
- Zwift Insider, *Sprinting on Zwift (SkillZ and DrillZ)*: https://zwiftinsider.com/sprinting-skillz/
- Zwift, *Race Recon: Watopia Climber's Gambit*: https://www.zwift.com/uk/news/28869-race-recon-climbers-gambit
- Zwift, *Zwift Race Types: The Time Trial*: https://www.zwift.com/uk/news/20931-zwift-race-types-the-time-trial
- Slowtwitch, *Zwift Racing 101: Quick Start Guide*: https://slowtwitch.com/training/zwift-racing-101-quick-start-guide/
- Zwift-forum, *Pack Dynamics 4 Release [April 2023]*: https://forums.zwift.com/t/pack-dynamics-4-release-april-2023/605018
