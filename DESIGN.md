---
name: ZWB Cycling Platform
description: Het clubhuis van de ZWB Cycling Community, als PWA op de telefoon van het lid. Design "tegels".
colors:
  jersey-petrol: "oklch(0.34 0.071 209)"
  jersey-gold: "oklch(0.63 0.101 77)"
  cream: "oklch(0.965 0.011 103)"
  paper: "oklch(0.992 0.006 103)"
  ink: "oklch(0.22 0.034 215)"
  ink-muted: "oklch(0.43 0.036 205)"
  mist: "oklch(0.935 0.015 150)"
  danger: "oklch(0.577 0.245 27.325)"
  tile-vandaag: "#b8873d"
  tile-kalender: "#004653"
  tile-zwbeter: "#1f6068"
  tile-club: "#7f9590"
  tile-meer: "#0a2b34"
  tile-ink: "#0a2b34"
  tile-paper: "#fbfbf7"
  panel: "rgb(0 70 83 / 0.07)"
  band: "rgb(255 255 255 / 0.1)"
  night-background: "#061c22"
  night-card: "#0d2a32"
  night-muted: "#12343d"
  night-secondary: "#17404a"
  night-gold: "oklch(0.72 0.08 80)"
  night-ink: "oklch(0.97 0.005 80)"
  night-ink-muted: "oklch(0.7 0.015 220)"
  night-danger: "oklch(0.704 0.191 22.216)"
  night-tile-vandaag: "#c4923f"
  night-tile-kalender: "#00505f"
  night-tile-club: "#8ea39e"
  night-tile-meer: "#12343d"
  night-tile-ink: "#061c22"
  night-tile-paper: "#f5f6f0"
  night-panel: "rgb(255 255 255 / 0.055)"
  weekoverzicht-paper: "oklch(0.945 0.016 95)"
  weekoverzicht-ink: "oklch(0.27 0.025 215)"
  weekoverzicht-soft: "oklch(0.47 0.022 210)"
  weekoverzicht-cyan: "oklch(0.47 0.085 210)"
  weekoverzicht-gold: "oklch(0.76 0.135 75)"
  weekoverzicht-sage: "oklch(0.7 0.04 165)"
  weekoverzicht-night-paper: "oklch(0.24 0.03 215)"
  weekoverzicht-night-ink: "oklch(0.94 0.014 90)"
  weekoverzicht-night-soft: "oklch(0.77 0.018 190)"
  weekoverzicht-night-cyan: "oklch(0.6 0.085 205)"
  weekoverzicht-night-gold: "oklch(0.72 0.13 72)"
  weekoverzicht-night-sage: "oklch(0.6 0.045 165)"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 13vw, 3.875rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.025em"
  section:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  tile-title:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.012em"
  tile-number:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "3.375rem"
    fontWeight: 300
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  small:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
  control:
    fontFamily: "Barlow Semi Condensed, Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  weekoverzicht-display:
    fontFamily: "Big Shoulders Stencil, Arial Narrow, sans-serif"
    fontSize: "clamp(84px, 28vw, 116px)"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "0.005em"
    fontVariation: "\"opsz\" 72"
    fontFeature: "\"tnum\""
  weekoverzicht-display-m:
    fontFamily: "Big Shoulders Stencil, Arial Narrow, sans-serif"
    fontSize: "clamp(70px, 23vw, 94px)"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "0.005em"
    fontVariation: "\"opsz\" 72"
  weekoverzicht-lead:
    fontFamily: "Karla, ui-sans-serif, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "normal"
  weekoverzicht-body:
    fontFamily: "Karla, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  weekoverzicht-label:
    fontFamily: "Karla, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  none: "0"
  sm: "0.075rem"
  md: "0.1rem"
  lg: "0.125rem"
  xl: "0.175rem"
  full: "9999px"
  logo-plate: "0.8rem"
  weekoverzicht-print: "2px"
spacing:
  xs: "4px"
  list-gap: "6px"
  sm: "8px"
  md: "12px"
  tile-x: "14px"
  lg: "16px"
  xl: "20px"
  section: "28px"
components:
  tile:
    backgroundColor: "{colors.tile-kalender}"
    textColor: "{colors.tile-paper}"
    typography: "{typography.tile-title}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
    height: "164px"
  tile-light-tone:
    backgroundColor: "{colors.tile-vandaag}"
    textColor: "{colors.tile-ink}"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  agenda-row:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "62px"
  tab:
    backgroundColor: "{colors.tile-kalender}"
    textColor: "{colors.tile-paper}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    height: "56px"
  tab-active:
    height: "72px"
  button-primary:
    backgroundColor: "{colors.jersey-petrol}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  segment:
    backgroundColor: "{colors.tile-zwbeter}"
    textColor: "{colors.tile-paper}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 14px"
  segment-active:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
  menu-item:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 16px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px 20px 20px"
  weekoverzicht-button:
    backgroundColor: "{colors.weekoverzicht-ink}"
    textColor: "{colors.weekoverzicht-paper}"
    rounded: "{rounded.weekoverzicht-print}"
    height: "52px"
  weekoverzicht-chip:
    textColor: "{colors.weekoverzicht-ink}"
    padding: "2px 7px"
---

# Design System: ZWB Cycling Platform

Dit beschrijft het design "tegels", sinds 2026-10-19 de standaard voor alle
leden. Het oude design ("klassiek") bestaat nog als vangnet achter een cookie
voor bestuursleden (`src/lib/design.ts`) en staat hier niet meer in; zijn
beschrijving staat in de git-geschiedenis van dit bestand (vóór 2026-10-19).

De bron is de code. Alles hieronder geldt binnen `[data-design="tegels"]`,
dat de app-schil zet (`src/app/(app)/_components/tegels-shell.tsx`), en voor
dialogen en menu's via `:root:has([data-design="tegels"])`. De regels staan in
`src/app/globals.css` vanaf het blok "Design tegels"; de tegelonderdelen in
`src/components/tegels/`, de plekken in `src/lib/design-places.ts`.

## Overview

**Creative North Star: "Tenuetegels"**

Het tenue is geen aankleding meer maar de bediening. Elke plek in de app heeft
een tenuekleur, en alles wat je kunt aantikken is een vlak in de kleur van wat
erachter ligt. Een lid leest het scherm aan kleur en formaat: goud is van jou en
nu, petrol is koers, teal is training, salie is de club. Wat geen kleur heeft, is
inhoud om te lezen.

Het systeem is plat en recht. Gekleurde tegels zonder rand of afronding, grote
lichte cijfers en koppen in een smalle letter, en daaronder doorzichtige
panelen waar de schuine tenuebanen doorheen schijnen. De richting is door de
eigenaar gekozen uit een reeks schetsen (bestuursvoorstel van 2026-10-12) en
daarna in rondes per scherm uitgewerkt; zie de rondes "Design tegels" in
`PLAN.md`.

Bevestigd wat het niet is: geen Strava- of Zwift-kloon (geen oranje, neon of
game-glans), geen generiek SaaS-dashboard (geen paarse gradiënten, glas of
rijen identieke statistiekkaarten) en geen drukke sportsite (geen schreeuwende
koppen, schuine sporttypografie of foto's achter alles).

**Key Characteristics:**
- Kleur zegt wat voor soort ding het is, formaat zegt hoe belangrijk het is.
- Kleur is klikbaar; een vlak zonder kleur is inhoud.
- Recht: geen afronding op tegels, panelen, velden, dialogen en labels.
- Groot is licht: koppen en cijfers in gewicht 200 tot 300, nooit vet.
- Plat: geen schaduw in rust, alleen zwevende lagen hebben er een.
- Licht en donker zijn twee volwaardige thema's met eigen tegeltinten.

## Colors

Vijf tenuekleuren voor de tegels, op de rustige ondergronden van het
basisthema: crème bij licht, nachtpetrol (`#061c22`) bij donker. De tokens
`--tg-*` staan op de schil; `--background`, `--foreground`, `--primary`,
`--muted`, `--ring` en de andere semantische tokens komen uit `:root` en
`.dark`, en het design overschrijft in donker alleen de ondergrond, kaart,
popover, muted en secondary.

### Tegelkleuren
Per kleur een soort, met de tekstkleur die erbij hoort.

| Token | Licht | Donker | Tekst | Soort |
|---|---|---|---|---|
| `--tg-vandaag` | `#b8873d` | `#c4923f` | inkt | jij, nu |
| `--tg-kalender` | `#004653` | `#00505f` | papier | wedstrijden, events, teams en uitslagen |
| `--tg-zwbeter` | `#1f6068` | `#1f6068` | papier | training en je eigen cijfers |
| `--tg-club` | `#7f9590` | `#8ea39e` | inkt | de club en de mensen |
| `--tg-meer` | `#0a2b34` | `#12343d` | papier | spel en ontdekken; plekloze schermen |

Inkt is `--tg-ink` (`#0a2b34`, in donker `#061c22`), papier is `--tg-paper`
(`#fbfbf7`, in donker `#f5f6f0`). Een tegel krijgt zijn kleur met de klasse
`tg-vandaag`, `tg-kalender`, `tg-zwbeter`, `tg-club` of `tg-meer`; die zet
`--tg-bg` en `--tg-fg`. Contrast van de tekst op de tegel: licht 4,7 (goud, salie)
tot 14,4 (donker petrol), donker 6,3 tot 12,2.

### Panelen en banen
- **Paneel** (`--tg-panel`): petrol op 7% bij licht, wit op 5,5% bij donker.
  Elk `bg-card`, elke rij van een `divide-y`-lijst, elk omkaderd vlak en elk
  veld wordt dit paneel. Het is doorzichtig, zodat de tenuebanen erdoorheen
  schijnen. Zwevende lagen (`absolute` of `fixed` met `bg-card`) blijven
  dekkend.
- **Baan** (`--tg-band`): wit op 10%, een schuine strook (118°, van 64 tot 81%)
  over elke gekleurde tegel.

### Basis
- **Ondergrond:** crème (`cream`) / `#061c22`.
- **Kaart en popover:** papier (`paper`) / `#0d2a32`; in de pagina zelf vervangen
  door het paneel, in menu's en dialogen dekkend.
- **Muted:** mist (`mist`) / `#12343d`; hover in menu's, omlijnde knoppen.
- **Tekst:** inkt (`ink`) / `night-ink`; gedempt `ink-muted` / `night-ink-muted`.
- **Primary:** jersey petrol bij licht, nachtgoud bij donker. Paginatitels bij
  licht en de hoofdknop.
- **Ring:** jersey goud bij licht, nachtgoud bij donker.
- **Danger:** `danger` / `night-danger`, als tint met gekleurde tekst.
- **Selectie:** tekst selecteren kleurt goud met inkt.

### Kalender
De kalender houdt in het dagvak zijn eigen kleur per eventsoort
(`src/lib/event-types.ts`, met `eventTypeInk()` voor de tekst erop), niet de
plekkleuren. Een eigen training is teal, een verjaardag goud of de profielfoto
onder een donkere waas.

### Named Rules
**De Kleurregel.** Kleur zegt wat voor soort ding het is, formaat zegt hoe
belangrijk het is (eigenaar, 2026-10-12). Kies de tegelkleur naar de soort van
wat erachter ligt, niet naar de plek waar de tegel staat.

**De Klikregel.** Kleur betekent: hier kun je op tikken. Een gekleurd vlak dat
nergens heen leidt hoort er niet te zijn; een paneel zonder kleur is inhoud.
Een lijstlink die naar een plek leidt is daarom een gekleurd vlak (`tg-link`).

**De Schaarsteregel.** Goud (`tg-vandaag`) is jij, nu: iets wat vandaag jouw
aandacht vraagt. Hooguit een of twee gouden vlakken per scherm.

**De Hierregel.** Waar je bent of wat gekozen is, is geen gekleurd vlak meer
maar het paneel met een gouden lijn onderaan (3 tot 4px, `inset` schaduw): de
actieve ZWBeter-pijler, de huidige `tg-link`, de gekozen segmentknop, een
bevestiging (`tg-note`). De lijn haalt op crème 2,9:1 en is nooit het enige
signaal: het vlak verliest er ook zijn kleur bij.

**De Wisselregel.** Licht en donker ruilen de actiekleur: petrol bij licht,
goud bij donker. Gebruik voor knoppen en titels de semantische token
(`primary`, `foreground`), niet een vaste tenuekleur.

**De Goudregel.** Het tenuegoud haalt als kleine tekst op licht maar 3,1:1.
Goud is op licht voor vlakken, balken en lijnen; voor cijfers en labels bestaat
de diepere tint `--zwblok-own-text` (4,9:1). Tekst óp een gouden tegel is inkt.

## Typography

**Font:** Barlow Semi Condensed (300, 400, 500, 600), via `next/font` zonder
preload (`src/components/tegels/font.ts`), met Geist en system-ui als terugval.
Door de eigenaar gekozen uit een proef van vijf. Eén letter voor alles; in
menu's en dialogen staat hij bij naam, omdat `--font-tegels` alleen op de
schil bestaat.
**Mono:** Geist Mono voor code en ID's.

**Character:** Smal, licht en groot waar het telt. Hiërarchie komt uit maat en
kleur; gewicht gaat juist omlaag naarmate iets groter wordt.

### Hierarchy
- **Display** (300, `clamp(2.75rem, 13vw, 3.875rem)`, regelhoogte 1, -0.025em):
  de paginatitel (`PageHeader`, of een eigen `h1` met `text-2xl`/`text-3xl`), in
  primary bij licht en in de tekstkleur bij donker. Met knoppen ernaast
  `clamp(2.5rem, 10vw, 3.25rem)`.
- **Tile number** (300, 3.375rem, tabelcijfers): het cijfer onderaan een tegel.
  Cijferkaarten en metrics 2.5rem, losse statistieken 1.75rem, alle in 300.
- **Section** (300, 1.625rem): sectiekoppen, zonder pictogram en zonder lijn.
  Kleine koppen in hoofdletters worden gewone koppen van 1.375rem in 500.
- **Tile title** (500, 1.5rem): de naam op een tegel.
- **Body** (400, 1.0625rem): de basismaat van de schil.
- **Small** (1rem) en **Caption** (0.875rem): `text-sm` en `text-xs` staan een
  stap groter dan in Tailwind, omdat de smalle letter op dezelfde maat kleiner
  oogt.
- **Control** (500, 1rem): knoppen, tabs, segmentknoppen, filterchips,
  tabelkoppen (0.875rem).

### Named Rules
**De Lichte-cijferregel.** Groot is licht: koppen en cijfers in 200 tot 300,
titels op tegels en knoppen in 500. Binnen het design wordt `font-bold` en
zwaarder 600, `font-semibold` 500; zwaarder dan 600 bestaat niet.

**De Kolomregel.** Elk getal dat vergeleken wordt (tijden, watt, W/kg,
standen, afstanden) staat in tabelcijfers. Tabellen doen dat standaard.

**De Kastregel.** Tekst staat zoals hij getypt is: `uppercase` doet binnen het
design niets, ook niet in menu's en dialogen. Geen letterspatiëring op labels.

## Layout

Eén gecentreerde kolom van maximaal 64rem (`max-w-5xl`), 16px opzij, 20px
boven en 40px onder. Bovenin staan het logo, de terugknop en rechts de acties
(berichten, het vraagteken naar `/hulp`, het persoonlijke menu met de
profielfoto); alle drie 44 bij 44px.

**Vier plekken:** Vandaag (`/dashboard`), Kalender, ZWBeter en Club, elk een
tab in zijn tenuekleur (`src/lib/design-places.ts` zegt welke routes erbij
horen; de langste passende prefix wint). Op de telefoon een balk van vier
gelijke tabs onderaan, `sticky` en niet `fixed` (op de iPhone bleef een vaste
balk hangen), 56px hoog plus de veilige rand; de actieve tab steekt uit tot
72px en staat in 600. Vanaf 768px hangen de tabs bovenin onder de balk: 40px,
actief 52px. Profiel, garage, beheer en hulp horen bij geen plek; daar is geen
tab actief en is de plekkleur donker petrol.

**Tegelvelden:** twee kolommen, vier vanaf 768px, 8px tussenruimte. Een tegel
is minstens 164px hoog met 12 bij 14px binnenruimte; tekst bovenin, het cijfer
onderin. Op Club (`TegelsLinkGrid`) zijn de rijen 104px en kan een
tegel breed (twee kolommen) of groot (twee bij twee) zijn, zodat het veld geen
egaal rooster is. Op het dashboard staan de tegelrijen dicht op elkaar en
krijgt elke sectie 28px lucht erboven.

**Lijsten:** een `divide-y`-lijst wordt een kolom losse paneelrijen met 6px
ertussen, die niet breder groeit dan zijn kaart (`minmax(0, 1fr)`), zodat
`truncate` werkt. Een agendarij is een raster van dagvak (56px), tekst en
tijd, minstens 62px hoog.

**Tabellen:** 16px, `nowrap`, en een vaste minimumbreedte wordt
`max(100%, 56rem)`: de tabel vult de ruimte en scrolt pas zijwaarts onder
56rem, binnen zijn eigen vlak.

**De Navigatieregel.** Een paginatitel die herhaalt wat de navigatie al laat
zien (de actieve plek, een ZWBeter-pijler, de tab eronder) staat alleen voor
schermlezers (`tg-repeats-nav`). Een titel die iets zegt wat nergens anders
staat (Teams, een eventnaam, een lid) blijft staan.

**De Duimregel.** Alles waar je op de telefoon op tikt is minstens 44px hoog:
tabs, segmentknoppen, filterchips, menu-items, dialoogknoppen, de sluitknop.
De standaardknop van 32px is voor dichte rijen met genoeg ruimte eromheen.

## Elevation & Depth

Plat. Diepte komt uit kleur tegen paneel en uit de doorzichtigheid van het
paneel, niet uit schaduw of rand.

### Shadow Vocabulary
- **Zweeflaag:** uitklapmenu's, `0 1.25rem 2.5rem -0.75rem` in nachtpetrol op
  45%, zonder ring. Dialogen zijn dekkend papier zonder rand.
- **Tegelrand bij donker:** een binnenrand van 1px wit op 7% om tegels, zodat
  een donkere tegel niet in de ondergrond wegvalt.
- **Gouden lijn:** een `inset` schaduw onderaan; zie de Hierregel.

### Named Rules
**De Platte-vloerregel.** Een tegel, paneel of knop in rust heeft geen
schaduw en geen rand. Wie diepte wil, gebruikt kleur of het paneel.

## Shapes

Recht. `--radius` is binnen het design 2px, dus knoppen en wat `rounded-lg`
heeft zijn nauwelijks afgerond; tegels, panelen, velden, menu's, dialogen,
tabs en segmentknoppen hebben geen afronding. Ronde pillen
(`rounded-full` op tekst, links en knoppen) worden recht. Volledig rond
blijven alleen avatars en bolletjes met een vaste maat (`size-*`).

Het eigen vormmotief is het tenue, in twee lagen:
- **De banen achter de schil:** vier schuine banen in petrol, teal, salie en
  goud (132°, 149°, 28°, 156°), 30rem hoog achter de bovenkant van de app.
  Sterker dan in het oude design: bij licht 10, 12, 16 en 26% dekking, bij
  donker teal 30%, salie 13%, wit 5% en goud 34%.
- **De baan op een tegel:** de witte strook van `--tg-band` over elke
  gekleurde tegel en klikbare metric.

**De Motiefregel.** De banen horen bij de schil en bij de tegels. Ze schijnen
door de panelen heen, maar komen niet op een paneel, veld of tabel zelf, en
nergens op hogere dekking.

**De Rechtregel.** Een nieuw onderdeel is recht. Afronding is voor avatars en
het logoplaatje bij donker.

## Components

### Tegel (`tg-tile`)
Een link in de kleur van de soort, met de baan erover. Klein bovenkopje
(caption, 90% dekking), titel (tile title, hooguit twee of drie regels) en
onderaan een groot licht cijfer. Hover maakt hem 10% lichter (0.2s,
exponentieel uit); focus is een rand van 2px in de ringkleur op 2px afstand.
Varianten op Vandaag: de trainingstegel over twee kolommen met een papieren
startknop van 44px, live-tegels met "live" achter het cijfer, en de
uitslagtegel.

### Agendarij (`tg-row`)
Een paneel met vooraan het dagvak in de eventkleur (weekdag klein, dag als
cijfer van 1.5rem in 300), de titel in 500 met een bijregel, de avatars van wie
meedoet (24px, overlappend, met een teller) en rechts de tijd (1.625rem, 300).
Voorbij: gedempte tekst en een dagvak op 45%. De kop van een eventpagina
(`tg-event-head`) is dezelfde opbouw, groter: dagvak van 84px met een cijfer
van 2.75rem.

### Paginakop
Geen kaart en geen tenuebalk: alleen de grote lichte titel (Display), met
hooguit een regel eronder en knoppen rechts op één lijn.

### Sectiekop
Section-typografie, zonder pictogram en zonder lijn eronder, 10px boven de
inhoud.

### Pijlers en categorieën (`tg-pillar`)
De vier ZWBeter-pijlers zijn teal vlakken van minstens 76px hoog met de naam
onderin; de actieve volgt de Hierregel. Op `/beheer` zijn de categorieën
pijlers in de kleur van hun soort (`tg-pillar-tone`).

### Lijstlinks en tweede menurij (`tg-link`, `tg-subnav`)
Een link in een lijst (races, opgeslagen plannen) of een tab onder de pijlers
is een gevuld vlak in de kleur van de soort; met `tg-here` in de kleur van de
plek waar je bent. Gedempte tekst en iconen erop nemen de tekstkleur over op
80%. De huidige volgt de Hierregel.

### Segmentknoppen
Watt/W/kg, Lijst/Maand, Week/Maand/Jaar, Mikpunt/Periode en de
grafiekschakelaars: losse vlakken van 44px in de kleur van de plek
(`--tg-here`), 4px uit elkaar; de gekozen volgt de Hierregel. Ze worden
herkend aan hun opbouw (een omlijnde houder met `p-0.5` en een `bg-primary`
erin), niet aan een eigen klasse.

### Filterchips (`tg-chip`)
Alles, Voor mij en de labels op de kalender: petrol vlakken (`tg-link
tg-kalender`) van 44px hoog in control-typografie; de gekozen volgt de
Hierregel.

### Buttons
- **Primary:** de actiekleur (petrol bij licht, goud bij donker), 2px hoek,
  control-typografie.
- **Outline:** geen rand, een muted vlak; hover mengt 9% tekstkleur erbij. Een
  knop is een actie en geen plek, dus nooit een plekkleur.
- **Destructive:** rode tekst op een rode tint, geen vol rood vlak.
- **Focus:** rand van 2px in de ringkleur.

### Cijfers
Een rij gelijke cijferkaarten (`tg-metric-row`) is één paneel met drie
kolommen, cijfer boven label, zonder pictogram. Een klikbare metric
(`tg-metric`) is een teal tegel met de baan; een losse statistiek (`tg-stat`)
een paneel.

### Inputs / Fields
Een paneel zonder rand, schaduw of afronding. Focus: een rand van 2px in de
ringkleur op 1px afstand. Label boven het veld, geen uitlegtekst eronder;
toelichting staat op `/hulp`.

### Menu's en dialogen
Ze renderen in een portal buiten de schil en krijgen hun stijl via
`:root:has([data-design="tegels"])`. Menu: recht, minstens 208px breed, items
van 44px in 17px en 500 met 16px opzij, hover en focus in muted, geen ring. Een
knop in het menu (Uit) staat als gewone rij. Dialoog: dekkend papier, recht,
titel in 1.875rem en 300 (primary bij licht), sluitknop van 44px rechtsboven,
knoppen van 44px.

### Logo
Het originele ZWB-logo (`public/zwb-logo.png`) linksboven, 34px hoog. Bij
donker staat het op een plaatje van tegelpapier met 0.8rem afronding en een
gouden rand (2px ondergrond, dan 1.5px goud), omdat de zwarte B anders wegvalt.
Op de inlogschermen (`src/components/tegels/auth-frame.tsx`) staat het groter
(56px, bij donker 46px).

**De Origineelregel.** Het logo wordt niet nagetekend, bijgekleurd of
vereenvoudigd. Past het ergens niet, dan verandert de omgeving, niet het logo.
`ZwbLogo`/`ZwbMark` (de drie schuine vlakken) hoort bij het oude design.

### Weergaveknop (profiel)
Een rail met drie standen onder de profielkop: bewerken, wat leden zien en het
deelbare profiel (`.view-slider`, `profile-view-toggle.tsx`). Mist met een
haarlijn en volledig rond; een effen gouden knop schuift naar de gekozen stand.
Iconen met de naam als tooltip en label voor schermlezers; elke stand 48 bij
38px in een rail van 44px; de knop schuift in 0.28s, niet bij
`prefers-reduced-motion`. Gebouwd vóór "tegels" en daar niet aan aangepast:
het is de enige ronde rail in de app.

### Beweging
Eén curve: exponentieel uit (`cubic-bezier(0.16, 1, 0.3, 1)`). Hover 0.2s
helderder, tabs groeien in 0.25s. Bij `prefers-reduced-motion` geen
overgangen.

## Do's and Don'ts

### Do:
- **Do** kies de kleur van een tegel naar de soort van wat erachter ligt.
- **Do** maak alles wat klikbaar is gekleurd, en alles wat gekleurd is
  klikbaar.
- **Do** markeer waar je bent of wat gekozen is met het paneel en de gouden
  lijn.
- **Do** gebruik de bestaande klassen (`tg-tile`, `tg-row`, `tg-link`,
  `tg-pillar`, `tg-chip`, `tg-here`) en de semantische tokens, zodat licht en
  donker beide kloppen.
- **Do** controleer elk nieuw scherm in beide thema's en op een staande
  telefoon van 375px.
- **Do** geef tikdoelen op de telefoon minstens 44px hoogte.
- **Do** zet getallen in tabelcijfers.
- **Do** respecteer `prefers-reduced-motion`.

### Don't:
- **Don't** zet een gekleurd vlak neer dat nergens heen leidt.
- **Don't** gebruik meer dan een of twee gouden vlakken per scherm.
- **Don't** geef een knop een plekkleur; een knop is een actie.
- **Don't** rond tegels, panelen, velden of labels af.
- **Don't** zet grote koppen of cijfers vet.
- **Don't** herhaal in een paginatitel wat de navigatie al laat zien.
- **Don't** geef een tegel of paneel in rust een schaduw of rand.
- **Don't** gebruik goud als kleine tekst op een lichte ondergrond.
- **Don't** maak er een Strava- of Zwift-kloon, een SaaS-dashboard of een
  drukke sportsite van.
- **Don't** zet uitlegtekst in schermen of formulieren; die hoort op `/hulp`.

## Eigen register: Weekoverzicht

Eén eigen register binnen het merk, gekozen door de eigenaar op 2026-10-18:
de week als zeefdrukreeks. Tenue-inkten op vezelig papier, volle schermen die
pas voor pas worden gedrukt. De bron is `src/components/weekoverzicht/`
(`week-review.module.css` voor alle tokens, `fonts.ts`, `prints.tsx`,
`week-review.tsx`, `week-ahead.tsx`). De tokens staan in de frontmatter onder
het voorvoegsel `weekoverzicht-`.

### Scope

Alleen de weekoverzicht-pop-up (zondagavond, via `launcher.tsx`) en de pagina
`/weekoverzicht`, die hetzelfde overzicht toont. De voorbeeldpagina
`/ontwerp-voorbeeld` laat het register zien, verder nergens.

**De Grensregel.** Binnen het register gelden de Platte-vloerregel, de
Lichte-cijferregel, de Rechtregel, de Motiefregel, de Kleurregel, de Klikregel
en de Wisselregel van het hoofdsysteem niet (de knop is hier inkt in beide
thema's). Omgekeerd lekt er niets uit dit register naar de gewone schermen:
geen stencilletter, geen Karla, geen overdruk, geen papierkorrel, geen
paskruisjes, geen `weekoverzicht-`-token. Een scherm buiten het overzicht dat
er zo uitziet, is fout. De Kolomregel, de Duimregel en de Goudregel blijven ook
hier gelden.

### Colors

Eigen papier, eigen inkt en drie doorschijnende tenue-inkten, per thema
apart afgesteld. Ze staan als lokale variabelen op de pop-up (`--paper`,
`--ink`, `--soft`, `--c`, `--g`, `--s`) en worden alleen daar gebruikt.

- **Vezelpapier** (`weekoverzicht-paper`) / **Petrolpapier**
  (`weekoverzicht-night-paper`): de ondergrond van elk vel.
- **Drukinkt** (`weekoverzicht-ink`) / **Nachtinkt**
  (`weekoverzicht-night-ink`): tekst, assen, de knop, de voortgang.
- **Zachte inkt** (`weekoverzicht-soft`) / (`weekoverzicht-night-soft`):
  bijzinnen, metadata, zachte grafieklabels.
- **Petrol-cyaan** (`weekoverzicht-cyan` / `weekoverzicht-night-cyan`),
  **Goud** (`weekoverzicht-gold` / `weekoverzicht-night-gold`) en **Salie**
  (`weekoverzicht-sage` / `weekoverzicht-night-sage`): de drie drukinkten.
- **Lijn**: drukinkt op 18% (`color-mix(in oklab, inkt 18%, transparent)`),
  voor de rijlijnen en de lege voortgangsstroken.
- **Achtergrond achter het vel**: Night Petrol op 72% bij licht, zwart op 70%
  bij donker.

Per afbeelding draagt elke dataserie één inkt, met een vierkantje van 12px
als legenda. In de bouw is dat per scherm gekozen (km petrol en tijd goud,
gepland salie en gedaan petrol, fitness petrol en vermoeidheid goud, eigen
team goud en de rest salie) en niet strikt één inkt per ZWBeter-onderdeel,
zoals de richting eerst voorstelde.

**De Overdrukregel.** Inkten zijn effen, doorschijnende vlakken met
`mix-blend-mode: multiply` op licht papier en `screen` op donker papier. Waar
twee passen elkaar raken ontstaat de mengkleur; die wordt nooit als eigen
kleur ingetekend. Geen verlopen, geen dekkende lagen over elkaar.

### Typography

**Display Font:** Big Shoulders Stencil (met Arial Narrow), variabel met de
`opsz`-as, gewicht 900, alleen in hoofdletters.
**Body Font:** Karla (met ui-sans-serif, system-ui).

Beide letters laden zonder preload, pas als het overzicht opent.

- **Display** (`weekoverzicht-display`, `opsz` 72): het grote cijfer of
  "WEEK 42" van elk scherm. Een kleinere maat (`weekoverzicht-display-m`,
  70 tot 94px) voor de kop van de laatste pagina; op schermen lager dan
  700px 76 en 64px. Eenheden (km, w) in het cijfer op 0.42em.
- **Stencil klein** (`opsz` 40): daglabels (24px), waarden in de weekrij
  (21px), getallen in grafieken (22px, `opsz` 72) en knoppen (20px,
  spatiëring 0.06em).
- **Lead** (`weekoverzicht-lead`, Karla 800, 21px, maximaal 20 tekens breed):
  de ene zin onder het cijfer.
- **Body** (`weekoverzicht-body`, Karla, 15.5px, maximaal 34 tekens breed, in
  zachte inkt met vette woorden in drukinkt): de toelichting.
- **Coach** (Karla 600, 20px, regelhoogte 1.42, maximaal 30 tekens breed): de
  tekst van de coach; nadruk als een gouden markeerstreep van 0.42em onder de
  woorden, niet als vet.
- **Label** (`weekoverzicht-label`, Karla 800, 11px, spatiëring 0.08em,
  hoofdletters): labels in grafieken, met een rand van 3px in papierkleur
  zodat ze over inkt leesbaar blijven.

**De Stencilregel.** Stencil is voor cijfers, daglabels, koppen en knoppen;
elke zin staat in Karla. Een scherm drukt pas als de stencilletter geladen is
(hooguit 2,5 seconde wachten), zodat er nooit een kop in de terugvalletter
verschijnt.

### Layout

Eén vel van maximaal 440px breed en de volle schermhoogte (hooguit 940px),
gecentreerd boven een gedimde achtergrond. Vanaf 640px wordt het een los vel
(hoogte tot 900px, 48px lucht). Binnen het vel 64px boven (plus de veilige
rand), 22px opzij en 20px onder. Het beeld van elk scherm loopt over de volle
breedte van het vel en vult de ruimte tussen tekst en onderkant. Elk scherm
heeft één groot cijfer, één beeld en hooguit twee zinnen; de coach en de week
erna wijken daarvan af.

### Elevation & Depth

Diepte komt uit inkt over inkt en uit het papier, niet uit schaduw. Alleen het
losse vel vanaf 640px zweeft, met één brede schaduw
(`0 30px 80px -30px rgb(0 0 0 / 0.6)`).

**De Korrelregel.** De papiervezel (`feTurbulence`, fractal noise,
basisfrequentie 0.62, drie octaven, warm bruin op 42%) ligt bóven de schermen
en onder de bediening: de inkt neemt de korrel van het papier aan. Volle
dekking en multiply bij licht, halve dekking en screen bij donker.

**De Registerregel.** In een afbeelding met renners ligt de eerste pas in
register, in salie of goud; de tweede pas, met dezelfde vormen in petrol,
rust 3px rechts en 2px omhoog daarnaast, zodat aan elke rand een reepje van
de onderlaag blijft staan. Dat is de enige pas die uit register staat, ook
stilstaand en bij verminderde beweging. Alle andere passen staan in register.
Twee paskruisjes van 16px op halve dekking staan halverwege in de linker- en
rechtermarge.

### Shapes

Hoekig, zoals gesneden sjablonen. Inktvlakken, sporen en chips hebben geen
afronding; de knop 2px, het losse vel 6px. Lijnen zijn 1 tot 1,5px in
drukinkt. Leeg of niet gedaan is een gestippelde salielijn (3 op 3).

De renner is één vaste tekening (`Rider` in `prints.tsx`): een wegrenner op
een racefiets met dunne velgen, beugelstuur, platte rug en helm, opgebouwd uit
lijnen in één inkt. Een rit is een renner; een clubrit is een stoet.

### Motion

Eén curve voor alles: exponentieel uit (`cubic-bezier(0.16, 1, 0.3, 1)`).

- **Rakel:** elke pas wordt van links naar rechts ingedrukt (een uitsnede die
  in 0.75s openschuift) en schuift tegelijk vanaf 6px rechts en 5px omhoog in
  register (0.9s). De tweede en derde pas volgen na 0.18s en 0.36s.
- **Uit register:** de verschoven pas ademt na 1,2 seconde langzaam tussen
  3px/-2px en 6px/-4px (3,4s heen en terug).
- **Tekst:** komt 8px omhoog en vervaagt in (0.5 en 0.7s, na 0.1s).
- **Voortgang:** de strook van het huidige scherm vult lineair over de
  schermtijd (5s opening, 6s per onderdeel, 9s coach; de laatste pagina loopt
  niet vanzelf). Vasthouden pauzeert strook en klok.
- **Weekrij:** vulling en schuif volgen de vinger in 0.25s.
- **Verminderde beweging:** geen overgangen, geen ademende pas (die blijft op
  3px/-2px staan), stroken staan vol, en het overzicht gaat niet vanzelf
  verder; tikken en pijltjestoetsen blijven werken.

### Components

**Voortgangsstroken.** Bovenaan, 14px van de randen, één strook van 4px hoog
per scherm met 4px ertussen. Leeg in lijnkleur, gevuld in drukinkt, zonder
afronding: gedrukte inktstroken, geen pillen.

**Tikzones en sluiten.** Links 30% van het vel is terug, rechts 70% verder,
vanaf 60px onder de bovenkant. Langer dan 350ms vasthouden is pauzeren, geen
tik. Pijltjes links/rechts bladeren, Escape sluit. De sluitknop is 44 bij
44px rechtsboven, een kruis in drukinkt zonder vlak.

**Knop.** Drukinkt met papierkleurige tekst, 52px hoog, 2px afronding,
stencil 20px in hoofdletters. De terugknop ernaast is 64px breed, zonder vlak,
met een rand van 1,5px in drukinkt en een pijl. Indrukken schuift 1px omlaag;
bezig is 60% dekking.

**Focus.** Een rand van 2px in drukinkt, 2px van het element (de dagbalk
4px). Niet in goud: tenuegoud haalt op het lichte papier maar 1,8:1, en een
focusrand moet minstens 3:1 halen.

**Inktgrafieken.** Een `viewBox` van 390 breed, staven van 34 tot 38px op
50px afstand, de tweede pas 5 tot 8px verschoven als eigen staaf erover. Eén
as van 1,4px in drukinkt, daglabels eronder. Getallen in stencil boven de
staaf. Een dag zonder waarde is een gestippeld streepje, geen lege ruimte.
Het beste van het jaar is de enige echte lijn (1,6px, streepjes 5 op 4);
verder zijn grafieken vlakken, geen lijntjes.

**Bewerkbare weekrij.** De laatste pagina toont de week erna als zeven
rijen: daglabel (40px), spoor, waarde (48px), met een lijn erboven en minstens
62px hoog (54px op lage schermen). Het spoor is 22px hoog met een rand van
1,2px in drukinkt; de vulling in petrol loopt tot vier uur, events liggen er
als smallere balken in hun statusinkt overheen, en een schuif van 4 bij 34px
in drukinkt toont de waarde. Een onzichtbaar schuifveld van 46px hoog ligt
erover, zodat de duim het haalt. Onder de rij in 13px zachte inkt de training
van het schema en de eventchips. Eén knop slaat de hele week op.

**Statuschips.** Hoekig, 2px bij 7px, Karla 700 op 12.5px in drukinkt op een
tint van 50% van de statusinkt: opgesteld goud, aangemeld en misschien salie,
beschikbaar petrol. Past het event niet in de beschikbare tijd, dan zakt de
tint naar 15% met een gestippelde rand van 1,5px in drukinkt en staat er
"meer tijd nodig".

### Do's and Don'ts

#### Do:
- **Do** gebruik in het weekoverzicht alleen de eigen tokens (`--paper`,
  `--ink`, `--soft`, `--rule`, `--c`, `--g`, `--s`) en stel ze voor licht en
  donker allebei af.
- **Do** druk elke afbeelding als losse passen van effen inkt die met
  multiply of screen over elkaar vallen.
- **Do** houd in een afbeelding met renners precies één pas op 3px/-2px uit
  register, boven een onderlaag in register.
- **Do** leg de papiervezel boven de afbeeldingen.
- **Do** geef elk terugblikscherm één groot stencilcijfer, één beeld en hooguit
  twee zinnen in Karla.
- **Do** laat het overzicht bij verminderde beweging stilstaan tot het lid
  tikt.

#### Don't:
- **Don't** neem stencil, Karla, overdruk, korrel of paskruisjes mee naar
  gewone schermen.
- **Don't** teken een mengkleur als eigen kleur in, en gebruik geen verlopen
  of dekkende lagen.
- **Don't** maak grafieken van dunne lijntjes of losse cijferkaartjes.
- **Don't** rond inktvlakken, stroken of chips af.
- **Don't** zet meer dan één pas uit register.
- **Don't** laat een scherm drukken voordat de stencilletter er is.
