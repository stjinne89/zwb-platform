# ZWB ZRL Live — Sauce for Zwift-mod

Overlay met de live WTRL-puntenstand van de ZRL-race die je in Zwift bekijkt.
Het ZWB-platform rekent (`/api/live/zrl/[zwiftEventId]/[subgroupId]`); de mod
toont alleen. Werkt voor ZRL-races die als ZWB-teamevent met Zwift-event op het
platform staan.

## Installeren

1. Kopieer de map `zwb-zrl-live` naar `Documenten\SauceMods` op de computer met
   Sauce for Zwift.
2. Start Sauce opnieuw en zet de mod aan onder Instellingen → Mods.
3. Open het venster "ZWB ZRL Live" en sleep het naar een plek naast Zwift.

Kijk naar een renner in een ZRL-race (eigen renner of via Fan View); de overlay
volgt vanzelf de subgroep van die renner.

## Testen tegen een lokale server

Open de pagina met `?server=http://localhost:3000` om tegen `npm run dev` te
testen in plaats van productie.
