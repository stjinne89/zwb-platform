# Regelmotor: literatuurtoets

**2026-10-26.** Tweede maat naast de [meetlat](schema-meetlat.md) en het
[naspelen](regelmotor-naspelen.md). De meetlat toetst of een schema de regels van
de prompt volgt; deze toets kijkt of het binnen de grenzen valt die onderzoek
aangeeft. Code: `src/lib/training/literature-check.ts` (puur, getest in
`tests/unit/literature-check.test.ts`); tellingen:
`node scripts/engine-literature.mjs` na `node scripts/engine-export.mjs`.
De tellingen onderaan zijn van 2026-10-26, op 532 geëxporteerde generaties.

## Conclusie

**Op deze drie maatstaven zijn AI en motor niet uit elkaar te halen, en de
literatuur kan het verschil ook niet maken.**

- **Intensiteitsverdeling.** Beide maken vrijwel alleen piramidale schema's of
  basisblokken (minder dan 5 % boven zone 1). Geen van beide maakt een verdeling
  die de literatuur minder steunt, op één motorschema na: een nieuw schema van
  2026-10-23 voor basisconditie bij een lid dat een halve rit per week reed, met
  dertien trainingen in negen weken die allemaal tempo of sweet spot zijn (zone 2
  57 %, zone 1 43 %, alleen warming-up en cooling-down). Bij één à twee ritten per
  week maakt de motor elke rit een sleutelsessie; geen rustige duurrit ertussen.
  Dat is een punt voor de motor, niet hier opgelost. Piramidaal en
  gepolariseerd werken even goed; recreanten hebben eerder baat bij piramidaal.
  Dat de motor iets meer tempo plant (mediaan zone 2 van 19 % tegen 10 % bij nieuwe
  schema's) en minder basisblokken maakt, is binnen de literatuur geen beter of
  slechter.
- **Taper.** Niet te toetsen: in alle generaties staat één schema met een
  piekmoment en drie weken ervoor binnen de periode. Daarin haalde de motor de
  41-60 % volumedaling (43 %) en de AI niet (18 %). Eén geval zegt niets.
- **Onderbreking.** Geen van beide plant een gat van meer dan tien dagen. Wel
  hield de AI in 6 van de 33 nieuwe schema's (alle van vóór 2026-08) en in 1 % van
  de recente bijwerkingen meer dan tien dagen vóór het einde van de periode op met
  plannen. Dat is geen literatuurregel maar een afgebroken antwoord; de motor deed
  het nergens.

**Wat dit betekent voor de beslissing.** De literatuur geeft bandbreedtes, geen
optimum per lid, en beide schema's vallen erbinnen. Welk schema beter traint, is
met literatuur niet vast te stellen; daarvoor blijven het blinde oordeel van
trainers (tabblad Vergelijken) en een proef in de praktijk over. Voorstel voor die
proef: [crossover-pilot-voorstel](crossover-pilot-voorstel.md).

## Maatstaven en bronnen

Bronnen nagekeken in PubMed op 2026-10-26, en voor zover ze in de kennisbank
staan, eerder in de [wetenschappelijke toets](wetenschappelijke-toets.md).

### 1. Intensiteitsverdeling

Minuten per zone uit de geplande blokken, in Seilers drie zones, benaderd via de
intensity van een blok: herstel en duur zone 1, tempo en drempel zone 2, VO2max en
anaeroob zone 3. Races en rustdagen tellen niet mee. Dit is een benadering: Seilers
zones liggen op gemeten drempels (VT1, VT2), niet op %FTP, en warming-up en
cooling-down tellen als zone 1.

| Soort | Regel | Literatuur |
|---|---|---|
| basis | minder dan 5 % boven zone 1 | hangt af van de fase |
| hoog | zone 3 ≥ zone 1 | minder gesteund |
| drempel | zone 2 ≥ zone 1 | minder gesteund |
| gepolariseerd | polarisatie-index > 2,00 | gesteund |
| piramidaal | zone 1 > zone 2 > zone 3 | gesteund |
| overig | de rest | hangt af van de fase |

- Polarisatie-index: log10(Z1/Z2 × Z3 × 100) met aandelen, gepolariseerd boven
  2,00 — Treff e.a. 2019, [doi:10.3389/fphys.2019.00707](https://doi.org/10.3389/fphys.2019.00707).
  Zonder zone 2 maar met zone 3 telt een schema hier als gepolariseerd (eigen keuze;
  de index is dan niet gedefinieerd).
- Geen verschil tussen gepolariseerd en piramidaal op VO2max of tijdrit, en geen
  significant verschil met andere verdelingen; competitieve sporters mogelijk meer
  baat bij gepolariseerd, recreanten bij piramidaal — Rosenblat e.a. 2025,
  netwerk-meta-analyse op individuele data (13 studies, 348 sporters),
  [doi:10.1007/s40279-024-02149-3](https://doi.org/10.1007/s40279-024-02149-3).
- Bij gelijk aandeel hoog werk gaf meer tijd onder de eerste drempel (80 % tegen
  67 %) een grotere verbetering — Esteve-Lanao e.a. 2007, 12 lopers, 5 maanden,
  [doi:10.1519/R-19725.1](https://doi.org/10.1519/R-19725.1). Klein en bij lopers:
  daarom "minder gesteund", niet "fout".
- Goed getrainde duursporters trainen rond 80 % van hun sessies rustig —
  Seiler 2010, beschrijvend overzicht,
  [doi:10.1123/ijspp.5.3.276](https://doi.org/10.1123/ijspp.5.3.276).

### 2. Taper

Alleen bij een piekmoment: het doel bij een outdoor event of gran fondo (zonder
`goalBeyond`) of een A-mikpunt — dezelfde ankers als de meetlat. De taper zijn de
veertien dagen ervoor, vergeleken met het weekgemiddelde van de 21 dagen daarvóór.
Beide moeten helemaal binnen de periode van het schema vallen.

- Volume 41-60 % omlaag in twee weken, intensiteit en frequentie gelijk —
  Bosquet e.a. 2007, meta-analyse van 27 studies,
  [doi:10.1249/mss.0b013e31806010e0](https://doi.org/10.1249/mss.0b013e31806010e0);
  bevestigd door Wang e.a. 2023 (kennisbank, artikel Taper).
- "Intensiteit behouden": er zit nog zone 2- of 3-werk in de taper als dat er
  ervoor ook was. "Frequentie behouden": minstens 80 % van de trainingen per week
  van ervoor. Beide grenzen zijn eigen keuzes; de meta-analyse zegt alleen "niet
  veranderen".

### 3. Onderbreking

De langste reeks dagen zonder training vanaf het begin van de periode tot de
laatste training; rustperiodes uit het jaarplan tellen niet. Meer dan tien dagen
telt als te lang: stofwisselingsveranderingen zijn er binnen tien dagen, VO2max en
bloedvolume dalen binnen enkele weken — Mujika & Padilla 2000,
[doi:10.2165/00007256-200030020-00002](https://doi.org/10.2165/00007256-200030020-00002),
en 2001, [doi:10.1097/00005768-200103000-00013](https://doi.org/10.1097/00005768-200103000-00013).
Apart, zonder bron, staat hoe vaak een schema meer dan tien dagen vóór het einde
van zijn periode ophoudt.

### Bewust niet getoetst

- **Lange ritten en durability.** De literatuur is beschrijvend, niet
  interventioneel ([lange-ritten-variatie](lange-ritten-variatie.md)); er is geen
  grens om op te toetsen.
- **Opbouw per week.** Zit al in de meetlat (`opbouwgroei`, onderbouwd met
  Damsted 2018 in de wetenschappelijke toets).
- **Eén VO2max-prikkel per week bij ZRL, aantal sleutelsessies.** Eigen keuzes
  zonder bron (B10 in de wetenschappelijke toets).
- **Dagaanpassingen.** Die wijzigen een paar dagen en hebben geen eigen verdeling
  of taper.

## Beperkingen

- Getoetst wordt het **plan**, niet wat er gereden is.
- De zones zijn een benadering via %FTP-labels (zie boven).
- De literatuur komt grotendeels van goed getrainde en competitieve sporters;
  ZWB-leden zijn meestal recreanten.
- Binnen de bandbreedtes blijven betekent niet dat een schema beter traint.

<!-- tellingen: alles hieronder schrijft scripts/engine-literature.mjs -->

Gegenereerd door `scripts/engine-literature.mjs` op 241 nieuwe schema's en bijwerkingen
(van 532 geëxporteerde generaties). Alleen tellingen, geen ledendata.

## Vanaf 2026-09-17

### bijwerking (118)

**Intensiteitsverdeling.** Aandeel schema's per soort verdeling.

| Verdeling | Literatuur | AI | Motor |
|---|---|---:|---:|
| piramidaal | gesteund | 76% | 89% |
| basis | fase | 24% | 10% |
| overig | fase | 0% | 1% |

Mediaan zone 1 / 2 / 3: AI 91% / 7% / 1%, motor 87% / 10% / 1%.

Per generatie naast elkaar (rij AI, kolom motor):

| AI \ motor | gesteund | minder | fase |
|---|---:|---:|---:|
| gesteund | 84 | 0 | 6 |
| minder | 0 | 0 | 0 |
| fase | 21 | 0 | 7 |

**Taper** (alleen schema's met een piekmoment én drie weken ervoor binnen de periode).

| | AI | Motor |
|---|---:|---:|
| te beoordelen | 0 | 0 |
| volume 41-60% omlaag | – | – |
| intensiteit behouden | – | – |
| frequentie behouden | – | – |
| mediane volumedaling | – | – |

**Onderbreking.** Meer dan 10 dagen zonder training (rustperiodes uit het jaarplan niet meegeteld).

| | AI | Motor |
|---|---:|---:|
| langer dan 10 dagen | 0% | 0% |
| mediane langste reeks | 1 d | 1 d |
| stopt > 10 dagen vóór het einde (geen literatuurregel) | 1% | 0% |

### nieuw schema (15)

**Intensiteitsverdeling.** Aandeel schema's per soort verdeling.

| Verdeling | Literatuur | AI | Motor |
|---|---|---:|---:|
| piramidaal | gesteund | 100% | 93% |
| drempel | minder | 0% | 7% |

Mediaan zone 1 / 2 / 3: AI 89% / 10% / 1%, motor 81% / 19% / 0%.

Per generatie naast elkaar (rij AI, kolom motor):

| AI \ motor | gesteund | minder | fase |
|---|---:|---:|---:|
| gesteund | 14 | 1 | 0 |
| minder | 0 | 0 | 0 |
| fase | 0 | 0 | 0 |

**Taper** (alleen schema's met een piekmoment én drie weken ervoor binnen de periode).

| | AI | Motor |
|---|---:|---:|
| te beoordelen | 0 | 0 |
| volume 41-60% omlaag | – | – |
| intensiteit behouden | – | – |
| frequentie behouden | – | – |
| mediane volumedaling | – | – |

**Onderbreking.** Meer dan 10 dagen zonder training (rustperiodes uit het jaarplan niet meegeteld).

| | AI | Motor |
|---|---:|---:|
| langer dan 10 dagen | 0% | 0% |
| mediane langste reeks | 2 d | 1 d |
| stopt > 10 dagen vóór het einde (geen literatuurregel) | 0% | 0% |


## Alle generaties

### bijwerking (208)

**Intensiteitsverdeling.** Aandeel schema's per soort verdeling.

| Verdeling | Literatuur | AI | Motor |
|---|---|---:|---:|
| gepolariseerd | gesteund | 0% | 0% |
| piramidaal | gesteund | 82% | 93% |
| basis | fase | 18% | 6% |
| overig | fase | 0% | 0% |

Mediaan zone 1 / 2 / 3: AI 90% / 9% / 1%, motor 86% / 12% / 1%.

Per generatie naast elkaar (rij AI, kolom motor):

| AI \ motor | gesteund | minder | fase |
|---|---:|---:|---:|
| gesteund | 164 | 0 | 6 |
| minder | 0 | 0 | 0 |
| fase | 31 | 0 | 7 |

**Taper** (alleen schema's met een piekmoment én drie weken ervoor binnen de periode).

| | AI | Motor |
|---|---:|---:|
| te beoordelen | 0 | 0 |
| volume 41-60% omlaag | – | – |
| intensiteit behouden | – | – |
| frequentie behouden | – | – |
| mediane volumedaling | – | – |

**Onderbreking.** Meer dan 10 dagen zonder training (rustperiodes uit het jaarplan niet meegeteld).

| | AI | Motor |
|---|---:|---:|
| langer dan 10 dagen | 0% | 0% |
| mediane langste reeks | 1 d | 1 d |
| stopt > 10 dagen vóór het einde (geen literatuurregel) | 0% | 0% |

### nieuw schema (33)

**Intensiteitsverdeling.** Aandeel schema's per soort verdeling.

| Verdeling | Literatuur | AI | Motor |
|---|---|---:|---:|
| piramidaal | gesteund | 100% | 97% |
| drempel | minder | 0% | 3% |

Mediaan zone 1 / 2 / 3: AI 87% / 11% / 1%, motor 81% / 19% / 0%.

Per generatie naast elkaar (rij AI, kolom motor):

| AI \ motor | gesteund | minder | fase |
|---|---:|---:|---:|
| gesteund | 32 | 1 | 0 |
| minder | 0 | 0 | 0 |
| fase | 0 | 0 | 0 |

**Taper** (alleen schema's met een piekmoment én drie weken ervoor binnen de periode).

| | AI | Motor |
|---|---:|---:|
| te beoordelen | 1 | 1 |
| volume 41-60% omlaag | 0% | 100% |
| intensiteit behouden | 100% | 100% |
| frequentie behouden | 100% | 100% |
| mediane volumedaling | 18% | 43% |

Alle drie gehaald, per generatie: beide 0, alleen AI 0, alleen motor 1, geen van beide 0.

**Onderbreking.** Meer dan 10 dagen zonder training (rustperiodes uit het jaarplan niet meegeteld).

| | AI | Motor |
|---|---:|---:|
| langer dan 10 dagen | 0% | 0% |
| mediane langste reeks | 1 d | 2 d |
| stopt > 10 dagen vóór het einde (geen literatuurregel) | 18% | 0% |

