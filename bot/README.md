# ZWB TTT-bot

Discord-bot voor ploegentijdritten. Hij haalt een plan uit de TTT Planner van het
platform, gaat in het spraakkanaal van de ploeg zitten en roept de kopbeurten om
met het doelvermogen. Draait Sauce for Zwift op dezelfde pc, dan volgt hij wat de
ploeg echt doet.

De bot is een eigen pakket en draait niet op Netlify: een spraakbot heeft een
proces nodig dat blijft draaien. Hij draait op een eigen pc: die met Zwift en
Sauce, of een andere in hetzelfde netwerk.

Achtergrond, drempels en wat nog niet gemeten is: `../docs/ttt-discord-bot.md`.

## Wat hij doet

- **Klok**: wie op kop rijdt, hoe lang nog, wie volgt. Aftellen op 30, 10 en
  5 seconden; bij de wissel naam, watt en duur.
- **Sauce** (optioneel):
  - wisselt de ploeg eerder of later dan de klok, dan schuift de rotatie mee;
  - rijdt de koprijder te hard of te zacht, dan zegt de bot hoeveel watt;
  - lost een renner, dan krijgt die geen kopbeurt meer, tot hij terug is;
  - bij vier renners over: de melding dat niemand meer mag lossen;
  - elke vijf minuten het gemiddelde naast de snelheid uit het plan.
- **Statusbericht** in het tekstkanaal met knoppen: +10 s, Volgende, Stop, en een
  keuzelijst om een renner gelost of terug te zetten.

## Installeren

1. Node 22 of nieuwer.
2. `npm install` in deze map.
3. Maak een Discord-app op <https://discord.com/developers/applications>, voeg een
   bot toe en kopieer het token. Nodig hem uit met de scopes `bot` en
   `applications.commands` en de rechten Berichten verzenden, Verbinden en
   Spreken.
4. Kopieer `.env.example` naar `.env` en vul `DISCORD_TOKEN` in. Het token blijft
   op deze pc; het hoort niet in de repo of in Netlify.
5. Spraak: op Windows gebruikt de bot de Nederlandse stem van Windows (Frank),
   zonder iets te installeren. Ontbreekt die, voeg dan Nederlands toe onder
   Instellingen > Tijd en taal > Spraak. Liever [Piper](https://github.com/rhasspy/piper/releases)?
   Zet `PIPER_PATH` (naar `piper.exe`) en `PIPER_MODEL` (een `nl_NL-….onnx`) in
   `.env`. Piper is niet getest.
6. Sauce: zet in Sauce for Zwift de webserver aan. `SAUCE_URL` is
   `http://localhost:1080` op de Sauce-pc zelf, of `http://<ip van die pc>:1080`
   vanaf een andere pc. Leeg laten = alleen de klok.
7. Start de bot met `npm start` en laat het venster open.

## Gebruiken

1. Haal de link van het plan op, uit een van de twee:
   - **ZwiftGopher** (zwiftgopher.com/TTT): klik op Export JSON en kopieer het
     adres van het tabblad dat opent, of klik op Export Link.
   - **TTT Planner** van het platform: klik op Botlink.
2. In Discord: `/ttt plan` en de link plakken bij `link`. Alleen jij ziet het
   antwoord. Is een ZwiftGopher-link te lang voor Discord (meer dan 6000 tekens,
   bij grote ploegen), sla dan de JSON op en geef die mee bij `bestand`.
3. Ga in het spraakkanaal zitten en geef `/ttt start`, eventueel met
   `vertraging` in seconden tot de start van de eigen ploeg.
4. Laat Zwift op de Sauce-pc meekijken met een ploeglid.

| Commando | |
|---|---|
| `/ttt plan <link of bestand>` | Plan laden uit ZwiftGopher of de TTT Planner |
| `/ttt start [vertraging]` | Starten in jouw spraakkanaal (standaard na 10 s) |
| `/ttt stop` | Stoppen en het kanaal verlaten |
| `/ttt skip` | Meteen de volgende renner |
| `/ttt plus <seconden>` | De huidige kopbeurt verlengen |
| `/ttt gelost <renner>` | Renner doet geen kopbeurten meer |
| `/ttt terug <renner>` | Renner draait weer mee |

Eén bot bedient één spraakkanaal per server tegelijk, en Sauce volgt één ploeg.

Met `COACH=log` in `.env` spreekt alleen de klok; wat de coach zou zeggen of doen
komt dan alleen in het logboek. Dat logboek staat per dag in `.cache/ttt-<datum>.log`:
elke klokmelding, elk advies van de coach en wat de bot daarvan uitsprak.

## Ontwikkelen

```bash
npm test
```

```bash
npm run typecheck
```

`rotation.ts` en `coach.ts` doen geen I/O en zijn los te testen. `sauce.ts` is het
enige bestand dat de vorm van de Sauce-data kent; pas `toSample` aan als
`../scripts/sauce-ttt-probe.mjs` iets anders laat zien.
