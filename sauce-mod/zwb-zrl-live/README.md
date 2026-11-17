# ZWB ZRL Live — Sauce for Zwift-mod

Twee vensters: ZWB ZRL Live en ZWB TTT-plan (onderaan).

Overlay met de live WTRL-puntenstand van de ZRL-race die je in Zwift bekijkt.
Het ZWB-platform rekent (`/api/live/zrl/[zwiftEventId]/[subgroupId]`); de mod
toont alleen. Werkt voor ZRL-races die als ZWB-teamevent met Zwift-event op het
platform staan.

## Installeren

1. Kopieer de map `zwb-zrl-live` naar `Documenten\SauceMods` op de computer met
   Sauce for Zwift.
2. Start Sauce opnieuw en zet de mod aan onder Instellingen → Mods.
3. Open het venster "ZWB ZRL Live" en sleep het naar een plek naast Zwift.

Bij een ploegentijdrit toont de overlay de laatste tussentijd van de eigen ploeg,
met de andere ploegen als verschil daarmee ("-0:25" is sneller dan wij). Na een
wijziging van de mod: de map opnieuw kopiëren en Sauce herstarten.

Kijk naar een renner in een ZRL-race (eigen renner of via Fan View); de overlay
volgt vanzelf de subgroep van die renner.

## Testen tegen een lokale server

Open de pagina met `?server=http://localhost:3000` om tegen `npm run dev` te
testen in plaats van productie.

## ZWB TTT-plan

Tweede venster van deze mod. Toont het plan uit de Export JSON van
zwiftgopher.com/TTT: per renner kopbeurt (watt, W/kg, seconden), het wiel op
plek 2, 3 en 4, en de IF. Uit het `nearby`-kanaal van Sauce volgt de plek van
elke renner in de rij; de cel met het vermogen voor die plek licht op. Op plek 5
en verder geldt plek 4. De kolom Nu toont de plek en het gemiddelde vermogen op
die plek (laatste 5 s): groen binnen 5% van het doel, oranje lager, rood hoger.

- Inladen: sleep het JSON-bestand in het venster, plak de JSON (Ctrl+V) of klik
  op Bestand kiezen. Met de muis boven het venster verschijnt Plan om een ander
  plan te kiezen. Het plan blijft bewaard in het venster.
- Alleen de JSON: de tekstexport heeft geen Zwift-ID's, en de link van
  ZwiftGopher (`#t=…`) is niet zonder de site uit te lezen.
- De rekenkant staat in `pages/src/ttt-plan-core.mjs`, getest in
  `tests/unit/sauce-ttt-plan.test.ts`.
