# Kennis van leden — onderzoek en voorstellen

2026-10-15. Aanleiding: de eigenaar ziet het kennisnetwerk van de leden als een
mogelijke kracht van ZWB, maar zag niet voor zich hoe het platform dat vorm geeft.
Dit document bevat het onderzoek, de voorstellen en wat daarvan is gekozen. Wat er
gebouwd is, staat in `PLAN.md` (ronde "Wie weet wat, vragen en ledentips").

## 1. Wat de app al laat zien

Bron: [gebruiksanalyse 2026-09-17](gebruiksanalyse-2026-09-17.md), plus de code.

- **Aantallen:** 35 accounts, waarvan 18 actief in 30 dagen en 14 met een eigen actie.
- **Een kennis-Q&A bestaat al, maar wordt niet gebruikt.** `posts` heeft sinds
  `0019` de soorten `vraag` en `tip`, met eigen categorieën (training, routes,
  race-craft, regelgeving, voeding). Ze staan in Vraag en Aanbod. Er is in vier
  maanden één post geplaatst, met 0 reacties.
- **Andere bijdragen die leden zelf schrijven, blijven ook klein.** Er is één
  ritverslag, de event-chat telt 16 berichten en er is één poll geweest.
- **Wat wel loopt, gebeurt vanzelf of als bijproduct.** Dat zijn ritdata,
  ZWBlokken, achievements en het schema. Het delen van een recept met goedkeuring
  werkt ook.
- **Het gesprek zelf zit in WhatsApp.** De onderhoudstips in Mijn garage
  (`maintenance_tips`, `0122`) halen daar al kennis uit. Het bestuur importeert
  berichten uit de groepsapp als citaat onder de naam van het lid, en het lid
  beheert die citaten zelf. Dat is de enige plek waar kennis van leden nu in de app
  staat, en het werkt.

## 2. Wat onderzoek zegt over kennis delen in kleine groepen

1. **Participatie-ongelijkheid (90-9-1).** In online groepen leest ongeveer 90%
   alleen, draagt 9% af en toe iets bij en levert 1% het meeste
   (Nielsen, *Participation Inequality*, 2006). Bij 18 actieve leden geeft een open
   forum hooguit één of twee schrijvers. Een leeg forum stoot leden af. Dat is
   precies wat er met Vraag en Aanbod gebeurde.
2. **Wielerkennis is grotendeels impliciet.** Denk aan hoe je een ZRL-race
   indeelt, hoe je eet op een granfondo of welke band je op welk gravelpad kiest.
   Zulke kennis gaat over via mensen, door samen te doen en door ernaar te vragen,
   en niet via artikelen (Nonaka & Takeuchi, *The Knowledge-Creating Company*, 1995).
3. **Transactief geheugen.** Een groep wordt slim als de leden weten *wie* wat
   weet, niet als alles is opgeschreven (Wegner, 1987). Een "wie weet wat"-kaart is
   daarom goedkoper én sterker dan een kennisbank die gevuld moet blijven.
4. **Een gerichte vraag werkt beter dan omroepen.** Een vraag die naar een paar
   passende mensen gaat, krijgt sneller en vaker antwoord dan een vraag aan
   iedereen (Horowitz & Kamvar, *The Anatomy of a Large-Scale Social Search
   Engine*, WWW 2010, over Aardvark).
5. **Delen als bijproduct.** De drempel is het laagst als delen een vinkje is bij
   iets wat je toch al doet. Strava laat dat zien: de rit wordt gedeeld omdat je
   hem toch registreert.
6. **Kennis op de plek waar je hem nodig hebt.** Een tip bij de col, het event of
   het onderdeel wordt gelezen. Een aparte kennispagina wordt niet bezocht.
7. **Oogsten in plaats van verhuizen.** Het gesprek uit WhatsApp weghalen lukt
   niet (zie het E2E-chatonderzoek in `PLAN.md`). Wel kan het bruikbare eruit
   gehaald worden, met naam en met zeggenschap van het lid.

## 3. Voorstellen

| | Voorstel | Kern | Inzet |
|---|---|---|---|
| A | **Wie weet wat** | Een lid kiest onderwerpen waar het ervaring mee heeft. Een overzicht per onderwerp en een blok op het profiel. | Klein, geen schrijfwerk |
| B | **Tips van leden op hun plek** | Korte tips per onderwerp, ook bij een event of col. Leden plaatsen ze zelf, of ze komen uit WhatsApp. | Hergebruikt het patroon van de garagetips |
| C | **Wie reed dit al** | Uit de ritdata: wie reed deze granfondo, col of ZRL-route al. | Bijproduct, maar toont wie waar reed: dat vraagt een eigen privacybesluit |
| D | **Delen met de club bij wat je maakt** | Een vinkje bij een pacingplan, warming-up, TTT-plan of eigen workout. | Per onderdeel klein; de recepten zijn het voorbeeld |
| E | **Een gerichte vraag** | Een vraag gaat naar een paar leden met dat onderwerp, en een goed antwoord wordt een tip. | Kan pas als A gevuld is |
| F | **AI die de clubkennis kent** | De coachchat of een kennisvraag gebruikt de kennisbanken en de tips van leden, met hun naam, en verwijst naar "vraag het aan X". | Hangt af van A en B en van de privacyscope; staat geparkeerd in `PLAN.md` |
| G | **Clinics door leden** | Een lid geeft een korte sessie, live of op Zwift. | Kan nu al als gewoon event |

**Niet doen:** een forum, een open Q&A-feed of Vraag en Aanbod nieuw leven
inblazen. Op deze schaal blijft dat leeg.

## 4. Besluiten van de eigenaar (2026-10-15)

- Alle richtingen spreken aan. **Fase 1 is A en B, plus het begin van E**: een
  vraag aan één kenner.
- **Contact via de app, niet via WhatsApp.** Er was eerst een `wa.me`-link
  voorgesteld met een telefoonnummer dat het lid zelf opgeeft. De eigenaar koos
  voor berichten in de app. Zo blijven telefoonnummers buiten de app, en kan een
  bruikbaar antwoord er weer een plek krijgen als tip.
- Daarna volgen C en D. Later komen een vraag aan alle kenners van een onderwerp
  en F, zodra blijkt dat A en B gevuld raken.

## 5. Ontwerpkeuzes in fase 1

- **Een gesprek is alleen voor de twee deelnemers, ook niet voor het bestuur.**
  Dat is dezelfde keuze als bij de coachchat (`0167`). Er is daarom ook geen
  moderatie van gesprekken. Een deelnemer kan een gesprek wel sluiten.
- **Een tip uit een gesprek bewaart de ontvanger, niet de schrijver.** Zo
  besloten op 2026-10-15 (migratie `0240`). In de eerste versie kon je alleen je
  eigen bericht als tip plaatsen. De eigenaar draaide dat om: of een antwoord
  waardevol is, beslist wie het kreeg. "Bewaar als tip" staat daarom alleen bij
  berichten van de ander. De tip komt op naam van de schrijver, die een melding
  krijgt en hem zelf kan aanpassen of verwijderen; wie hem bewaarde, kan dat
  daarna niet. Dezelfde afspraak geldt voor de import uit de groepsapp
  (`/voorwaarden`).
- **De onderwerpen staan vast in code.** Zo vindt iedereen elkaar onder hetzelfde
  woord. Er is bewust geen gezondheidsonderwerp: wie zich daar als kenner meldt,
  vertelt de club iets over de eigen gezondheid.
- **Een toestemming per functie, geen nieuwe privacyversie.** Dat volgt het
  eetdagboek en de protocollen.
- **Een ongelezen-icoon in de kop naast push.** Push staat maar bij 4 leden aan, en
  zonder signaal blijft een vraag onbeantwoord.

## 6. Hoe we weten of het werkt

Meet na zes weken met alleen geaggregeerde tellingen, zoals bij de gebruiksanalyse:

- het aantal leden met minstens één onderwerp
- het aantal gesprekken, en hoeveel daarvan een antwoord kregen
- het aantal tips, en hoeveel daarvan zelf geplaatst zijn, uit een gesprek komen of
  uit de import (`source`: `lid`, `gesprek`, `import`)

Blijft het onder een handvol, dan C en D niet bouwen. Kijk dan eerst of de import
uit de groepsapp de kennis beter vangt dan zelf schrijven.
