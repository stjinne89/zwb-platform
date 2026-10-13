# TTT-bot voor Discord

Stand: 2026-10-13. Gebouwd en met unit-tests gedekt; **niet** in Discord, niet met
Piper en niet tegen Sauce gedraaid. Wat hieronder "niet gemeten" heet, is een
aanname tot de proef is gedaan.

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
  `0229_ttt_plan_share_token.sql`), aangemaakt met de knop Botlink in de planner,
  in te trekken met Link intrekken. De route leest met de service-role en geeft
  `tttPlanExport` terug (`src/lib/ttt/plan-export.ts`): naam, event, schatting van
  ZwiftGopher en per renner volgorde, naam, Zwift-ID, kopbeurt-watts en -duur.
  FTP, gewicht en lengte gaan niet mee.
- **Bot** (`bot/`, eigen pakket): draait op de pc waar Zwift en Sauce staan. Een
  spraakbot heeft een proces nodig dat blijft draaien, en dat kan niet op Netlify.
  Installatie en commando's: `bot/README.md`.
- **Geen live data naar het platform.** De bot leest Sauce lokaal; er is geen
  ingest-endpoint en er wordt geen vermogen opgeslagen.

Waarom eigen bouw en geen fork: tttt-discord hangt aan Redis en aan Google
Translate voor de stem (namen gaan dan naar Google), en heeft geen plek voor
watts of live data. De commando's, het statusbericht en de aftelmomenten zijn
overgenomen.

## Onderdelen van de bot

| Bestand | Wat |
|---|---|
| `plan.ts` | Plan ophalen en valideren. Haalt alleen `/api/ttt/plan/<token>` op bij een toegestane herkomst (`PLAN_ORIGINS`), niet zomaar een adres uit Discord. |
| `rotation.ts` | De rotatie, puur: wie rijdt, hoe lang nog, wie volgt; `skip`, `plus`, gelost/terug, en `syncLeader` voor wat Sauce ziet. |
| `coach.ts` | De regels op Sauce-metingen, zonder I/O. |
| `sauce.ts` | Websocket naar Sauce; `toSample` is de enige plek die de vorm van de data kent. |
| `speech.ts` | Wachtrij: één stem tegelijk, een wissel gaat voor op coaching, wat te lang wacht vervalt (klok 3 s, coaching 8 s). |
| `tts.ts` | Piper, lokaal, met een cache per zin. De klokzinnen worden bij `/ttt plan` klaargezet. |
| `session.ts` | Eén ploegentijdrit: verbindt rotatie, coach en spraak. |
| `index.ts` | Discord: commando's, knoppen, spraakkanaal, statusbericht. |

## Coachregels en drempels

Constanten bovenin `bot/src/coach.ts`. **Alle waarden zijn een eerste inschatting,
niet afgeleid uit een meting.**

| Regel | Drempel |
|---|---|
| Koprijder | de voorste renner van de ploeg, zodra hij daar 3 s ligt |
| Vroege wissel | een andere koprijder dan de klok dacht: de rotatie gaat mee, de bot noemt alleen naam en watt |
| Late wissel | de verwachte koprijder komt binnen 20 s na de klokwissel op kop: zijn kopbeurt begint pas dan |
| Vermogen op kop | gemiddelde over 10 s, de eerste 5 s niet meegeteld; melding vanaf 15 W of 6% afwijking, afgerond op 5 W, hooguit eens per 20 s per renner; alleen als klok en Sauce het over de koprijder eens zijn |
| Lossen | meer dan 3 s achter de voorste, 10 s lang, of 10 s uit beeld. De renner krijgt geen kopbeurt meer |
| Terug | binnen 1,5 s van de voorste, 5 s lang |
| Vier over | één keer, als er van een grotere ploeg vier renners over zijn (de ploegentijd is de vierde renner) |
| Tempo | elke 5 minuten het gemiddelde van de voorste renner naast `estimatedSpeedKmh` |

Een renner die met de hand gelost is gezet, beoordeelt de coach niet meer.
Renners die Sauce nooit zag en renners zonder Zwift-ID blijven buiten de regels.

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
