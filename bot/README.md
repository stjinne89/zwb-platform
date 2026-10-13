# ZWB TTT-bot

Discord-bot voor ploegentijdritten. Hij haalt een plan uit de TTT Planner van het
platform, gaat in het spraakkanaal van de ploeg zitten en roept de kopbeurten om
met het doelvermogen. Draait Sauce for Zwift op dezelfde pc, dan volgt hij wat de
ploeg echt doet.

De bot is een eigen pakket en draait niet op Netlify: een spraakbot heeft een
proces nodig dat blijft draaien. Hij is bedoeld voor de pc waar Zwift en Sauce op
staan.

Achtergrond, drempels en wat nog niet gemeten is: `../docs/ttt-discord-bot.md`.

## Wat hij doet

- **Klok**: wie op kop rijdt, hoe lang nog, wie volgt. Aftellen op 30, 15, 10 en
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
5. Spraak: download de Windows-versie van [Piper](https://github.com/rhasspy/piper/releases)
   (`piper.exe`) en een Nederlandse stem (`nl_NL-….onnx` met het bijbehorende
   `.onnx.json`) en zet `PIPER_PATH` en `PIPER_MODEL` in `.env`. De bot roept
   `piper --model <stem> --output_file <wav>` aan met de zin op de invoer. Zonder
   die twee werkt alleen het statusbericht. Nog niet met een echte Piper getest.
6. Sauce: zet in Sauce for Zwift de webserver aan en laat `SAUCE_URL` op
   `http://localhost:1080` staan. Leeg laten = alleen de klok.

## Gebruiken

1. Captain: in de TTT Planner op **Botlink** klikken. De link staat op het klembord.
2. In Discord: `/ttt plan` en de link plakken. Alleen jij ziet het antwoord.
3. Ga in het spraakkanaal zitten en geef `/ttt start`, eventueel met
   `vertraging` in seconden tot de start van de eigen ploeg.
4. Laat Zwift op de Sauce-pc meekijken met een ploeglid.

| Commando | |
|---|---|
| `/ttt plan <link>` | Plan laden |
| `/ttt start [vertraging]` | Starten in jouw spraakkanaal (standaard na 10 s) |
| `/ttt stop` | Stoppen en het kanaal verlaten |
| `/ttt skip` | Meteen de volgende renner |
| `/ttt plus <seconden>` | De huidige kopbeurt verlengen |
| `/ttt gelost <renner>` | Renner doet geen kopbeurten meer |
| `/ttt terug <renner>` | Renner draait weer mee |

Eén bot bedient één spraakkanaal per server tegelijk, en Sauce volgt één ploeg.

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
