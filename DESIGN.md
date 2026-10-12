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
rounded:
  sm: "0.3rem"
  md: "0.4rem"
  lg: "0.5rem"
  xl: "0.7rem"
  full: "9999px"
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
