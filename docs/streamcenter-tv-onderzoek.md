# Streamcenter op de tv — alle routes (onderzoek, 2026-11-26)

Vraag van de eigenaar: "alle mogelijkheden onderzoeken om het streamcenter
makkelijk op de TV te laten werken". Geen code; dit is het overzicht en een
voorstel. Uitgangspunt is wat er sinds 2026-11-25 staat: `/streams/[datum]`
met de knop TV (raster schermvullend op zwart, wake lock, op de telefoon alle
streams gedempt starten, Android liggend). Zie in `PLAN.md` de rondes
"Streamcenter per avond, links per stream en TV" en "TV op de telefoon start
alle streams".

## Wat het lastig maakt

1. **Inloggen.** Het streamcenter is alleen voor ingelogde leden (de privacytekst
   belooft: ingelogde leden zien de stream met je naam). Alles wat niet in
   jouw eigen browser draait — de browser van de tv, een Chromecast-ontvanger,
   een tabblad dat Chrome zelf naar de tv cast — is niet ingelogd. Inloggen op
   een tv gaat nu alleen met e-mail en wachtwoord via de afstandsbediening; de
   inloglink per mail opent op de telefoon, niet op de tv.
2. **Vier YouTube-spelers tegelijk.** Een pc kan dat. Of een tv-browser,
   Chromecast of goedkope stick vier livestreams tegelijk decodeert, is nergens
   gedocumenteerd en moet echt getest worden. LG schrijft zelf dat de
   tv-browser anders werkt dan op een pc en dat niet alle inhoud goed speelt.
3. **YouTube-embeds** vragen een referrer (anders fout 153). Het streamcenter
   stuurt `strict-origin-when-cross-origin`; dat is goed, ook op een tv.
4. **Bedienen met een afstandsbediening.** Geen muis: knoppen moeten met de
   pijltjes bereikbaar zijn, en Terug moet iets zinnigs doen.

## De routes

| # | Route | Vanaf | Beeld | Gemak | Bouwen |
|---|-------|-------|-------|-------|--------|
| A | Laptop met HDMI-kabel, TV-knop | elke pc of Mac | het beste (1080p of meer) | kabel nodig | niets |
| B | Chrome: Casten → Tabblad casten | pc of Mac met Chrome, naar Chromecast, Google TV of tv met Chromecast | hele raster samen hooguit 720p | goed, pc blijft aan | niets |
| C | Scherm van de pc spiegelen | Windows `Win+K` (Miracast) of Mac AirPlay | als B, wisselt per tv | goed als de tv het kent | niets |
| D | Telefoon spiegelen, TV-knop | iPhone AirPlay (Apple TV, AirPlay-tv), Android Scherm casten of Samsung Smart View | redelijk; telefoon decodeert vier streams | goed, kost accu | gebouwd 2026-11-25 |
| E | Browser van de tv zelf | Samsung, LG, Fire TV (Silk); Android/Google TV heeft standaard geen browser | onbekend | slecht: inloggen met de afstandsbediening | niets, maar onbeproefd |
| F | **TV koppelen met een code** | elke tv met browser | als E | goed: één keer koppelen | tabel, pagina, privacytekst |
| G | Castknop in de app (Presentation API) | alleen Chrome op pc | als B | goed, tabblad blijft vrij | klein, maar vraagt F |
| H | Eigen Chromecast-ontvanger (Cast SDK) | Chrome op pc en Android, **niet iPhone** | onbekend, waarschijnlijk te zwaar | goed als het werkt | veel, plus registratie bij Google |
| I | Eén stream casten via YouTube | overal, ook iPhone met de YouTube-app | Full HD | heel goed | klein: link naar YouTube per tegel |
| J | Eigen tv-app (Tizen, webOS, Android TV) | per merk | goed | goed | veel, per merk een winkel en keuring |
| K | YouTube Multiview | — | — | — | kan niet: alleen voor bepaalde sport, niet voor eigen streams |

### Toelichting per route

- **A, B, C, D** werken vandaag zonder iets te bouwen. B is beperkt tot 720p
  voor het hele scherm (Google: tabblad casten haalt hooguit 720p, en alleen
  als de computer het aankan); bij vier tegels is dat ongeveer 360p per stream.
  Voor een overzicht met de stand genoeg, voor één stream groot niet.
- **E** is het makkelijkst voor de kijker (geen pc of telefoon nodig), maar nu
  onbeproefd en het inloggen is het struikelblok. Fire TV (Silk) zet een
  aangeklikte video vaak meteen schermvullend; dat breekt het raster als je
  een tegel aanklikt.
- **F** lost het inloggen op voor E, G en eventueel H. Het patroon is dat van
  YouTube en Netflix op de tv ("koppel met een code"):
  1. De tv opent een kort adres, bijvoorbeeld `…/tv`, en toont een code van
     zes tekens en een QR-code.
  2. Een ingelogd lid scant de QR of tikt de code in op de telefoon en drukt
     op Koppelen.
  3. De tv krijgt een eigen sleutel (cookie) die alleen de tv-pagina opent,
     niet de rest van de app. Eén keer koppelen; ontkoppelen kan op het
     profiel.
  4. De tv-pagina is altijd de TV-stand: het raster van vanavond, zonder
     datum kiezen, ververst vanzelf als er een stream bijkomt of live gaat,
     en zonder streams de volgende race met starttijd.
  5. Pijltjes verplaatsen het geluid naar een andere tegel; geen schermvullend
     van de browser nodig (veel tv-browsers doen dat vreemd), de pagina vult
     het venster zelf.

  Nodig: een tabel voor tv's en koppelcodes (migratie, niet lokaal te testen),
  een korte zin in de privacyverklaring (welke tv's een lid gekoppeld heeft en
  wanneer die laatst keek), en uitleg op `/hulp`. Omdat de tv aan een lid
  hangt, zien nog steeds alleen leden de streams; dat verruimt de belofte niet.
- **G.** Chrome kan met `PresentationRequest` een eigen adres naar een
  Chromecast sturen zonder geregistreerde app: Chrome opent het in een
  onzichtbaar tabblad en streamt dat. Dat tabblad is incognito, dus niet
  ingelogd; het werkt dus pas met de sleutel uit F. Beeld als B. Of Chrome dit
  in 2026 nog zo doet, staat alleen in oude bronnen: eerst een proefpagina.
- **H.** Afgewezen in de ronde van 2026-11-25 en dat blijft: registratie bij
  Google, geen iPhone als zender, een niet-ingelogde ontvanger (dus F nodig),
  en of een Chromecast vier YouTube-spelers tegelijk aankan is onbekend. Google
  maakt sinds 2024 geen Chromecast meer (opvolger: Google TV Streamer).
- **I** is het enige met Full HD op elke tv, maar dan één stream. Klein en
  los te bouwen: per tegel een link "YouTube", waarna de castknop van de YouTube-app
  het doet.
- **J en K** zijn niet zinvol voor een club.

## Voorstel

**Besluit (2026-11-26):** de eigenaar koos meteen voor F, zonder de proef van
stap 1. Gebouwd in de ronde "Gebouwd — TV koppelen met een code" in `PLAN.md`.

1. **Vanavond (2026-11-26, vier ladderraces vanaf 19:32), zonder bouwen.** Kijk
   via A of B, en doe één proef die de grootste onbekende beantwoordt: log op
   de tv-browser in (e-mail en wachtwoord) en open het streamcenter van
   vanavond. Spelen vier streams tegelijk, en hoe soepel?
2. **Speelt de tv-browser het af: F bouwen** (TV koppelen met code). Dat maakt
   de tv zelf de makkelijkste route, voor elk lid met een smart-tv of Fire
   TV-stick. Eerst het voorstel voor schermen en privacytekst.
3. **Speelt hij het niet af:** F niet bouwen; dan blijft het A, B, C, D, en
   eventueel I voor één stream groot.
4. **G** pas na F, en alleen als een proefpagina laat zien dat Chrome het nog
   ondersteunt.
5. **Niet:** H, J, K, en ook geen deelbare tv-link zonder koppeling (iedereen
   met de link ziet de streams met namen; dat verruimt de privacybelofte).

## Niet geverifieerd

Niets hiervan is op een echte tv, Chromecast of Fire TV geprobeerd. De
720p-grens van B komt uit de hulp van Google, het gedrag van
`PresentationRequest` uit bronnen van 2016–2017, en Silk op Fire TV uit
berichten van 2017–2018.

## Bronnen

- [Google: Cast-site of tabblad casten (720p)](https://support.google.com/chromecast/answer/3265953?hl=en)
- [Google: castprestaties kunnen beperkt zijn](https://support.google.com/chromecast/answer/3210065?hl=en)
- [Chromium: Presentation API 1-UA (onzichtbaar tabblad)](https://groups.google.com/a/chromium.org/g/blink-dev/c/HZ_ZHEE9oDo)
- [Chromium: offscreen tab gebruikt een eigen incognitoprofiel](https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/media/offscreen_tab.cc)
- [Chrome-voorbeeld: Presentation API met Cast](https://googlechrome.github.io/samples/presentation-api/cast.html)
- [Google: Web Receiver (eigen ontvanger)](https://developers.google.com/cast/docs/caf_receiver/)
- [LG: internetten op een webOS-tv](https://www.lg.com/lk/support/product-help/CT30012353-1437135223372)
- [YouTube-fout 153 en de referrer](https://til.simonwillison.net/youtube/fixing-153-embed)
- [Silk en Firefox op Fire TV](https://www.engadget.com/2017/12/20/amazon-s-fire-tv-devices-add-web-browsers-to-access-youtube/)
