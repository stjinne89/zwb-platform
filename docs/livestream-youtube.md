# Livestreams via YouTube

Vraag van de eigenaar (2026-11-18): Zwift-races streamen via YouTube, en dat
simpel kunnen doen vanuit de app. Het volledige voorstel, met de afwegingen per
apparaat, staat in het Claude-document "Voorstel: Zwift-races live op YouTube
via de ZWB-app" van de eigenaar. Dit bestand houdt de conclusie, de besluiten en
de inrichting bij.

## Conclusie

Het beeld kan niet uit de app komen. Een browser kan Zwift niet opnemen en niet
naar YouTube streamen. Dat doet het apparaat waarop Zwift draait: OBS Studio op
een Windows-pc of Mac, of een screencast-app (bijvoorbeeld Larix Screencaster)
op een iPad of iPhone. De app doet de rest: een uitzending per race aanmaken
met titel, starttijd en beschrijving, en de stream afspelen bij de race. Er
loopt geen video over Netlify of Supabase.

Per kanaal maakt de app één vaste stream aan ("Zwift-races (via de clubapp)").
De streamsleutel daarvan blijft gelijk, ook als een lid opnieuw koppelt; OBS
hoeft dus maar één keer ingesteld. Per race maakt de app een uitzending met
auto-start en auto-stop: YouTube gaat live zodra er beeld binnenkomt en stopt
als het beeld stopt.

## Besluiten van de eigenaar (2026-11-18)

| Vraag | Besluit |
| --- | --- |
| Kanaal | Elk lid streamt op het eigen kanaal en koppelt dat aan de app |
| Apparaten | Windows-pc, Mac, iPad en iPhone; Apple TV en Android niet (er rijdt voor zover bekend geen lid op Android) |
| Zichtbaarheid | Standaard openbaar |
| Pushmelding | Ja, voor wie de melding aan heeft (fase 2) |
| Microfoon | Ja |
| Insluiten | De stream speelt af in de app |
| Wie mag klaarzetten | Een gekoppeld lid, alleen bij races waarvoor het ingeschreven of opgesteld is |
| Helper in fase 3 | Voor Windows en Mac |
| Fases | Alle fases nu |

## Fasering

0. **Proef zonder bouwen** (eigenaar): OBS met de sleutel uit YouTube Studio,
   proefstream op privé. Toetst beeld, upload en framerate van Zwift, ook op een
   iPad met een screencast-app.
1. **Uitzending vanuit de app** (gebouwd 2026-11-18): YouTube koppelen per lid,
   Stream klaarzetten op de race, speler op de racepagina en naast de live
   ZRL-stand, hulp en privacytekst. Google-verificatie aanvragen.
2. **Pushmelding, overlay en terugkijken**: live-status via `videos.list` met de
   API-sleutel (elke 2 minuten rond een race met een geplande stream), melding
   Liverace (één per race), kaart Nu live op het dashboard, ZRL-overlay als
   browserbron voor OBS.
3. **Starten vanaf de telefoon**: een kleine helper op de pc of Mac die OBS via
   obs-websocket (`StartStream`, `StopStream`) aanzet als het lid in de app op
   Start tikt. Op een iPad kan het niet: iOS laat alleen de gebruiker zelf een
   schermuitzending starten.

## Google Cloud inrichten

In het Google Cloud-project waar nu de `YOUTUBE_API_KEY` in zit
(console.cloud.google.com):

1. **YouTube Data API v3** staat al aan voor de kanaalsync van Media.
2. **Google Auth Platform → Branding**: appnaam, ondersteuningsadres, logo,
   startpagina en de link naar `/privacy` op het eigen domein; het domein als
   geautoriseerd domein.
3. **Audience**: type External, publicatiestatus Testing. Zet bij
   testgebruikers het Google-adres van elk lid dat in de proef koppelt (hooguit
   100).
4. **Data access**: voeg de scope `https://www.googleapis.com/auth/youtube` toe.
5. **Clients → Create client**: type Webapplicatie. Geautoriseerde
   redirect-URI's: `<NEXT_PUBLIC_SITE_URL>/api/youtube/callback`, en voor lokaal
   `http://localhost:3000/api/youtube/callback`.
6. Zet client-ID en -secret op Netlify als `YOUTUBE_OAUTH_CLIENT_ID` en
   `YOUTUBE_OAUTH_CLIENT_SECRET`. Zonder die twee blijft alles verborgen.

**Zolang de status Testing is, vervalt een koppeling na 7 dagen.** De app ziet
dat (`needs_reconnect`) en vraagt het lid opnieuw te koppelen; de sleutel blijft
gelijk. Blijvend werkt het pas na Googles verificatie: in Audience op
**Publish app**, daarna de verificatie voor een gevoelige scope (uitleg per
scope, een demovideo van het koppelen en klaarzetten, en de privacyverklaring
die het gebruik van de YouTube API Services noemt; die zin staat op
`/privacy#livestream`). Dat kan weken duren.

## Wat niet zeker is

- **Privé-vergrendeling.** Uploads via `videos.insert` vanuit een niet-geaudit
  API-project van na 28 juli 2020 zet YouTube op privé. Of dat ook voor
  `liveBroadcasts.insert` geldt, is niet gevonden. De eerste echte stream wijst
  het uit; anders een audit aanvragen.
- **Insluiten.** Oudere berichten noemen monetisatie als eis voor het insluiten
  van livestreams, nieuwere niet. Geen officiële bron gevonden. Lukt het niet,
  dan staat onder de speler de link Op YouTube.
- **Quota.** Ongeveer 50 eenheden per `insert` en `bind`, 1 per `list`, tegen
  10.000 per dag voor het hele project. Niet nagelezen in Googles
  quotacalculator (de Google-documentatie was vanuit de bouwomgeving niet
  bereikbaar).
- **Starttijd.** De uitzending staat tien minuten voor de start gepland, en
  minstens twee minuten na het klaarzetten. Of YouTube een geplande tijd vlak
  na nu altijd accepteert, is niet getest.
