---
name: ZWB Cycling Platform
description: Het clubhuis van de ZWB Cycling Community, als PWA op de telefoon van het lid.
colors:
  jersey-petrol: "oklch(0.34 0.071 209)"
  jersey-gold: "oklch(0.63 0.101 77)"
  jersey-sage-pale: "oklch(0.9 0.026 178)"
  jersey-sage-ink: "oklch(0.28 0.058 204)"
  cream: "oklch(0.965 0.011 103)"
  paper: "oklch(0.992 0.006 103)"
  ink: "oklch(0.22 0.034 215)"
  ink-muted: "oklch(0.43 0.036 205)"
  mist: "oklch(0.935 0.015 150)"
  hairline: "oklch(0.86 0.022 157)"
  danger: "oklch(0.577 0.245 27.325)"
  night-petrol: "oklch(0.16 0.025 220)"
  night-card: "oklch(0.22 0.025 220)"
  night-raised: "oklch(0.3 0.035 220)"
  night-mist: "oklch(0.26 0.02 220)"
  night-gold: "oklch(0.72 0.08 80)"
  night-sage: "oklch(0.55 0.04 210)"
  night-ink: "oklch(0.97 0.005 80)"
  night-ink-muted: "oklch(0.7 0.015 220)"
  night-hairline: "oklch(1 0 0 / 12%)"
  night-danger: "oklch(0.704 0.191 22.216)"
  zwb-petrol: "#004653"
  zwb-petrol-dark: "#0a2b34"
  zwb-teal: "#1f6068"
  zwb-sage: "#7f9590"
  zwb-gold: "#b8873d"
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
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.025em"
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
  sm: "0.3rem"
  md: "0.4rem"
  lg: "0.5rem"
  xl: "0.7rem"
  full: "9999px"
  weekoverzicht-print: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.jersey-petrol}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline-hover:
    backgroundColor: "{colors.mist}"
  button-secondary:
    backgroundColor: "{colors.jersey-sage-pale}"
    textColor: "{colors.jersey-sage-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-ghost-hover:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  chip:
    backgroundColor: "{colors.jersey-sage-pale}"
    textColor: "{colors.jersey-sage-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  page-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px 16px 16px 20px"
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

## Overview

**Creative North Star: "Het Clubhuis"**

Dit is de plek waar een lid even binnenloopt. Rustig, vertrouwd en
overzichtelijk: je ziet in één blik wat er vandaag speelt en bent zo weer weg.
Niets schreeuwt. Het tenue hangt aan de muur en zit in de details, het is de
aankleding van de ruimte en niet het onderwerp.

Het systeem is plat en compact. Crème papier of diep petrol als ondergrond,
kaarten die zich met een dunne rand en een fractie lichtere toon aftekenen,
kleine afrondingen, één schreefloos lettertype in een smal bereik van maten.
Veel informatie past op een telefoonscherm zonder dat het druk wordt, omdat
bijna alles dezelfde rustige toon heeft en alleen de actie petrol of goud is.

Bevestigd wat het niet is: geen Strava- of Zwift-kloon (geen oranje, neon of
game-glans), geen generiek SaaS-dashboard (geen paarse gradiënten, glas of
rijen identieke statistiekkaarten) en geen drukke sportsite (geen schreeuwende
koppen, schuine sporttypografie of foto's achter alles).

**Key Characteristics:**
- Plat, met dunne randen in plaats van schaduw.
- Compact, maar met tikdoelen die een duim haalt.
- Tenuekleuren als accent op een neutrale, licht getinte ondergrond.
- Licht en donker zijn twee volwaardige thema's, geen afgeleide van elkaar.
- Cijfers in tabelcijfers, zodat kolommen en tijden recht onder elkaar staan.

## Colors

Vier tenuekleuren op twee rustige ondergronden: crème bij licht, diep petrol
bij donker. De semantische tokens in `src/app/globals.css` zijn de bron; de
hexwaarden `zwb-*` zijn de letterlijke tenuekleuren voor logo, kaartlagen en
motief.

### Primary
- **Jersey Petrol** (`jersey-petrol`): de actiekleur in het lichte thema.
  Primaire knoppen, links, actieve navigatie, iconen bij sectiekoppen.
- **Night Gold** (`night-gold`): dezelfde rol in het donkere thema. Petrol
  verdwijnt op een donkere kaart, dus daar neemt goud de actie over.

### Secondary
- **Jersey Gold** (`jersey-gold`): accent en focusring in het lichte thema,
  en de onderkant van de merkbalk in de paginakop.
- **Night Sage** (`night-sage`): het accent in het donkere thema.

### Tertiary
- **Pale Sage** (`jersey-sage-pale`) met **Sage Ink** (`jersey-sage-ink`):
  secundaire knoppen en chips. Donker: `night-raised` met `night-ink`.
- **ZWB Teal** en **ZWB Sage** (`zwb-teal`, `zwb-sage`): alleen in het
  tenuemotief en in kaartlagen zoals ZWBlokken, niet als tekst- of knopkleur.

### Neutral
- **Cream** (`cream`) / **Night Petrol** (`night-petrol`): paginaondergrond.
- **Paper** (`paper`) / **Night Card** (`night-card`): kaarten, menu's,
  dialogen.
- **Mist** (`mist`) / **Night Mist** (`night-mist`): hover en gedempte vlakken.
- **Ink** (`ink`) / **Night Ink** (`night-ink`): lopende tekst en koppen.
- **Ink Muted** (`ink-muted`) / **Night Ink Muted** (`night-ink-muted`):
  bijschriften, metadata, lege staten.
- **Hairline** (`hairline`) / **Night Hairline** (`night-hairline`): alle
  randen en scheidingslijnen.
- **Danger** (`danger`) / **Night Danger** (`night-danger`): fouten en
  verwijderen, als tint (10 tot 20% dekking) met gekleurde tekst, nooit als
  vol rood vlak.

### Named Rules
**De Wisselregel.** Licht en donker ruilen de actiekleur: petrol bij licht,
goud bij donker. Gebruik daarom altijd de semantische token (`primary`,
`accent`) en nooit een vaste tenuekleur voor iets waar je op kunt tikken.

**De Goudregel.** Het tenuegoud haalt als kleine tekst op licht maar 3,1:1.
Goud is op licht voor vlakken, balken en ringen; voor cijfers en labels
bestaat de diepere tint `--zwblok-own-text` (4,9:1).

## Typography

**Display Font:** Geist (met ui-sans-serif, system-ui)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono voor code en ID's

**Character:** Eén zakelijk, goed leesbaar schreefloos lettertype dat het hele
werk doet. Hiërarchie komt uit gewicht en kleur, niet uit grote sprongen in
maat.

### Hierarchy
- **Headline** (600, 1.5rem op telefoon en 1.875rem vanaf `sm`, spatiëring
  -0.025em): de paginatitel in de paginakop. Eén per scherm.
- **Title** (600, 1rem op telefoon en 1.125rem vanaf `sm`): sectiekoppen,
  met een dunne lijn eronder.
- **Body** (400, 0.875rem, regelhoogte 1.43): vrijwel alle tekst in de app.
  Lopende tekst op `/hulp` en in verslagen maximaal 65 tot 75 tekens breed.
- **Label** (600, 0.75rem, spatiëring 0.025em, hoofdletters): bovenkopjes,
  groepskoppen in het menu, chips.

### Named Rules
**De Kolomregel.** Elk getal dat vergeleken wordt (tijden, watt, W/kg,
standen, afstanden) staat in `tabular-nums`.

**De Smalle-ladderregel.** De app leeft tussen 0.75rem en 0.875rem. Groter dan
de paginatitel komt in de app niet voor; `font-bold` en zwaarder zijn
uitzonderingen, 600 is het zwaarste werkgewicht.

## Layout

Eén gecentreerde kolom van maximaal 80rem met 16px marge links en rechts en
24px boven en onder. Bovenaan een vaste, half doorzichtige balk met logo,
terugknop, navigatie en profiel. Vanaf 768px staat de navigatie uitgeschreven
in de balk; daaronder zit alles achter één menuknop die een paneel over de
volle breedte opent.

Het ritme is dicht: 16px binnen kaarten (20px bij ruimere blokken), 12px
tussen een kop en zijn inhoud, lijsten als rijen met een scheidingslijn in één
kaart in plaats van losse kaarten per rij. Schermen worden eerst voor de
staande telefoon opgezet; breder krijgt meer kolommen, geen ander ontwerp.
Brede tabellen schuiven horizontaal binnen hun eigen kaart, de pagina zelf
nooit.

**De Duimregel.** Alles waar je op de telefoon op tikt is minstens 44px hoog
(`min-h-11`), ook als het er compact uitziet. De standaardknop van 32px is
voor desktop en voor dichte rijen met genoeg ruimte eromheen; op de telefoon
krijgt een losse actie de ruimte.

## Elevation & Depth

Plat. Diepte komt uit toon en rand: een kaart is een fractie lichter dan de
ondergrond en heeft een haarlijn. Schaduw is gereserveerd voor wat echt boven
de pagina zweeft.

### Shadow Vocabulary
- **Zweeflaag** (`shadow-2xl` met een ring van `border` op 70%): het mobiele
  menu, dropdowns en dialogen.
- **Lichte tilt** (`shadow-sm`): spaarzaam, voor een element dat boven een
  kaart of afbeelding ligt.

### Named Rules
**De Platte-vloerregel.** Een kaart in rust heeft geen schaduw. Wie diepte
wil, gebruikt de toon van het vlak of een rand.

## Shapes

Kleine, rustige afrondingen op basis van één straal (0.5rem). Kaarten,
knoppen en de paginakop krijgen 0.5rem; velden, menu-items en lege staten
0.4rem; chips, avatars en statusbolletjes zijn volledig rond. Randen zijn
altijd 1px in de haarlijnkleur; een lege staat heeft een gestreepte rand.

Het enige eigen vormmotief is het tenue: schuine banen in petrol, teal, sage
en goud op lage dekking (3 tot 20%), afgesneden onder vaste hoeken (132°,
149°, 28°, 156°). Het staat vast achter de bovenkant van de app en, kleiner,
in de paginakop.

**De Motiefregel.** De schuine banen horen bij de schil en de paginakop.
Niet achter lijsten, formulieren of tabellen, en nooit op hogere dekking.

## Components

Plat, compact en precies. Elk onderdeel is zo klein als het kan zijn zonder
dat een duim misgrijpt.

### Buttons
- **Shape:** zacht afgerond (0.5rem), 32px hoog, 10px zijmarge, 14px tekst in
  gewicht 500. Kleinere maten (24 en 28px) voor in rijen en tabellen.
- **Primary:** actiekleur met lichte tekst. Eén per blok.
- **Outline:** ondergrondkleur met haarlijn; hover naar Mist.
- **Secondary:** Pale Sage met Sage Ink.
- **Ghost:** geen vlak tot hover.
- **Destructive:** rode tekst op een rode tint van 10%, geen vol rood vlak.
- **Hover / Focus:** hover dimt het vlak naar 80%; focus geeft een rand in de
  ringkleur plus een ring van 3px op halve dekking; indrukken schuift de knop
  1px omlaag.
- **Telefoon:** zie de Duimregel.

### Chips
- **Style:** volledig rond, 2px bij 8px, labeltypografie. Secundair (Pale
  Sage) voor categorieën, een tint van de actiekleur (10%) met tekst in de
  actiekleur voor status.
- **State:** een aanklikbare chip heeft een rand en kleurt bij hover naar Mist.

### Cards / Containers
- **Corner Style:** 0.5rem.
- **Background:** Paper, soms op 90% zodat het tenuemotief er net doorheen
  schemert.
- **Shadow Strategy:** geen; zie de Platte-vloerregel.
- **Border:** 1px haarlijn.
- **Internal Padding:** 16px, 20px voor ruimere blokken. Lijsten: rijen met
  een scheidingslijn in één kaart.

### Inputs / Fields
- **Style:** ondergrondkleur met 1px haarlijn, 0.4rem afronding, 14px tekst.
  Compact (4px bij 8px) in dichte formulieren, ruimer (8px bij 12px) bij
  losse velden.
- **Focus:** ring in de ringkleur (goud bij licht en bij donker).
- **Label:** boven het veld, geen uitlegtekst eronder; toelichting staat op
  `/hulp`.

### Navigation
- **Balk:** 1px haarlijn onderaan, ondergrond op 88% met vervaging. Het
  originele logo links (zie Logo).
- **Desktop:** tekstlinks van 14px met 20px tussenruimte; groepen openen een
  dropdown.
- **Telefoon:** een paneel over de volle breedte onder de balk, op een
  gedimde achtergrond. Items zijn rijen met een rand (0.4rem, 14px);
  groepskoppen in labeltypografie met een 2px streep in de actiekleur links.

### Logo
Het merkteken is het originele ZWB-logo (`public/zwb-logo.png`): de letters
Z, W en B in goud, petrol en zwart, met "Cycling Community" eronder. De drie
schuine vlakken van `ZwbLogo`/`ZwbMark` (`src/components/zwb-logo.tsx`) en van
`public/icon.svg` zijn een benadering en worden vervangen door het origineel:
in de balk, op de publieke pagina's en in het app-icoon.

- **In de balk:** het logo zonder ondertitel is te smal om te lezen op 28px;
  gebruik het volledige logo op een hoogte waarop de letters herkenbaar zijn.
- **Donker thema:** de B en de ondertitel zijn zwart en vallen weg op diep
  petrol. Zet het logo daar op een licht vlak (Paper), zoals de loginpagina
  al doet, tot er een lichte variant van de club is.
- **Bron:** het bestand is 300 bij 104 pixels. Voor groot gebruik en voor het
  app-icoon is een vectorbestand of een grotere export van de club nodig.

**De Origineelregel.** Het logo wordt niet nagetekend, bijgekleurd of
vereenvoudigd. Past het ergens niet, dan verandert de omgeving, niet het logo.

### Paginakop
Het herkenningspunt van elk scherm: een kaart met het tenuemotief, links een
verticale balk van 6px die van de actiekleur naar goud verloopt, een optioneel
bovenkopje in labeltypografie, de paginatitel en hooguit één regel
beschrijving. Acties staan rechts, op de telefoon eronder.

### Sectiekop
Een pictogram van 16px in de actiekleur, de titel, en rechts een optionele
actie ("meer"-link met pijl), afgesloten met een haarlijn eronder.

### Lege staat
Gestreepte rand, Paper op 70%, één gedempte zin en hooguit één actie.

### Weergaveknop (profiel)
Een rail met drie standen onder de profielkop: bewerken, wat leden zien en het
deelbare profiel (`.view-slider` in `globals.css`, `profile-view-toggle.tsx`).
De rail is Mist met een haarlijn en volledig rond; een effen gouden knop
(tenuegoud bij licht, nachtgoud bij donker) schuift naar de gekozen stand.
Iconen in plaats van tekst (potlood, mensen, wereldbol), met de naam als
tooltip en als label voor schermlezers. Het icoon op de knop staat in inkt,
de andere in de gedempte tekstkleur. Elke stand is 48 bij 38px in een rail van
44px hoog. De knop schuift in 0.28s; niet bij `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** gebruik semantische tokens (`primary`, `accent`, `card`, `muted`,
  `border`), zodat licht en donker beide kloppen.
- **Do** controleer elk nieuw scherm in beide thema's en op een staande
  telefoon.
- **Do** geef tikdoelen op de telefoon minstens 44px hoogte.
- **Do** zet getallen in `tabular-nums`.
- **Do** begin een scherm met de paginakop en verdeel het met sectiekoppen.
- **Do** gebruik het originele ZWB-logo als merkteken, op een licht vlak in
  het donkere thema.
- **Do** respecteer `prefers-reduced-motion`; beweging is kort en
  functioneel, zoals de voortgangsbalk bij navigatie.

### Don't:
- **Don't** maak er een Strava- of Zwift-kloon van: geen oranje, neon of
  game-achtige glans. Merkkleuren van derden alleen waar hun richtlijnen dat
  eisen.
- **Don't** bouw een generiek SaaS-dashboard: geen paarse gradiënten,
  glaseffecten of rijen identieke statistiekkaarten.
- **Don't** maak er een drukke sportsite van: geen schreeuwende koppen,
  schuine sporttypografie of foto's achter alles.
- **Don't** gebruik de drie schuine vlakken nog als logo, en teken het logo
  niet na.
- **Don't** geef een kaart in rust een schaduw.
- **Don't** gebruik goud als kleine tekst op een lichte ondergrond.
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
Smalle-ladderregel en de Motiefregel van het hoofdsysteem niet, en ook de
Wisselregel niet (de knop is hier inkt in beide thema's). Omgekeerd lekt er
niets uit dit register naar de gewone schermen: geen stencilletter, geen
Karla, geen overdruk, geen papierkorrel, geen paskruisjes, geen
`weekoverzicht-`-token. Een scherm buiten het overzicht dat er zo uitziet, is
fout. De Kolomregel, de Duimregel en de Goudregel blijven ook hier gelden.

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
