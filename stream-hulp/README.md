# ZWB stream-hulp

Zet OBS aan of uit als je in de app op **OBS starten** of **OBS stoppen** tikt
(livestreams, fase 3). Draait op de Windows-pc of Mac met OBS; laat het venster
open tijdens de race. Achtergrond en besluiten: `../docs/livestream-youtube.md`.

## Hoe het werkt

1. Op je profiel bij YouTube: **Hulp-app koppelen** geeft een koppelcode. Daarin
   staan het adres van de app, een eigen Realtime-kanaal en een geheim.
2. De hulp luistert op dat kanaal (Supabase Realtime, uitgaand, geen open poort).
   Een opdracht is ondertekend met HMAC-SHA256 en geldt een minuut, één keer.
3. De hulp bedient OBS via de ingebouwde afstandsbediening (obs-websocket, OBS 28
   of nieuwer, poort 4455, met wachtwoord): `StartStream`, `StopStream`.
4. De hulp meldt de stand van OBS aan de app (`POST /api/youtube/hulp`, ook
   ondertekend): bij het starten, bij elke verandering en elke tien minuten.

Een nieuwe koppelcode maakt de oude ongeldig.

## Installeren

- **Windows:** `ZWB-stream-hulp-installeren.bat` (op je profiel, of in
  `public/downloads`) haalt `installeren.ps1` van GitHub (main) en zet de hulp in
  `%LOCALAPPDATA%\ZWB-stream-hulp`, met een snelkoppeling op het bureaublad.
- **Mac:** in Terminal
  `curl -fsSL https://raw.githubusercontent.com/stjinne89/zwb-platform/main/stream-hulp/installeren.sh | bash`.
  Zet de hulp in `~/ZWB-stream-hulp`, met `ZWB stream-hulp.command` op het
  bureaublad.

Met de hand: Node 22 of nieuwer, `npm install`, `.env.example` naar `.env`
kopiëren en invullen, `npm start`.

## Testen

`npm test` (het protocol) en `npm run typecheck`. Het platform houdt zijn kopie
van het protocol gelijk met `tests/unit/stream-hulp-protocol.test.ts`.
