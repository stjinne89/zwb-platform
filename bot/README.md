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
5. Spraak, twee mogelijkheden:
   - **Piper** (aanbevolen, zo draait de bot nu): download
     `piper_windows_amd64.zip` van <https://github.com/rhasspy/piper/releases> en
     de stem `nl_BE-nathalie-medium.onnx` met het bijbehorende `.onnx.json` van
     <https://huggingface.co/rhasspy/piper-voices> (map `nl/nl_BE/nathalie/medium`).
     Pak ze uit in `bot/.piper/` (staat buiten git) en zet `PIPER_PATH` (naar
     `piper.exe`) en `PIPER_MODEL` (naar het `.onnx`-bestand) in `.env`. De ploeg
     koos deze Vlaamse vrouwenstem na de eerste race.
   - **Windows-stem** (Frank): laat beide leeg. Niets te installeren. Ontbreekt
     hij, voeg dan Nederlands toe onder Instellingen > Tijd en taal > Spraak.

   Een zin kost met Piper ongeveer een seconde. Daarom zet de bot bij
   `/ttt plan` alle zinnen vooraf klaar: eerst de klok, dan de coachmeldingen.
   Dat duurt bij vijf renners ruim een halve minuut.
6. Sauce: zet in Sauce for Zwift de webserver aan. `SAUCE_URL` is
   `http://localhost:1080` op de Sauce-pc zelf, of `http://<ip van die pc>:1080`
   vanaf een andere pc. Leeg laten = alleen de klok.
7. Start de bot met `npm start` en laat het venster open.

## Gebruiken

1. Laad het plan, op een van drie manieren:
   - **ZwiftGopher** (zwiftgopher.com/TTT), op de pc waar de bot draait: klik op
     Export Link; de link staat dan op het klembord. Geef in Discord `/ttt plan`
     zonder opties: de bot leest het klembord van zijn eigen pc. De link is te
     lang om in Discord te plakken.
   - **ZwiftGopher**, vanaf een andere pc: klik op Export JSON, sla de pagina op
     en geef het bestand mee bij `bestand`.
   - **TTT Planner** van het platform: klik op Botlink en plak die bij `link`.
2. Alleen jij ziet het antwoord, met het deel, de renners, watt en duur. Laad je
   een tweede plan zonder `deel` op te geven, dan vervangt het deel 1; onder het
   antwoord staat dan de knop **Dit is deel 2** om dat recht te zetten.
3. Ga in het spraakkanaal zitten en geef `/ttt start`, eventueel met
   `vertraging` in seconden tot de start van de eigen ploeg.
4. Laat Zwift op de Sauce-pc meekijken met een ploeglid.

| Commando | |
|---|---|
| `/ttt plan [link] [bestand]` | Plan laden; zonder opties van het klembord van de bot-pc |
| `/ttt start [vertraging]` | Starten in jouw spraakkanaal (standaard na 10 s) |
| `/ttt klim` | Vrij rijden: klok en coach zwijgen; kan ook met de knop Klim |
| `/ttt hervat` | De rotatie weer oppakken; kan ook met de knop Hervat rotatie |
| `/ttt plan deel:2` | Een plan klaarzetten voor het tweede deel van de race |
| `/ttt deel <nummer>` | Overgaan op het plan van dat deel; kan ook met de knop Deel 2 |
| `/ttt stop` | Stoppen en het kanaal verlaten |
| `/ttt skip` | Meteen de volgende renner |
| `/ttt plus <seconden>` | De huidige kopbeurt verlengen |
| `/ttt gelost <renner>` | Renner doet geen kopbeurten meer |
| `/ttt terug <renner>` | Renner draait weer mee |

Eén bot bedient één spraakkanaal per server tegelijk, en Sauce volgt één ploeg.

**Een klim.** Op een klim rijdt iedereen zijn eigen tempo en klopt de rotatie
niet meer. Druk aan de voet op **Klim**: de bot zegt "Klim. Eigen tempo." en
zwijgt daarna, ook over watt en lossen. Druk boven op **Hervat rotatie**: de
rotatie begint opnieuw met wie Sauce op dat moment vooraan ziet, of zonder Sauce
met de volgende in het plan. De bot herkent een klim niet zelf.

**Een race in delen.** Wil je op een vlakker stuk een andere volgorde, watt of
duur, zet dan vooraf een tweede plan klaar: maak het in ZwiftGopher, Export Link,
en geef `/ttt plan deel:2`. Dat kan voor of tijdens de race; wat loopt, loopt
door. Onder het statusbericht komt een knop **Deel 2**. Druk je daarop, dan zegt
de bot "Deel 2", maakt de koprijder zijn kopbeurt af en geldt daarna het nieuwe
plan. Wie gelost is, blijft gelost. Overschakelen gaat met de hand; de bot weet
niet waar op de route jullie zijn. `/ttt plan` zonder `deel` begint opnieuw en
wist de klaargezette delen.

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
