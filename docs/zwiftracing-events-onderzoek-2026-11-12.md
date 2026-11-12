# ZwiftRacing in verwachtingen en matchups van events — onderzoek

2026-11-12. Vraag van de eigenaar: kunnen we zwiftracing.app, dat sinds
2026-11-11 vanaf de server bereikbaar is, gebruiken voor de verwachtingen en
matchups bij events? Dezelfde dag gebouwd; zie **Herziening en wat er gebouwd
is** onderaan. Die herziening gaat voor waar ze iets hierboven tegenspreekt.

## Wat er nu met ZwiftRacing gebeurt

- **Club Ladder** (matchup, parcoursadvies, briefing): 90 dagen W/kg en legacy
  vELO (vELO1) uit de rennerpagina (`lib/zwiftracing/rider-page.ts`,
  `rider-sync.ts`). Alleen voor ladderrenners.
- **ZRL-racebriefje** (`race-briefing/field.ts`): sorteert op vELO als 70 % van
  het veld er een heeft, anders op ZRS. `zwift_rider_metrics.velo` wordt alleen
  gevuld met een API-sleutel (`client.ts`), die er niet is. Dus altijd ZRS, en
  tegenstanders hebben meestal geen vermogen.
- **ZWBeter racen** (`zrl-analysis/expectation.ts`): de verwachting na de race is
  de ZRS van vóór de race. vELO lag stil omdat "eerst de vELO van vóór de race
  bewaard moet worden".

## Wat zwiftracing.app per event geeft (gemeten 2026-11-12, zonder sleutel)

Een gewoon verzoek op `zwiftracing.app/events/<zwift-event-id>` geeft 200, met
de loaderdata in de HTML (TanStack Start, `$R[n]=…`), 0,3 tot 1,5 MB per pagina.

**Vóór de race** (`mode:"signups"`), per pen (subgroep):
- per renner `eventRating` en `expectedPosition`. `eventRating` is exact de som
  van de routeweging × de vELO2-factoren van de renner (nagerekend: 799,31);
- routeweging per event: `velo.factorWeights` (endurance, pursuit, sprint,
  punch, climb, timeTrial; bron `gpx`), ook in de eventlijst `/events`
  (774 publieke races voor de komende week);
- per renner: 90 dagen W/kg (`power.wkg5` … `wkg1200`), vELO2 met factoren,
  fenotype (sprinter, puncheur …), handicaps per profiel (flat, rolling, hilly,
  mountainous); ook gewicht, lengte, leeftijd en zFTP (die nemen we niet over).

**Na de race** (`mode:"results"`, `resultsFinalized`), per renner: `position`,
`expectedPosition`, `eventRating` van vóór de race, vELO voor en na (ook per
factor), W/kg in de race. De verwachting van vóór de start blijft dus bij
ZwiftRacing bewaard; zelf vastleggen hoeft niet.

**Rennerpagina** (`/riders/<id>`) heeft ook `velo.factors`. Een eigen
`eventRating` kan dus ook zonder eventpagina: factoren × de routeweging van een
ander event op dezelfde route.

## Meting: ZwiftRacing tegenover ZRS

ZRL ronde 1 race 6 (27 oktober, event van B1, vier pennen), verwachte volgorde
tegenover de echte finishvolgorde, alleen renners met beide waarden.

| Pen | Renners | Spearman ZRS | Spearman ZwiftRacing | Top 10 goed ZRS | Top 10 goed ZR |
|---|---|---|---|---|---|
| 7428014 | 33 | 0,69 | 0,67 | 7 | 7 |
| 7428010 | 54 | 0,59 | 0,67 | 5 | 4 |
| 7428013 | 39 | 0,60 | **0,81** | 4 | **8** |
| 7428011 | 42 | 0,64 | **0,72** | 4 | **7** |

In drie van de vier pennen beter, in één gelijk. Eén race: een aanwijzing, geen
bewijs. ZwiftRacing rekent deze puntenrace als scratch: zijn verwachting is de
finish, niet de segmentpunten.

## Club Ladder: terugtoets op vijf ladderraces

Vraag eigenaar (dezelfde dag): ook al kent ZwiftRacing een ladderevent vooraf
niet, kunnen we voor de verwachting extra data binnenhalen of leren van hoe
ZwiftRacing het doet?

Vijf gereden ladderraces (9–11 november) waarvan de verwachting van vóór de
start in `club_ladder_event_expectations` (0308) staat. Per race: onze
verwachting (W/kg per duur × onze routeweging, zoals `routeRatings`), die van
ZwiftRacing (`eventRating` bovenaan de uitslagpagina) en de combinatie (beide
als z-score, opgeteld, zonder iets te fitten). Alleen renners die finishten en
in beide stonden (6–10 per race).

**Correctie bij de bouw:** de `eventRating` bovenaan de uitslag van een
ladderrace staat op de schaal van vELO1 (legacy), niet vELO2; de vELO2-versie
staat in `velo.seed`. De kolom ZwiftRacing hieronder is dus vELO1. Zie de
herziening onderaan.

| Event | Spearman ons | ZwiftRacing (vELO1) | Combinatie | Winnaar goed (ons / ZR) |
|---|---|---|---|---|
| 5785027 | 0,63 | 0,38 | 0,65 | ja / ja |
| 5779769 | 0,43 | 0,32 | 0,55 | nee / nee |
| 5778036 | 0,72 | 0,79 | 0,85 | ja / ja |
| 5783454 | 0,71 | 0,83 | 0,77 | ja / ja |
| 5785029 | 0,20 | 0,60 | 0,65 | ja / ja |
| **gemiddeld** | **0,54** | **0,58** | **0,69** | 4 / 4 |

Los zijn ze ongeveer even goed; samen beter dan elk apart, in vier van de vijf
races. Logisch: wij meten wat iemand kán trappen, ZwiftRacing wat iemand er in
races mee haalt (positie, draften, tactiek). Vijf races en ~45 renners: een
aanwijzing.

**Hoe ZwiftRacing rekent** (uit de data, niet uit documentatie):
- vELO2 per renner is een rating uit uitslagen, met zes factoren: endurance,
  pursuit, sprint, punch, climb, timeTrial.
- Per route een weging over die zes uit de gpx (`factorWeights`, versie 3.13);
  `eventRating` = weging · factoren; de verwachte plek is de volgorde daarvan.
- Geen eigen gewichtscorrectie: die zit al in de uitslagen.
- De weging lijkt per route vast (twee events op dezelfde route: identiek).

**Wat er vooraf voor een ladderrace te halen is**, zonder eventpagina:
- vELO2-factoren per renner uit de rennerpagina, die `rider-sync.ts` al ophaalt
  (geen extra verzoeken, alleen `velo.factors` erbij lezen);
- de routeweging van ZwiftRacing per route uit eerdere events op die route:
  de eventlijst (~770 publieke races per week) en de uitslagpagina's van eerdere
  ladderraces. Een route die nergens voorkomt heeft geen weging.

## Wat niet werkt of niet vaststaat

- **Ladderevent van vanavond** (5791853): 404, "Unable to find event". Het
  ladderevent van gisteren staat er wel, met uitslag. ZwiftRacing kent een
  ladderevent dus pas achteraf, of in elk geval niet een paar uur vooraf.
- **ZRL vóór de race**: niet te controleren. De komende ZRL-race (17 november,
  ploegentijdrit) heeft nog geen Zwift-ID's in ZWB, en in de eventlijst van
  ZwiftRacing staat geen officiële ZRL-race. Controleren zodra de Zwift-events
  er zijn. Zonder eventpagina: de terugvaloptie hierboven (rennerpagina's, één
  per seconde; een divisie van 40–50 renners past in drie runs van de cron).
- Het is uitlezen van een website, niet een API: de opbouw of de toegang kan
  zonder aankondiging veranderen. De pagina's gebruiken verwijzingen (`$R[n]`),
  dus de platte regex uit `rider-page.ts` is te kwetsbaar; nodig is een kleine
  parser voor deze letterlijke JS-vorm (zonder `eval`).

## Herziening en wat er gebouwd is (2026-11-12)

### Opnieuw gemeten

Ladder, dezelfde vijf races, Spearman met de uitslag (gemiddeld):

| Verwachting | Spearman |
|---|---|
| Ons vermogen (W/kg × routeweging) | 0,54 |
| vELO1 | 0,58 |
| Ons vermogen + vELO1 (z-scores gemiddeld) | **0,70** |
| Ons vermogen + vELO2 × routeweging van ZwiftRacing | 0,61 |

ZRL ronde 1 race 6, vier pennen, gemiddeld:

| Verwachting | Spearman |
|---|---|
| ZRS | 0,63 |
| vELO2 × routeweging (`eventRating` van vóór de race) | 0,72 |
| vELO2 zonder routeweging | 0,70 |
| vELO1 | 0,72 |
| ZRS + ZwiftRacing samen | niet beter dan ZwiftRacing alleen |

Conclusie: de routeweging van ZwiftRacing voegt weinig toe; vELO1 doet bijna
hetzelfde en hebben we al. Daarom geen eigen tabel met routewegingen en geen
oogst van de eventlijst. Wel: voor de ladder vermogen samen met vELO1, voor de
ZRL de rating van ZwiftRacing in plaats van de ZRS.

### Gebouwd

- **Parser** `lib/zwiftracing/tsr-data.ts`: leest de letterlijke JS-vorm van
  TanStack Start zonder `eval`; `event-page.ts` haalt daaruit pennen, renners,
  `eventRating` (alleen vóór de race), `expectedPosition`, `position`, W/kg en
  fenotype.
- **Club Ladder** (`club-ladder/briefing.ts` `ladderRatings`,
  `zwiftracing/combine.ts`): de sterkte is ons vermogen samen met vELO1, als
  z-scores gemiddeld; heeft minder dan 70 % van de renners een vELO1, dan alleen
  vermogen. Geldt voor het racebriefje, Onze vijf en de verwachting in de
  uitslag. vELO1 gaat mee in de vastgelegde verwachting van vóór de start (in
  de jsonb van 0308, geen migratie).
- **ZRL-racebriefje** (`race-briefing/load.ts`): de rating van de eventpagina
  van ZwiftRacing als 70 % van het veld er een heeft, anders vELO1 per renner,
  anders de ZRS. Nooit door elkaar: twee schalen. W/kg en rennerstype van
  ZwiftRacing vullen aan waar Zwift niets heeft; het type staat bij Volgen.
- **ZWBeter racen**: de sync haalt na de race de uitslagpagina één keer op en
  bewaart voor leden de verwachte en echte plek (0326,
  `zwiftracing/race-expectations.ts`). Je race toont "verwacht door
  ZwiftRacing", Jouw races het gemiddelde verschil.
- **Gewone Zwift-race en FRR** (`events/[id]`): tot een week vooruit het blok
  Verwachting ZwiftRacing met de aangemelde leden, hun pen, verwachte plek en
  type; eventpagina een half uur in de cache.
- **Sync** (`rider-sync.ts`): ook de renners die de afgelopen twee dagen in een
  racebriefje stonden (vELO1 en type), en per run twee uitslagpagina's.

### Nog niet vastgesteld

- Of ZwiftRacing een ZRL-race vooraf kent. Zo niet, dan valt het briefje terug
  op vELO1, en dat was op race 6 even goed.
- Migratie 0326 is niet lokaal te testen (geen Docker of Supabase-config).
