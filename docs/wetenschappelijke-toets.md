# Wetenschappelijke toets van ZWBasis

**Afgerond op 2026-10-16.** Alle zes fases zijn voorgesteld, goedgekeurd en
uitgevoerd. Per fase staat in `PLAN.md` een ronde "wetenschappelijke toets".

## Samenvatting: wat er veranderde

| Fase | Wat er veranderde | Migratie |
|---|---|---|
| 0 | Claimregister: elke wetenschappelijke bewering met plek, bron en status | — |
| 1 | Herstel meten met een eigen HRV-band en gevoel erbij (1C). FTP-test met controle tegen CP/eFTP, meetfout en een andere warming-up (1B). Opbouw zonder "veilige 10 %" (1A). Drempelblokken begrensd naar hun lengte (1D). Bronnen bij de trainingsanalyse (1E). | 0241 |
| 2 | Acht trainingsartikelen hertoetst en twee nieuwe (lange ritten, warming-up). Protocol Duurtest met eigen meting van de ontkoppeling. Korte overbelasting vóór de taper. | — |
| 3 | Voedingskennisbank hertoetst: eiwit minder stellig, bicarbonaat en bèta-alanine bijgesteld, beperkingen bij alle 25 artikelen. | — |
| 4 | Kracht hertoetst. Twee nieuwe artikelen (kracht op de fiets, masters), protocol Kracht op de fiets, springserie voor de botten. | 0242 |
| 5 | Pacing: CP uit FTP naar 1,00, reserve vóór de sprint naar 20 %, variabel vermogen voor tijdrijders. | — |
| 6 | Rit-fysica binnen de metingen; CORE-sensor met vier validatiestudies; DOI-links op /hulp; privacy ongewijzigd. | — |

**Nog open:**
- Migraties 0241 en 0242 op productie.
- De voedingspagina, de sprongfiguur en de Duurtest-reeks in de browser bekijken.
- Of de AI de nieuwe promptregels volgt (Duurtest, kracht op de fiets,
  overbelasting, tijdrit); dat blijkt uit nieuwe schema's en plannen.
- Idee voor het plannenboek: een persoonlijke W′-tijdconstante per lid.

## Oorspronkelijke opdracht

Gestart 2026-10-16 op verzoek van de eigenaar: alle wetenschappelijke beweringen
in de app toetsen, per onderwerp kijken of verdieping mogelijk is, en die
verdieping een plek geven in de kennisbank én in de functionaliteit. Per
onderdeel komt eerst een voorstel; uitvoeren gebeurt pas na goedkeuring.

Dit document is het werkdocument. De conclusies per ronde gaan naar `PLAN.md`.

## Werkwijze

1. **Claims verzamelen** uit code, AI-prompts, kennisbanken, protocollen en `docs/`.
2. **Toetsen** in drie lagen:
   - De **onderzoeksagent van Consensus Pro**: per fase één brief met alle
     regels. Die zoekt breed, leest volle teksten en geeft per regel een
     oordeel. Het ruwe rapport staat in `docs/consensus/`.
   - De **gewone Consensus-zoekfunctie** voor gerichte vragen. Sinds de
     connector op 2026-10-16 opnieuw is verbonden, werkt die ook op Pro: twintig
     resultaten per vraag, met DOI, en meerdere vragen tegelijk.
   - **PubMed** om elke bron en DOI te bevestigen voordat hij de kennisbank in gaat.

   Volle tekst alleen bij open access of via de agent; anders op het abstract,
   en dat staat er dan bij.
3. **Voorstel per claim**: klopt · bijstellen · verdiepen in de kennisbank ·
   functionaliteit aanpassen · bewust laten (met reden).
4. **Akkoord van de eigenaar.**
5. **Uitvoeren**: code, test en `PLAN.md` in één commit, lokaal, niet gepusht.

Teksten in de kennisbank blijven eigen samenvattingen (geen citaten), met bronnen
en een lijst beperkingen, zoals de bestaande kennisbanken.

### Status

| Teken | Betekenis |
|---|---|
| ✔ | Onderbouwd, bron staat in de app of in `docs/` |
| ◐ | Vuistregel of eigen keuze, en zo benoemd in code of docs |
| ✖ | Geen bron, en niet als eigen keuze benoemd |
| ⚠ | Literatuur wijst (deels) een andere kant op |
| · | Nog niet hertoetst (latere fase) |

## Fase 0 — Claimregister

### A. Rekenregels en drempels die schema en advies sturen (fase 1)

| # | Claim | Waar | Status |
|---|---|---|---|
| A1 | FTP = 0,75 × hoogste minuut van de ramptest (stappen ~20 W/min) | `lib/training/ftp-test.ts` | ⚠ geen validatie; nu bewaakt door de controle tegen CP/eFTP (1B) |
| A2 | FTP = 0,95 × 20-minutengemiddelde | idem | ◐ betrouwbaar, maar individueel ruim; zie 1B |
| A3 | Een FTP ouder dan acht weken verdient een nieuwe test | `workouts.ts` prompt | ◐ eigen keuze, nu ook zo benoemd (1B) |
| A4 | HRV-status: 7-daags gemiddelde < 0,90 × baseline = vermoeid, > 1,05 = fris | `wellness.ts` `summarizeWellness` | ✔ vervangen door ln rMSSD-band (1C, 2026-10-16) |
| A5 | Rust-HR > baseline + 3 slagen = vermoeid | idem | ✔ eigen band, minimaal 3 slagen (1C) |
| A6 | Afgeleide readiness: neutraal 70, HRV-afwijking × 200, rust-HR × 300, slaapscore ±8 | `wellness.ts` `deriveReadiness` | ◐ nu in banden (15 en 18 punten per band); gewichten blijven eigen keuze (1C) |
| A7 | Slaapstaffel < 5,5 / 6,0 / 6,5 uur → aftrek 22 / 14 / 6 | `wellness.ts` | ◐ richting klopt (zie 1C), getallen eigen keuze |
| A8 | TSB ≤ −25 herstel, ≤ −10 voorzichtig, ≥ 8 klaar; < −40 ernstig | `wellness.ts` `summarizeTrainingReadiness` | ◐ conventie, nu zo benoemd (1A) |
| A9 | Hoge belasting + HRV boven baseline = goed aangepast, dus verzachten | idem | ✔ bijgesteld: alleen verzachten binnen de band (1C) |
| A10 | Readiness-schaal ≤ 50 laag, < 70 matig, ≥ 75 goed | idem | ◐ overgenomen van apparaten |
| A11 | Zones (Zwift/Coggan): Z2 60–75 %, Z3 76–89 %, Z4 90–104 %, Z5 105–118 %, Z6 ≥ 119 % FTP | `workouts.ts` | ◐ afspraak, nu zo benoemd; drempelblokken begrensd naar lengte (1D) |
| A12 | RPE ↔ %FTP-tabel (RPE 5 = 71–80 %, 7 = 90–104 %, …) | `workouts.ts`, `targets.ts` | ◐ eigen omzetting, nu zo benoemd (1D) |
| A13 | Duurblokken minstens 65 % FTP | `workouts.ts` prompt | ◐ eigen keuze (ronde 2026-09-21) |
| A14 | Naleving 80–115 % is "volgens plan" | `compliance.ts` | ◐ productkeuze, nu zo benoemd (1E) |
| A15 | Wegzakken ≥ 10 %, te hard begonnen ≥ 5 %, ontkoppeling ≥ 5 % (≥ 75 min, VI ≤ 1,10) | `training-advice.ts`, `execution.ts` | ◐ vuistregels; maat ontkoppeling nu onderbouwd in §8 (1E) |

### B. Opbouwregels in de AI-trainingsprompt (fase 1)

| # | Claim | Waar | Status |
|---|---|---|---|
| B1 | Weekvolume groeit ±10 % per opbouwweek, "veilig" | `defaultTrainingPrompt` | ✔ nu "voorzichtige standaard, geen sprongen > 25 %" (1A) |
| B2 | 2–4 opbouwweken, dan een herstelweek | idem | ◐ gangbare praktijk, geen bron |
| B3 | In de piekweek ≥ 85 % van het urenplafond | idem | ◐ eigen keuze |
| B4 | Na > 10 dagen rust lager instappen, ~2 weken terug opbouwen | idem | ✔ in lijn met detraining-literatuur; bron in artikel Opbouwen (1A) |
| B5 | Taper 1–3 weken, volume 40–60 % omlaag, intensiteit en frequentie gelijk | idem + kennisbank | ✔ Bosquet 2007, Wang 2023 |
| B6 | Afremmen alleen bij signalen (TSB, ramp rate, HRV, rust-HR, readiness, RPE) | idem | ◐ zie 1A en 1C |
| B7 | Geen cyclusfase afleiden; reageren op klachten | idem + `symptoms.ts` | ✔ `docs/training-en-cyclus.md` |
| B8 | Lage cadans alleen bij VO2max/sprint | idem | ✔ kennisbank "Lage cadans" |
| B9 | Hittesessie = duurrit, geen drempel/VO2max in hitte | idem | ✔ kennisbank "Hittetraining" |
| B10 | Eén VO2max-/raceprikkel per week bij ZRL | idem | ◐ eigen keuze |

### C. Kennisbank trainen (fase 2) — 8 artikelen, `lib/training/training-library.ts`

| Artikel | Status |
|---|---|
| Lage cadans · Korte intervallen (30/15) · Gepolariseerd of piramidaal · Rustige ritten rustig · Taper · Hittetraining · Ademspiertraining · Koud water na de training | ✔ bronnen en beperkingen in code · nog hertoetsen op 2024–2026 |
| Ontbreekt nog (het bestand zelf noemt ze): lange ritten en variatie, warming-up, FTP-test | onderwerpen liggen in `docs/`, geen artikel |

### D. Voeding (fase 3)

| Onderdeel | Status |
|---|---|
| 25 kennisbankartikelen (`lib/nutrition/library.ts`) | ✔ hertoetst in fase 3; elk artikel heeft nu beperkingen |
| Koolhydraatbanden g/kg per dagtype, eiwit, 40 g eiwit voor het slapen, 1 g/kg koolhydraat voor de rit (`targets.ts`) | ✔ hertoetst in fase 3; getallen gelijk, eiwit voor het slapen nu als hulp voor het dagtotaal |
| Dagtips; regel "nooit minder eten" (`tips.ts`) | ✔ IOC REDs 2023 |
| 13 voedingsprotocollen: cafeïne, bicarbonaat, nitraat, ijsslush, glycerol, koolhydraten laden, bèta-alanine, creatine, darmtraining, herstel na wedstrijd, kersensap, vitamine D, collageen | ✔ `docs/protocollen-onderzoek.md`, `docs/supplementen-onderzoek.md`; hertoetst in fase 3 (bicarbonaat en bèta-alanine bijgesteld) |

### E. Kracht, core en mobiliteit (fase 4)

| Onderdeel | Status |
|---|---|
| 10 krachtartikelen (`strength-library.ts`) | ✔ hertoetst in fase 4; nu 12 artikelen, plus een protocol en een springserie |
| Twee core-/mobiliteitssessies per week als doel (`MOBILITY_SESSIONS_PER_WEEK`) | ◐ eigen keuze, nu zo benoemd in de code (fase 4) |
| Oefeningen en series (in de database, `0109` e.v.) | ✖ beschrijvend, geen bronnen per serie |

### F. Racen en pacing (fase 5)

| # | Claim | Waar | Status |
|---|---|---|---|
| F1 | CP = 0,97 × FTP als alleen FTP bekend is | `pacing/cp.ts` | ✔ nu 1,00 × FTP (fase 5): CP bepaald zoals de app ligt gemiddeld gelijk aan of iets boven FTP; strikte MLSS is een ander getal |
| F2 | W′ standaard 20 kJ, grenzen 5–50 kJ; CP-fit tussen 2 en 20 min | `pacing/cp.ts` | ◐ vuistregel, nu zo benoemd; fitvenster klopt met Leo 2021 (fase 5) |
| F3 | W′bal-herstel volgens Skiba (τ = 546·e^(−0,01·DCP) + 316) | `pacing/w-prime.ts` | ◐ schatting met ~30 % fout in races; reserve vóór de sprint naar 20 % (fase 5) |
| F4 | Durability: CP-afname begrensd op 25 % | `pacing/durability.ts` | ✔ ruim boven gemeten 10–20 %; beperking: rekent met kJ, niet met intensiteit (fase 5) |
| F5 | Race- en ZRL-tips, TTT-kopvermogen | `zrl-analysis/`, `racestrategie-onderzoek.md` | ✔ getoetst op eigen data |
| F6 | Vijf warming-ups per wedstrijdtype | `warming-up-per-wedstrijdtype.md` | ✔ hertoetst in fase 2 (artikel Warming-up) |

### G. Overig (fase 6)

| # | Claim | Waar | Status |
|---|---|---|---|
| G1 | Fiets 8 kg, luchtconstante 0,24, 85 % van het vermogen tegen de zwaartekracht, buiten ×0,88 | `ride-physics.ts` | ✔ binnen de metingen (Lim 2011); Zwift-ijking blijft een eigen keuze (fase 6) |
| G2 | CORE-sensor: doel ~38,5 °C, afwijking t.o.v. rectaal | `protocols/core-temperature.ts` | ◐ sensor wijkt 0,3–0,5 °C af, richting verschilt; vier studies in de protocollen (fase 6) |
| G3 | Teksten op /hulp en in de privacyverklaring | `app/(app)/hulp` | ✔ vijf wetenschappelijke links op /hulp nagelopen; privacy zonder claims (fase 6) |

## Fase 1 — Toets en voorstellen

Fase 1 gaat over A en B: de regels die het schema en het advies sturen. Bij elk
onderdeel staat wat de app doet, wat de literatuur zegt, en een voorstel.
**Goedgekeurd door de eigenaar en uitgevoerd op 2026-10-16** (1A–1E; zie de
rondes in `PLAN.md`).

### 1A. Opbouw: hoe snel, en wanneer afremmen — uitgevoerd 2026-10-16

Wat er is gebouwd, staat in `PLAN.md` (ronde "wetenschappelijke toets 1A").

**Wat de app doet.** De prompt laat het weekvolume per opbouwweek met ±10 %
groeien ("weinig genoeg om de sprong veilig te houden"), met 2–4 opbouwweken en
dan een herstelweek. Na meer dan tien dagen rust moet het lid lager instappen.
TSB-drempels (−10, −25, −40) bepalen de trainingsruimte.

**Wat de literatuur zegt.**
- *De 10 %-regel.* In een RCT met 532 beginnende hardlopers gaf een schema
  volgens de 10 %-regel evenveel blessures als een gewoon schema (20,8 tegen
  20,3 %) — [Buist 2008](https://doi.org/10.1177/0363546507307505). In een cohort
  van 874 beginners hadden wie meer dan 30 % in twee weken opbouwden wél vaker
  overbelastingsblessures, maar dat was verkennend en niet significant —
  [Nielsen 2014](https://doi.org/10.2519/jospt.2014.5164). Beide gaan over
  hardlopen; voor fietsers (geen stootbelasting) is er geen vergelijkbaar
  onderzoek gevonden.
- *Ratio's van belasting.* Er is geen bewijs dat het sturen op een
  acute:chronische belastingsratio blessures voorkomt, en de ratio zelf is
  statistisch zwak — [Impellizzeri 2020](https://doi.org/10.1123/ijspp.2019-0864).
  Dat raakt de prompt indirect: "hoge ramp_rate" is zo'n verhoudingsmaat.
- *Het belastingmodel (CTL/ATL/TSB).* Het onderliggende Banister-model past
  redelijk op groepsniveau, maar de tijdconstanten zijn per sporter erg
  onzeker (95 %-intervallen van bijvoorbeeld 17–59 dagen) —
  [Hellard 2006](https://doi.org/10.1080/02640410500244697). Vaste TSB-drempels
  zijn dus conventie, geen fysiologie.
- *Rust en detraining.* Bij goed getrainde sporters dalen VO2max en
  bloedvolume binnen enkele weken zonder training; stofwisselingsveranderingen
  zijn er al binnen tien dagen, en recent opgebouwde VO2max is na meer dan vier
  weken weg — [Mujika & Padilla 2000](https://doi.org/10.2165/00007256-200030020-00002),
  [2001](https://doi.org/10.1097/00005768-200103000-00013). De tiendagenregel
  is daarmee verdedigbaar.

**Aanvulling (Consensus Pro, 2026-10-16).**
- Een systematische review vond geen verschil in blessurerisico tussen 10 en
  24 % opbouw per week (HR 0,8; 95 %-BI 0,6–1,3); alleen meer dan 30 % sprong
  eruit — [Damsted 2018](https://doi.org/10.26603/ijspt20180931).
- Grote sprongen én een structureel lage belasting gaan samen met meer
  blessures — [Gabbett 2018](https://doi.org/10.1136/bjsports-2018-099784). In een
  jaar lang gevolgde groep duursporters (ook fietsers) was het risico het
  laagst bij weinig pieken en een matige tot hoge belasting over vier weken —
  [Johnston 2019](https://doi.org/10.1123/ijspp.2018-0644).
- Oordeel van de onderzoeksagent: **deels onderbouwd**. "Vermijd grote
  sprongen" klopt, "precies 10 %" niet. Vaste TSB-drempels zijn niet gevalideerd.
- Dit steunt een regel die de prompt al heeft: een opbouwweek nooit onder wat
  het lid nu al rijdt (`recentLoad`). Structureel te laag plannen is volgens deze
  bronnen ook een risico, niet alleen een rem.

**Voorstel.**
1. *Kennisbank*: nieuw artikel **"Opbouwen: hoe snel mag het?"** (categorie
   Intensiteit, of een nieuwe categorie "Belasting"). Over de 10 %-regel (geen
   bewijs, wel een voorzichtige standaard), herstelweken, detraining na een
   pauze, en wat CTL/ATL/TSB wel en niet zeggen. Met bronnen hierboven.
2. *Prompt*: de 10 % blijft als standaard, maar heet niet langer "veilig".
   Voorstel voor de tekst: *"Laat het weekvolume per opbouwweek geleidelijk
   groeien, standaard ongeveer 10 %, en vermijd sprongen van meer dan een kwart.
   Dat is een voorzichtige keuze van ZWB, geen bewezen grens."* Zo trekt het
   model er geen harde conclusies uit in cautions, en ligt de echte grens (grote
   sprongen) vast.
3. *Uitgangspunten-tab*: bij de opbouwregel een link naar het nieuwe artikel
   (het tabblad heeft al `link`). Geen extra tekst in het scherm.
4. *Code*: een bronverwijzing bij de TSB-drempels en de tiendagenregel, zodat
   duidelijk is welke getallen conventie zijn.

**Bewust niet.** De 10 % loslaten of vervangen door een ander getal: er is geen
beter onderbouwd getal, en de regel werkt als rem op grillige AI-uitvoer. De
TSB-drempels per lid fitten: met de onzekerheid uit Hellard levert dat schijnprecisie op.

### 1B. FTP-test — uitgevoerd 2026-10-16

Wat er is gebouwd, staat in `PLAN.md` (ronde "wetenschappelijke toets 1B").
Alle vijf punten zijn uitgevoerd; migratie `0241` moet nog op productie.

**Wat de app doet.** Ramptest (stappen van ~20 W per minuut) → 75 % van de
hoogste minuut. 20-minutentest → 95 % van het gemiddelde. Na acht weken stelt de
AI een nieuwe test voor. De ruwe meting wordt bewaard.

**Wat de literatuur zegt.**
- *20 minuten × 0,95.* Goed herhaalbaar (variatiecoëfficiënt 2,9 %) —
  [Borszcz 2020](https://doi.org/10.1055/a-1018-1965). Op groepsniveau ligt het
  dicht bij MLSS of de lactaatdrempel, maar per renner wijkt het al gauw 10 %
  of meer af — [Borszcz 2019](https://doi.org/10.1123/ijspp.2018-0572),
  [Valenzuela 2018](https://doi.org/10.1123/ijspp.2018-0008). Renners hielden
  "hun FTP" gemiddeld 42 tot 51 minuten vol, niet 60 —
  [Borszcz 2018](https://doi.org/10.1055/s-0044-101546), Gough 2025 (J Sci Cycling).
- *De warming-up telt mee.* Na de klassieke warming-up van 45 minuten met een
  harde blok van vijf minuten reden renners op de 20-minutentest ongeveer 5 %
  minder (256 tegen 270 W) dan na een korte warming-up met een paar
  versnellingen — [Tramontin 2021](https://doi.org/10.1055/a-1524-2312). De
  20-minutentest in de app heeft een opener van vijf minuten op 105–115 %; die
  zit dichter bij de klassieke variant.
  Bij recreatieve renners onderschatte FTP de lactaatdrempel juist (Valenzuela).
  In één studie lag MLSS rond 88 % van het 20-minutengemiddelde, en zag de
  FTP-test een trainingswinst van 12 W op MLSS niet terug —
  [Inglis 2020](https://doi.org/10.1123/ijspp.2019-0214).
- *Ramptest × 0,75.* In deze ronde geen gepeerreviewde validatie gevonden; het
  is een conventie van trainingsplatforms. Wat wél bekend is: een vast
  percentage van piekvermogen valt per persoon heel verschillend uit ten
  opzichte van de drempels (MLSS tussen 44 en 71 % van het piekvermogen in een
  ramptest bij honderd mensen) —
  [Iannetta 2020](https://doi.org/10.1249/MSS.0000000000002147). De uitkomst
  hangt ook af van de opzet van de test —
  [Jamnick 2018](https://doi.org/10.1371/journal.pone.0199794).
- *CP tegenover FTP.* Hangt sterk samen, maar per renner zijn ze niet
  uitwisselbaar (CP gemiddeld 7 W hoger, spreiding −19 tot +33 W) —
  [Karsten 2021](https://doi.org/10.3389/fphys.2020.613151).

**Aanvulling (Consensus Pro, 2026-10-16).**
- *Meetfout.* De 20-minutentest is heel herhaalbaar: een meetfout van ±3 W en
  een kleinste aantoonbare verandering van ±9 W —
  [Lillo-Beviá 2022](https://doi.org/10.1519/jsc.0000000000003403). Bij goed
  getrainde sporters was de typische fout 2,3 % —
  [McGrath 2019](https://doi.org/10.70252/rqoo7391). Een nieuwe FTP die minder
  dan ~3 % afwijkt van de vorige, is dus niet van ruis te onderscheiden.
- *Waar FTP ligt.* MLSS lag gemiddeld op 91 % van het 20-minutengemiddelde
  (Lillo-Beviá), dus net onder de FTP van 95 %. Op FTP hielden renners het
  gemiddeld 34 minuten vol, en FTP bleek geen grens tussen de zware en de
  allerzwaarste inspanning — [Wong 2023](https://doi.org/10.1080/02640414.2023.2176045).
- *Ramptest.* Ook de onderzoeksagent vond geen validatie van 0,75 × de hoogste
  minuut. Het piekvermogen hangt sterk af van hoe snel de test oploopt: bij
  15, 30 en 45 W per minuut was het 272, 304 en 337 W, bij dezelfde VO2max —
  [Azevedo 2023](https://doi.org/10.1152/japplphysiol.00090.2023). De factor
  hoort dus bij één bepaald protocol. Onze ramp (+20 W per minuut) is die van
  Zwift; daarvoor is 0,75 bedacht, maar niet getoetst.
- Oordeel van de onderzoeksagent: als fysiologische drempel **niet
  onderbouwd**; als herhaalbare prestatietest wel bruikbaar.

**Voorstel.**
1. *Kennisbank*: nieuw artikel **"Je FTP: wat de test meet"**: wat beide tests
   doen, hoe groot de fout per renner is, welke test bij wie past, en waarom een
   FTP een schatting is. Hiermee is ook het ontbrekende FTP-artikel uit fase C
   ingevuld.
2. *Functionaliteit, controle na een test*: zet de nieuwe FTP naast wat de app
   al weet: de CP uit de vermogenscurve (`pacing/cp.ts`) en de eFTP van
   intervals.icu. Wijkt hij meer dan een afgesproken marge af (voorstel 8 %),
   dan krijgt de trainer een signaal in de cockpit en het lid een korte regel
   met een link naar het artikel. Een ramptest die bij een explosieve renner te
   hoog uitvalt (de hoogste minuut leunt op de anaerobe reserve), is dan
   zichtbaar voordat het schema erop draait. *Gecorrigeerd 2026-10-16: hier
   stond eerst "uithoudingsrenner"; dat was omgedraaid.*
3. *Prompt*: de achtwekenregel benoemen als eigen keuze ("ZWB stelt na acht
   weken een test voor"), zonder de suggestie dat de FTP dan "verlopen" is.
4. *Testprotocol*: de opener van de 20-minutentest vervangen door drie korte
   versnellingen (Tramontin 2021). Dat geeft een hogere en beter herhaalbare
   uitslag zonder extra testduur. Gevolg: een lid dat opnieuw test, kan een paar
   procent hoger uitkomen zonder echte vooruitgang. Dat staat dan in het artikel.
5. *FTP-historie (nieuw na Consensus Pro)*: een verschil van minder dan 3 % met
   de vorige test tonen als "gelijk gebleven" in plaats van als winst of
   verlies. Het wattage in het schema gaat wel mee; het gaat alleen om wat het
   lid als vooruitgang te zien krijgt.

**Bewust niet.** De factoren 0,75 en 0,95 aanpassen. Er is geen beter
universeel getal: ook 88 % bleef te grillig (Inglis). Een derde testprotocol
(bijvoorbeeld een CP-test met 3, 7 en 12 minuten): dat kan later, maar eerst
moet blijken of de controle uit punt 2 genoeg is.

**Te beslissen.** De marge in punt 2 (voorstel 8 %), of het lid het signaal
ziet of alleen de trainer, en of punt 4 (andere opener) en punt 5 (meetfout in
de historie) meegaan.

### 1C. Herstel: HRV, rust-HR, slaap en readiness — uitgevoerd 2026-10-16

Wat er is gebouwd, staat in `PLAN.md` (ronde "wetenschappelijke toets 1C"). De
puntentelling werd 15 per band in plaats van 20, na kalibratie op een
gangbare halve band van ~8 %; op productie bleek die 9–12 %.

**Wat de app doet.** Het 7-daags gemiddelde van HRV en rust-HR wordt vergeleken
met een gemiddelde over 30 dagen, waarin die 7 dagen zelf meetellen. Vaste
grenzen: HRV < 90 % is vermoeid, > 105 % is fris; rust-HR > +3 slagen is
vermoeid. Zonder readiness van het apparaat rekent ZWB er zelf een uit, met eigen
gewichten. Bij een diep negatieve TSB en een HRV boven de baseline wordt
"herstel voorrang" verzacht tot "voorzichtig", omdat het lichaam het "verwerkt".

**Wat de literatuur zegt.**
- *Nut.* Trainen op HRV geeft een klein voordeel in prestatie en minder
  non-responders dan een vast schema —
  [Manresa-Rocamora 2021](https://doi.org/10.3390/ijerph181910299),
  [Düking 2021](https://doi.org/10.1016/j.jsams.2021.04.012),
  [Granero-Gallegos 2020](https://doi.org/10.3390/ijerph17217999). Bij goed
  getrainde wielrenners deed een HRV-gestuurd schema het minstens zo goed als
  periodisering — [Javaloyes 2019](https://doi.org/10.1123/ijspp.2018-0122),
  [2020](https://doi.org/10.1519/JSC.0000000000003337).
- *Methode.* Gangbaar is de logaritme van rMSSD (ln rMSSD), als rollend
  gemiddelde over zeven dagen, afgezet tegen een persoonlijke "normale band"
  die rekening houdt met de dagelijkse ruis (de kleinste relevante verandering)
  — [Plews 2012](https://doi.org/10.1007/s00421-012-2354-4),
  [Plews 2013](https://doi.org/10.1007/s40279-013-0071-8),
  [Buchheit 2014](https://doi.org/10.3389/fphys.2014.00073). Vaste percentages
  doen dat niet: bij een lid met veel dagelijkse ruis is 10 % niets, bij een
  stabiel lid is het veel.
- *Een stijgende HRV is niet altijd goed nieuws.* Bij triatleten die bewust
  overbelast werden, steeg ln rMSSD juist tijdens de overbelasting —
  [Le Meur 2013](https://doi.org/10.1249/MSS.0b013e3182980125). Ook bij
  topsporters gingen stijging én daling samen met slechte aanpassing (Plews
  2013). Dat ondergraaft de verzachtingsregel (A9).
- *Slaap.* Acuut slaaptekort (≤ 6 uur) kost gemiddeld zo'n 7,6 % prestatie; het
  meeste bij doorhalen en vroeg opstaan, het minst bij ochtendtraining —
  [Craven 2022](https://doi.org/10.1007/s40279-022-01706-y). De richting van de
  slaapstaffel klopt.

**Aanvulling (Consensus Pro, 2026-10-16).**
- In een meta-analyse steeg de rust-rMSSD licht, zowel als prestaties
  verbeterden als bij overreaching met slechtere prestaties —
  [Bellenger 2016](https://doi.org/10.1007/s40279-016-0484-2).
- Een tweede meta-analyse: over een week gemiddeld steeg de HRV bij
  functioneel overbelaste sporters juist duidelijk (SMD 0,81; 95 %-BI
  0,35–1,26) — [Manresa-Rocamora 2021b](https://doi.org/10.1111/sms.13932).
  Precies het weekgemiddelde dat de app gebruikt, kan dus omhoog gaan bij
  overbelasting.
- Bij recreatieve fietsers en triatleten veranderde de rust-HRV niet na drie
  weken overbelasting, terwijl hun prestatie daalde —
  [Coates 2018](https://doi.org/10.1080/17461391.2018.1458907). HRV alleen mist
  het dan.
- Bij ervaren fietsers werkte sturen op HRV + rusthartslag + welbevinden beter
  dan op HRV alleen — [Alfonso 2025](https://doi.org/10.1038/s41598-025-13540-z).
  De gangbare beslisregel ("binnen de kleinste relevante verandering, dan
  zwaar; anders rustig") komt uit
  [Vesterinen 2016](https://doi.org/10.1249/MSS.0000000000000910).
- Oordeel van de onderzoeksagent: **deels onderbouwd**. Hoge HRV bij zware
  belasting is reden om op te letten, niet om gerust te zijn.

**Gevonden in de code, los van de literatuur.**
- *Twee baselines.* De pagina's rekenen met 30 dagen data, maar de AI en de
  coachchat krijgen via `getWellnessSummary()` standaard 21 dagen. Het "30-daagse"
  baseline is daar dus 21 dagen. Hetzelfde lid kan op de pagina "normaal" zijn
  en voor de AI "vermoeid".
- *Baseline bevat de laatste week.* Daardoor trekt een vermoeide week zijn eigen
  maatstaf mee omlaag en wordt het signaal kleiner.
- *SDNN als terugval.* `hrv ?? hrvSDNN`: levert een bron op een dag alleen SDNN,
  dan komt een andere maat in hetzelfde gemiddelde terecht.

**Voorstel.**
1. *Functionaliteit, rekenwijze*: overstappen op ln rMSSD. Het 7-daags gemiddelde
   wordt vergeleken met een normale band uit de ~30 dagen *daarvóór*:
   gemiddelde ± 0,5 × standaardafwijking. Daaronder is vermoeid; binnen de band
   is normaal. Rust-HR op dezelfde manier, in plaats van +3 slagen.
   `deriveReadiness` gaat uit van hoeveel banden het lid afwijkt in plaats van
   ×200 en ×300. De drempels die de rest van de app gebruikt (≤ 50, < 70, ≥ 75)
   blijven staan.
2. *Fout herstellen*: één venster voor pagina, AI en chat (het 21-dagenverschil)
   en geen SDNN in een rMSSD-reeks.
3. *Verzachtingsregel bijstellen*: alleen verzachten als HRV *binnen* de band
   ligt en rust-HR niet verhoogd is. Een HRV ver boven de band bij een diep
   negatieve TSB telt als "niet geruststellend" in plaats van als bewijs van
   aanpassing.
4. *Kennisbank*: nieuw artikel **"Herstel meten: HRV, rusthartslag en slaap"**,
   met wat een horloge meet, waarom de eigen band telt en niet een vast getal,
   waarom één ochtend niets zegt, en de valkuil van een stijgende HRV.
5. *Tests*: de bestaande `wellness.test.ts` uitbreiden met de band, de
   uitzondering bij hoge HRV, en één venster.
6. *Gevoel meewegen (nieuw na Consensus Pro, te beslissen)*: de app kent het
   gevoel en de RPE die het lid na een rit invult, en het klachtenlogboek. Nu
   ziet alleen de AI die. Voorstel: in `summarizeTrainingReadiness` een slecht
   gevoel of hoge RPE van de laatste dagen laten tellen naast HRV en rust-HR, zoals
   Alfonso 2025. Dat raakt de readiness die het lid ziet, dus eerst jouw keuze.

**Bewust niet.** Dagelijks automatisch voorschrijven op HRV (zoals Javaloyes):
de dag-coach doet dat al grof, en meer sturing op één signaal past niet bij de
voorzichtige insteek. Een eigen readiness voor leden zonder HRV blijft
uitgesloten (al zo besloten).

**Niet lokaal te verifiëren.** Hoeveel leden door de nieuwe band anders worden
ingedeeld. Dat kan alleen met een leesquery op `profile_wellness` op productie,
en die draai ik pas na akkoord.

### 1D. Zones, trainingsvormen en RPE — uitgevoerd 2026-10-16

Wat er is gebouwd, staat in `PLAN.md` (ronde "wetenschappelijke toets 1D").

**Wat de app doet.** Zes Zwift-zones in %FTP (keuze van de eigenaar,
2026-09-15). Trainingsvormen als taal: rustige duur 61–70 %, intensieve duur
71–80 %, tempo 81–86 %, sweet spot 87–89 %, drempel 90–104 %. Een vaste RPE-tabel
erbij.

**Wat de literatuur zegt.** Intensiteit voorschrijven als vast percentage van
een ankerwaarde verdeelt mensen ongelijk over de fysiologische domeinen
(Iannetta 2020). FTP is als anker beter dan een maximum, omdat het zelf al dicht
bij een drempel ligt (Valenzuela 2018). Maar als MLSS rond 88–93 % van FTP ligt
(Inglis 2020), dan is "drempel tot 104 %" voor een deel van de renners al boven
hun steady state. De zonegrenzen zelf komen uit trainingsliteratuur van Coggan
en Zwift, niet uit gepeerreviewd onderzoek. Sessie-RPE is een goede maat voor
belasting (zie `racestrategie-onderzoek.md` §8), maar de omzetting RPE ↔ %FTP
verschilt per renner.

**Aanvulling (Consensus Pro, 2026-10-16).** MLSS ligt gemiddeld rond 93–96 %
van FTP (Inglis 2020; Lillo-Beviá 2022), met een spreiding van ±10 % per renner.
Op FTP zelf hielden renners het gemiddeld 34 minuten vol (Wong 2023). Een
drempelblok van 20 minuten op 100–104 % ligt voor een groot deel van de renners
dus boven hun steady state. Een onderbouwde omzetting van RPE naar %FTP bestaat
niet. Bij 85 % FTP lagen hartslag, lactaat en RPE al op "zwaar", hoger dan de
zone doet vermoeden; de auteurs raden aan hartslag en RPE naast de FTP-zones te
gebruiken — [Denham 2026](https://doi.org/10.1080/02640414.2026.2673477). En
wie de trainingsverdeling op RPE meet, krijgt bij wielrenners een heel ander
beeld dan op vermogen of hartslag —
[Sanders 2017](https://doi.org/10.1123/ijspp.2016-0523). Oordeel van de onderzoeksagent: als universele zonegrens **niet
onderbouwd**; bruikbaar als startpunt dat je bijstelt op hartslag, RPE en of
het blok lukt.

**Voorstel.**
1. *Kennisbank*: artikel **"Zones: een afspraak, geen grens in je lijf"**: waar
   de zones vandaan komen, wat de domeinen zijn, waarom dezelfde %FTP voor twee
   renners iets anders betekent, en hoe RPE en hartslag helpen.
2. *Prompt, aangescherpt na Consensus Pro*: de lengte van het blok bepaalt de
   bovengrens. Blokken van 15 minuten of langer op 90–95 % FTP, kortere
   drempelblokken tot 100 %, en boven 100 % alleen in blokken van hooguit
   8 minuten (over-unders, VO2max). De zone en de kleur blijven gelijk; alleen
   het doel binnen de zone verschuift.
3. *Code*: bij `INTENSITY_FTP_RANGE` en de RPE-tabel noteren dat dit een
   afspraak is, met verwijzing naar dit document.

**Bewust niet.** De zonegrenzen zelf veranderen: ze sluiten aan op Zwift en de
blokkleuren, en dat was een bewuste keuze. Zones op hartslag of lactaat: daar
heeft de app de data niet voor.

### 1E. Trainingsanalyse en naleving — uitgevoerd 2026-10-16

**Wat de app doet.** Drempels voor wegzakken, te hard beginnen, ontkoppeling en
naleving. Die zijn al als vuistregels onderbouwd en op eigen data getoetst
(`racestrategie-onderzoek.md` §8, §10, §11).

**Wat de literatuur toevoegt.** De ontkoppeling van hartslag en vermogen hangt
sterk samen met hoeveel de eerste drempel zakt tijdens een lange rit (r = −0,76
bij 51 renners) — [Rothschild 2025](https://doi.org/10.1007/s00421-025-05815-0).
Dat steunt ontkoppeling als maat voor duurvermogen ("durability"). Warmte,
voeding en de opzet van de rit beïnvloeden de meting —
[Hunter 2025](https://doi.org/10.1113/EP092120).

**Aanvulling (Consensus Pro, 2026-10-16).** De onderzoeksagent vond geen
gevalideerde grens voor ontkoppeling, en miste Rothschild 2025. Eigen zoekwerk
vond wel steun voor de maat zelf:
- Na twee uur matig fietsen zakte het vermogen op de eerste drempel met ~10 % —
  [Stevenson 2023](https://doi.org/10.1007/s00421-023-05285-2). Dat is wat
  ontkoppeling zichtbaar maakt.
- Bij een maandelijkse test van 60 minuten op 75 % FTP volgden ontkoppeling en
  hartslagdrift betrouwbaar of renners op hun training reageerden —
  [Barsumyan 2025](https://doi.org/10.3389/frai.2025.1623384). Ontkoppeling
  hing ook samen met dalende cadans —
  [Barsumyan 2026](https://doi.org/10.1186/s13102-026-01678-w).
- Oordeel: de maat is bruikbaar, de grens van 5 % blijft een vuistregel. De
  vergelijking is het eerlijkst onder gelijke omstandigheden: binnen, dezelfde
  duur en intensiteit, met voeding.

**Voorstel.**
1. *Docs*: Rothschild 2025 en Hunter 2025 toevoegen aan
   `racestrategie-onderzoek.md` §8 als steun voor de ontkoppelingsregel.
2. *Kennisbank*: geen los artikel nu; dit gaat mee in fase 2 bij het artikel
   **"Lange ritten en duurvermogen"**.
3. *Naleving 80–115 %*: blijft; in de code noteren dat dit een productkeuze is.
4. *Idee voor fase 2 (nieuw na Consensus Pro)*: een protocol "Duurtest": eens per
   maand 60 minuten op 75 % FTP in Zwift (ERG-modus), naar Barsumyan. Omdat de
   omstandigheden steeds gelijk zijn, laat de ontkoppeling over de maanden dan
   echt zien of het duurvermogen groeit. Past in de bestaande protocollen en
   vraagt geen nieuwe meting.

**Bewust niet.** Drempels aanpassen: ze zijn op eigen data afgesteld, en de
literatuur geeft geen betere getallen.

## Fase 2 — Kennisbank trainen

Opgesteld 2026-10-16. **Goedgekeurd door de eigenaar en uitgevoerd op
2026-10-16** (2A, 2B, 2C en de taperregel uit 2D); wat er is gebouwd en wat
bewust niet, staat in `PLAN.md` (ronde "wetenschappelijke toets fase 2").
Oorspronkelijk voorstel: Bronnen gezocht met de
onderzoeksagent van Consensus Pro (artikelen 1–4; ruw rapport in
`docs/consensus/`) en met de gewone Pro-zoekfunctie (artikelen 5–8, de nieuwe
artikelen en de duurtest). DOI's komen uit Consensus. **Elke bron wordt bij
uitvoering eerst in PubMed bevestigd**, zoals afgesproken na fase 1.

Fase 2 heeft drie delen:

- **2A**: de acht bestaande artikelen hertoetsen.
- **2B**: twee artikelen die ontbreken.
- **2C**: het protocol Duurtest.

### 2A. De acht bestaande artikelen

| Artikel | Oordeel | Wat verandert |
|---|---|---|
| Lage cadans | ongewijzigd | Geen nieuwe proef bij mannen, ouderen of op tempo/drempel. In de beperkingen komt dat dit nog altijd één proef bij jonge vrouwen is. |
| Korte intervallen (30/15) | getallen bijwerken | Zie hieronder: het voordeel hangt af van hoe je de blokken rijdt. |
| Gepolariseerd of piramidaal | **bewering herzien** | Zie hieronder: geen verschil, en voor recreanten eerder piramidaal. |
| Rustige ritten rustig | **bewering herzien** | Zie hieronder: gepland tempo-werk is nuttig, onbedoeld tempo op een rustige dag blijft de valkuil. |
| Taper | aanvullen | Zie hieronder: een korte overbelasting vóór de taper helpt. |
| Hittetraining | **bewering herzien** | Zie hieronder: thuis met extra kleding is wél onderzocht, er zijn data voor vrouwen, en de winst verdwijnt binnen twee weken. |
| Ademspiertraining | getallen bijwerken | Zie hieronder. |
| Koud water na de training | getallen bijwerken | Zie hieronder: de meta-analyse bevestigt het artikel. |

**Korte intervallen.**
- *Steun voor het mechanisme*: 30/15 gaf meer tijd boven 90 % VO2max dan
  constant rijden (1123 tegen 879 s), bij mannen én vrouwen
  ([Urianstad 2024](https://doi.org/10.1002/ejsc.12214)).
- *De inperking*: een Duitse groep (met Rønnestad als coauteur, dus niet
  onafhankelijk) vond dat voordeel alleen bij
  een vast vermogen, niet als renners zelf voluit reden
  ([Appelhans 2025](https://doi.org/10.1123/ijspp.2024-0115)).
- *Voor ZWB*: het voordeel geldt dus juist in ERG-modus op Zwift. Dat komt als
  punt in het artikel.
- *Meta-analyse*: bij getrainde fietsers wint geen intervallengte duidelijk
  ([Norte 2024](https://doi.org/10.47206/ijsc.v4i1.271)).

**Gepolariseerd of piramidaal.**
- Een netwerk-meta-analyse op individuele deelnemersdata vond geen verschil
  tussen gepolariseerd en piramidaal voor VO2max of tijdrit.
- Competitieve sporters leken meer te hebben aan gepolariseerd, recreanten aan
  piramidaal ([Rosenblat 2025](https://doi.org/10.1007/s40279-024-02149-3)).
- Bij matig getrainde fietsers voegde extra matige training naast HIIT niets
  toe ([Moran-MacDonald 2026](https://doi.org/10.1007/s00421-026-06380-w)).
- *Voor ZWB*: de huidige regel "ZWB schrijft geen verdeling voor" blijft staan
  en heeft nu meer steun. De zin over een klein voordeel voor gepolariseerd
  krijgt de nuance voor recreanten.

**Rustige ritten rustig.**
- Bij goed getrainde fietsers verbeterde een blok met gematigde intervallen
  (rond tempo) de drempel meer dan een blok met hoge intensiteit (+4,5 tegen
  +2,1 %) ([Rønnestad 2025](https://doi.org/10.1002/ejsc.70067)).
- Bij gelijke arbeid vermoeide een zware intervalsessie meer dan een rustige
  duurrit ([Barranco-Gil 2024](https://doi.org/10.1123/ijspp.2023-0287)).
- Bij elite-fietsers kon het matige volume met een derde omlaag zonder verlies
  op de tijdrit ([Christensen 2023](https://doi.org/10.1111/sms.14362)).
- *Voor het artikel*: gepland tempo- en sweet-spotwerk is nuttig; de valkuil is
  een rustige dag die ongemerkt tempo wordt.
- *Voor ZWB*: de trainersuggestie "duurrit werd tempo" blijft dus terecht,
  maar de toon in het artikel wordt minder absoluut.

**Taper.**
- Bij elite-fietsers werkte zes dagen overbelasting gevolgd door vijf dagen
  taper beter dan alleen elf dagen taper
  ([Rønnestad 2019](https://doi.org/10.1111/sms.13536)).
- Wang 2023 vond hetzelfde: een taper na een korte overbelasting werkt beter.
  De 41–60 % en de "hooguit drie weken" blijven staan.
- *Voor ZWB*: één zin in het artikel, en een voorstel voor de prompt (zie 2D).

**Hittetraining.**
- *Vrouwen*: vijf weken gaf bij vrouwen +4,0 % en bij mannen +3,5 %
  hemoglobinemassa, met betere prestaties in normale temperatuur
  ([Lundby 2023](https://doi.org/10.1152/japplphysiol.00115.2023)).
- *Thuis met extra kleding*: bij getrainde vrouwen werkte tien dagen thuis
  fietsen met extra kleding voor acclimatisatie, maar het verhoogde de
  hemoglobine niet ([Richard 2025](https://doi.org/10.14814/phy2.70631)). Een
  thermopak werkte even goed als een hittekamer
  ([Lundby 2021](https://doi.org/10.1016/j.jsams.2021.06.005)).
- *Afbouw*: twee weken na het stoppen waren hemoglobine en hitteprestatie
  terug bij af ([Cubel 2024](https://doi.org/10.1080/23328940.2024.2383505)).
  Drie sessies per week hielden de winst na een hoogtestage vast
  ([Rønnestad 2024](https://doi.org/10.1249/mss.0000000000003542)).
- *Te herstellen*: het artikel zegt nu dat thuis met extra kleding niet is
  onderzocht. Dat klopt niet meer.
- *Voor ZWB*: het protocol "Hittetraining voor meer hemoglobine" krijgt in de
  beperkingen de afbouw van twee weken, en in de onderhoudsfase de bron voor
  drie keer per week.

**Ademspiertraining.**
- Een meta-analyse vond een gematigd effect op sportprestatie (SMD 0,64)
  ([Karsten 2018](https://doi.org/10.1016/j.ptsp.2018.09.004)).
- Een recente proef met een placebogroep vond bij gezonde jonge mannen na vier
  weken geen winst boven die placebo
  ([Notter 2023](https://doi.org/10.1038/s41598-023-41580-w)).
- Bij fietsers gaf zes weken 2,7 % op een tijdrit van 25 km
  ([Johnson 2007](https://doi.org/10.1007/s00421-007-0551-3)).
- *Voor het artikel*: het blijft "matig bewijs"; de beperkingen krijgen de
  placeboproef erbij.

**Koud water na de training.**
- De meta-analyse bevestigt het artikel: geen effect op duurprestatie (SMD
  −0,07), wel minder krachtwinst (SMD −0,60)
  ([Malta 2021](https://doi.org/10.1007/s40279-020-01362-0)).
- *Uitgevoerd*: Norte 2024 staat niet in PubMed en is niet gebruikt.
- *Voor het artikel*: de getallen erbij, verder ongewijzigd.

### 2B. Twee artikelen die ontbreken

**"Lange ritten en duurvermogen"** (categorie Intensiteit).
- *Basis*: het onderzoek van 2026-10-11 in `lange-ritten-variatie.md`.
- *Aanvullingen*:
  - Bij amateurs verloren de betere renners na 1000 kJ half zoveel op 20
    minuten (6,5 tegen 12,5 %) ([Barsumyan 2025](https://doi.org/10.3389/fspor.2025.1530162)).
  - Duurvermogen bepaalt hoeveel je 5-minutenvermogen zakt na een lange rit
    ([Hamilton 2024](https://doi.org/10.1007/s00421-024-05459-6)).
  - Harde inspanning kost per kilojoule meer dan rustige
    ([Sánchez-Jiménez 2025](https://doi.org/10.1007/s00421-025-05885-0)).
  - Wat het traint (review): jarenlang volume, lange ritten met intensiteit
    aan het eind, en krachttraining
    ([Jones 2025](https://doi.org/10.1111/sms.70032)).
- *In de app*: de elf lange ritten in de workoutbibliotheek linken ernaar.
  *Anders uitgevoerd*: geen link per template (de bibliotheek staat in de
  database); het artikel staat in de kennisbank en het protocol Duurtest linkt
  ernaar.

**"Warming-up"** (categorie Opbouw en piek).
- *Basis*: `warming-up-per-wedstrijdtype.md`.
- *Aanvullingen*:
  - Een meta-analyse vond geen bewijs dat potentiëring (korte harde
    activaties) duurprestaties verbetert
    ([Vasconcelos 2023](https://doi.org/10.1249/mss.0000000000003308)).
  - Voor een tijdrit van 20 minuten maakte de warming-up per saldo niets uit;
    met sprints begon je alleen harder
    ([Barranco-Gil 2020](https://doi.org/10.1123/ijspp.2019-0554)).
  - Voor 3 km scheelde een warming-up 2,8 %
    ([Hajoglou 2005](https://doi.org/10.1249/01.mss.0000177589.02381.0a)).
- *Boodschap*: hoe korter en harder de wedstrijd, hoe meer de warming-up telt.
  Voor lange wedstrijden volstaat kort.
- *In de app*: de warming-ups bij een race linken ernaar.
- *Bijvangst voor fase 3*: een warming-up met sprints maakte het effect van
  bicarbonaat ongedaan ([Gurton 2021](https://doi.org/10.1123/ijspp.2020-0743)).
  Dat hoort bij het protocol Bicarbonaat.

### 2C. Protocol "Duurtest"

**Wat het lid doet.** Zestien weken lang, eens per vier weken, dezelfde rit:

- 10 minuten inrijden, 60 minuten op 75 % FTP in ERG-modus, 5 minuten
  uitrijden;
- met de ventilator, het eten en het drinken telkens hetzelfde.

Het protocol is een kopie van Barsumyan
([2025](https://doi.org/10.3389/frai.2025.1623384),
[2026](https://doi.org/10.1186/s13102-026-01678-w)). Bij 17–20 getrainde
fietsers volgden ontkoppeling en hartslagdrift over vijf maanden betrouwbaar of
iemand op de training reageerde.

**Wat de app ermee doet.**
1. Een protocol in `lib/protocols/training.ts`, met bewijs "beperkt" en vier
   fases van 28 dagen met elk één taak. Een `aiHint` laat de AI de rit één
   keer per fase inplannen op een rustige dag, nooit direct na een
   sleutelsessie.
2. **Meten**: de ontkoppeling over precies het blok van 60 minuten. Nu rekent
   `execution.ts` alleen bij ritten vanaf 75 minuten, over de hele rit vanaf
   minuut 10, uitrijden inbegrepen. Een rit die net te vroeg stopt, valt daar
   buiten. Voor de duurtest komt er een eigen berekening over het werkblok.
3. **Tonen**: op de protocolpagina een rijtje per test (datum, ontkoppeling,
   gemiddelde hartslag), met de trend. Een kleinere ontkoppeling bij hetzelfde
   vermogen is vooruitgang. Geen grens en geen oordeel per test.
4. Een kort kennisbankstuk via het artikel "Lange ritten en duurvermogen".

**Wat het vraagt.** Hartslag en vermogen per seconde, dus een rit die
rechtstreeks in intervals.icu staat. Ritten die alleen via Strava binnenkomen,
hebben die stream niet. Dat staat dan in de beperkingen van het protocol.

**Bewust niet.**
- *De Lamberts Submaximal Cycle Test*: kort, goed gevalideerd en betrouwbaar
  ([Lamberts 2009](https://doi.org/10.1136/bjsm.2009.061325)). Maar hij stuurt
  op vaste hartslagen, en Zwift kan geen ERG op hartslag. Hij meet ook vorm en
  vermoeidheid, geen duurvermogen.
- *Een grens of advies per test*: de onderzoekers gebruikten de trend, niet
  een drempel.

**Migratie?** Niet nodig gebleken. De blokmeting staat als `steady` in
`metrics_json.execution`; een Duurtest wordt herkend aan de titel van de
geplande training. De meting slaat de eerste 5 minuten van het blok over (de
hartslag loopt dan nog op), dus het zijn 55 gemeten minuten.

### 2D. Kleine aanpassingen in de app die uit 2A volgen

- **Prompt, korte intervallen**: geen wijziging. ERG is al de standaard op
  Zwift, en het artikel legt uit waarom dat telt.
- **Prompt, taper**: bij een A-mikpunt mag de week vóór de taper een korte,
  zware overbelasting krijgen, maar alleen als de herstelwaarden het toelaten.
  Dat is een gedragswijziging; **goedgekeurd en in de prompt gezet**.
- **Protocol hitte**: de beperkingen bijwerken (zie Hittetraining hierboven).
- **Bibliotheek**: de lange ritten en de warming-ups linken naar hun nieuwe
  artikel.

### Besluit eigenaar (2026-10-16)

"Akkoord met 2A, 2B en 2C (Duurtest met eigen meting en trend), en neem de
korte overbelasting vóór de taper op in de prompt."

## Fase 3 — Kennisbank voeding

Opgesteld 2026-10-16. **Goedgekeurd door de eigenaar ("ja op alles") en
uitgevoerd op 2026-10-16**: 3A–3D, de herformulering van de tip, en
beperkingen bij alle 25 artikelen. Wat er is gebouwd, staat in `PLAN.md` (ronde
"wetenschappelijke toets fase 3"). Oorspronkelijk voorstel:

**Hoe gezocht.**
- De onderzoeksagent van Consensus Pro kreeg alle 31 voedingsregels. Hij
  behandelde alleen koolhydraten en eiwit (regels 1–8) en noemde de rest
  "onvoldoende in deze set". Het ruwe rapport staat in `docs/consensus/`.
- De overige regels heb ik gericht gezocht met de Pro-zoekfunctie.
- Alle 32 nieuwe bronnen hieronder staan in PubMed, met deze DOI's.

**Het beeld.** De voedingskennisbank leunt op de UCI-stukken van 2025–2026 en is
grotendeels actueel. Het gat zit op drie plekken:
- **Eiwit wordt te stellig gebracht**, vooral de portie voor het slapen.
- **Twee beperkingen in protocollen kloppen niet meer**: bicarbonaat en
  bèta-alanine.
- **De voedingsartikelen missen een lijst beperkingen.** De trainings- en
  krachtartikelen hebben die wel.

### 3A. Doelen en tips (`targets.ts`, `tips.ts`)

| Regel | Oordeel | Wat verandert |
|---|---|---|
| Koolhydraten per dag naar dagtype (3–5 … 8–12 g/kg) | klopt | Niets. Train-low gaf bij goed getrainde fietsers in vijf weken geen betere prestatie dan evenveel energie met veel koolhydraten ([Prieto-Bellver 2024](https://doi.org/10.3390/nu16020318)). |
| Eiwit 1,6–2,1 g/kg per dag | klopt | Bron erbij: ~1,8 g/kg als midden, boven 2,0 op rustdagen en bij weinig koolhydraten ([Witard 2025](https://doi.org/10.1007/s40279-025-02203-8)). |
| Eiwit per maaltijd 0,3–0,4 g/kg | **bijstellen** | De portie blijft als richtgetal. De tekst wordt: dit is geen plafond. 100 g eiwit gaf een grotere en langere aanmaak dan 25 g ([Trommelen 2023](https://doi.org/10.1016/j.xcrm.2023.101324)). Verdelen helpt vooral om je dagtotaal te halen. |
| 40 g eiwit voor het slapen | **bijstellen** | Het verhoogt de eiwitaanmaak 's nachts ([Trommelen 2023](https://doi.org/10.1007/s40279-023-01822-3), al bron). Maar bij U23-profs die al ruim 2,5 g/kg aten, gaf het geen beter herstel of betere prestatie ([Valenzuela 2023](https://doi.org/10.1080/15502783.2023.2166366)). De tip na een avondrit zegt nu dat het je spieren 's nachts helpt herstellen. Voorstel: hij zegt dat het een makkelijke manier is om je dagtotaal te halen als er na de rit weinig tijd is. |
| Koolhydraten per uur (30–60 tot 2,5 uur, daarna 60–90) | klopt, tekst aanvullen | De banden blijven. 120 g/u beperkte bij getrainde renners de daling van hun CP na 3 uur meer dan 60 g/u ([Norte 2026](https://doi.org/10.1111/sms.70326)). Bij recreanten werkte 40 g/u na 90 minuten beter dan 90 g/u ([Fleitas-Paniagua 2026](https://doi.org/10.1111/sms.70288)). Drank, gel of reep: gelijk ([Hearris 2022](https://doi.org/10.1152/japplphysiol.00091.2022)). Boodschap: meer is niet vanzelf beter. |
| Snel herstel: 1,0–1,2 g/kg/u koolhydraten, eiwit erbij | **bijstellen** | De koolhydraten blijven. Bij genoeg koolhydraten gaf eiwit erbij vijf uur later geen betere tijdrit ([Sollie 2023](https://doi.org/10.1111/sms.14364)) en geen snellere glycogeenaanvulling ([Witard 2025](https://doi.org/10.1007/s40279-025-02203-8)). Eiwit blijft in het herstelmoment voor het dagtotaal; de tekst belooft niet langer sneller aanvullen. |
| Drink zo dat je niet meer dan ~2 % verliest | **bijstellen** | Tot anderhalf uur bij gewone temperatuur volstaat drinken op dorst; vooraf plannen loont bij lange of warme ritten ([Goulet 2019](https://doi.org/10.1007/s40279-018-01051-z), [Kenefick 2018](https://doi.org/10.1007/s40279-017-0844-6)). |

### 3B. Supplementprotocollen (`lib/protocols/nutrition.ts`)

| Protocol | Oordeel | Wat verandert |
|---|---|---|
| Cafeïne 3–6 mg/kg | klopt | Gewenning aan koffie maakt het effect niet kleiner ([Carvalho 2022](https://doi.org/10.1007/s40279-022-01685-0)). Het werkt bij vrouwen ([Zhu 2026](https://doi.org/10.3389/fnut.2026.1876198), lage zekerheid). "Een lage dosis werkt ook" wordt "werkt mogelijk ook, minder zeker": bij fietsers was 1–3 mg/kg niet significant ([Chen 2024](https://doi.org/10.1080/15502783.2024.2363789)). |
| Natriumbicarbonaat | **bewering herzien** | De beperking "bij een lange vlakke tijdrit is het effect klein" klopt niet meer: 16 km ([Leach 2023](https://doi.org/10.1249/MSS.0000000000003263)) en 40 km ([Shannon 2024](https://doi.org/10.1007/s00421-024-05567-3)) gingen sneller. Het venster van 90–180 minuten blijft: een vaste tijd werkt, persoonlijke timing is met capsules niet nodig ([de Oliveira 2020](https://doi.org/10.1249/MSS.0000000000002313); eerder hier als "Saunders 2020" genoemd, maar Saunders is tweede auteur). Nieuw bij aandachtspunten: een warming-up met sprints maakte de winst in één proef ongedaan ([Gurton 2021](https://doi.org/10.1123/ijspp.2020-0743)), de bijvangst uit fase 2. |
| Nitraat | klopt | Bron erbij: vooral bij minstens 6 mmol over meer dan drie dagen ([Poon 2025](https://doi.org/10.1007/s40279-025-02194-6)); bij topsporters geen effect op VO2max ([Qin 2026](https://doi.org/10.3389/fnut.2026.1858216)). |
| IJsslush | klopt | Bron erbij: ijs drinken verbetert prestatie niet consequent; spoelen met menthol wel ([Roriz 2022](https://doi.org/10.3389/fnut.2022.959516)). Dat staat al in de beperkingen. |
| Bèta-alanine | **bijstellen** | "Inspanningen van één tot vier minuten" wordt "van een halve tot tien minuten, het sterkst rond vier tot tien". Effect na vier weken, sterker bij 5,6–6,4 g ([Georgiou 2024](https://doi.org/10.1123/ijsnem.2024-0027)). |
| Creatine | klopt | Bronnen erbij: geen effect op duurprestatie ([Fernández-Landa 2023](https://doi.org/10.1007/s40279-023-01823-2)), ook niet bij U23-profs op stage ([Barranco-Gil 2024](https://doi.org/10.1080/15502783.2024.2340574)). Mogelijk wel bij versnellingen en een eindsprint ([Forbes 2023](https://doi.org/10.1080/15502783.2023.2204071)). |
| Kersensap | klopt | Bronnen erbij: sneller herstel van kracht, met lage tot matige zekerheid ([Daab 2026](https://doi.org/10.1186/s40798-026-00993-3)); poeder werkte opnieuw niet ([Hagele 2026](https://doi.org/10.3390/nu18030443)). |
| Collageen | klopt (beperkt) | Proeven spreken elkaar tegen: 5 g gaf een dikkere pees ([Jerger 2022](https://doi.org/10.1111/sms.14164)), 15 g niet ([Balshaw 2023](https://doi.org/10.1249/MSS.0000000000003242)). Dat komt in de beperkingen. |
| Darmtraining | aanvullen | Beperking "betere prestatie boven 90 g/u niet aangetoond" wordt genuanceerd met Norte 2026 (minder verlies van CP na 3 uur). |
| Herstellen na een wedstrijd | aanvullen | Beperking krijgt Sollie 2023 erbij (zie 3A). |
| Glycerol, vitamine D, koolhydraten laden | niet opnieuw gezocht | Geen nieuwe aanleiding; bronnen ongewijzigd. |

### 3C. Artikelen (`lib/nutrition/library.ts`)

Bijwerken volgens 3A en 3B: **Eiwit**, **Herstel tussen sessies**, **Brandstof
volgens de training** (train-low), **Koolhydraten tijdens de rit**, **Vocht en
zout**, **Supplementen**, **Kersensap**, **Collageen**. Daarnaast:

- **Ketonen**: "geen effect op prestatie" klopt voor een drankje vlak voor of
  tijdens de wedstrijd ([Brooks 2022](https://doi.org/10.1123/ijsnem.2021-0280)).
  Na elke training tijdens een overbelastingsblok remde een ketonester de
  overreaching ([Poffé 2019](https://doi.org/10.1113/JP277831)). Dat is één
  onderzoeksgroep met kleine groepen mannen. Het advies blijft "niet nodig",
  maar de tekst wordt eerlijker.
- **Vrouwen en voeding**: bevestigd door een studie met hormoonmetingen, waarin
  de cyclusfase geen invloed had op duurprestatie
  ([Taylor 2024](https://doi.org/10.1249/MSS.0000000000003447)).
- **IJzer**: schrijft je arts ijzer voor, dan gaf om de dag even goede waarden
  met minder maagklachten ([von Siebenthal 2023](https://doi.org/10.1016/j.eclinm.2023.102286); eerste auteur, eerder hier als "Gessler" genoemd).
  Het advies "nooit op eigen houtje" blijft.

**Niet opnieuw gezocht in deze ronde:** REDs, botgezondheid, weerstand, masters,
visolie, probiotica, mondspoelen, wat niet werkt, low-carb, gezonde basis,
vitamine D en indoor. Ze steunen op de UCI-stukken van 2025–2026 of op een
richtlijn, en er was geen aanleiding.

### 3D. Beperkingen bij elk voedingsartikel

De trainings- en krachtartikelen hebben een lijst "wat het onderzoek níét laat
zien"; de 25 voedingsartikelen niet. Daardoor staat onzekerheid nu als punt
tussen de adviezen, of ontbreekt ze. Voorstel:
- `NutritionArticle` krijgt `limits`, net als `TrainingArticle`.
- Elk artikel krijgt een tot drie beperkingen.
- De test eist dat ze er zijn.
- De voedingspagina toont ze zoals de trainingspagina.

Dit is het meeste werk van fase 3, en het maakt de drie kennisbanken gelijk.

**Bewust niet voorgesteld.**
- *Een nieuwe band voor koolhydraten per uur naar intensiteit*: de twee proeven
  van 2026 wijzen verschillende kanten op.
- *Een lagere standaarddosis cafeïne*: de meta-analyses spreken elkaar tegen.
- *Nieuwe artikelen (alcohol en herstel, zweettest)*: niet gezocht in deze
  ronde. Ze horen als idee in het plannenboek.

### Besluit eigenaar (2026-10-16)

"Ja op alles": 3A–3C zoals voorgesteld, de tip herformuleren, en beperkingen
bij alle 25 voedingsartikelen.

## Fase 4 — Kracht, core en mobiliteit

Opgesteld 2026-10-16. **Goedgekeurd door de eigenaar ("alles ja en ook een
protocol van 10 weken") en uitgevoerd op 2026-10-16.** Bij besluit 2 is
gekozen voor de eerste optie, die als voorstel was gemarkeerd: de regel
houden, met een eerlijkere uitleg. Wat er is gebouwd, staat in `PLAN.md`
(ronde "wetenschappelijke toets fase 4"). Oorspronkelijk voorstel:

**Hoe gezocht.**
- De Consensus-agent behandelde kracht en gecombineerde training (regels 1–5
  en masters). Over botten, rug, core en rekken gaf hij "onvoldoende in deze
  set". Het ruwe rapport staat in `docs/consensus/`.
- De rest heb ik gericht gezocht.
- Alle bronnen hieronder staan in PubMed. Kırmacı 2026, een RCT bij
  recreanten, staat er niet in en is daarom niet gebruikt.
- Van Pallarés 2025 is de volle tekst gelezen; van de andere bronnen de
  samenvatting.

**Het beeld.** De kennisbank kracht is zorgvuldig: elk artikel heeft al
beperkingen, en `docs/kracht-literatuur.md` legt elke keuze vast. Er is
sindsdien vooral iets bijgekomen:
- **Kracht op de fiets werkt bij goed getrainde renners even goed als squats.**
  Dat is nieuw en voor ZWB-leden zonder sportschool interessant.
- **Over botten is er nu wel onderzoek naar springen.** Het artikel zegt dat er
  geen controleerbare bron is.
- **De regel "kracht nooit op een fietsdag" is voorzichtiger dan het onderzoek
  vraagt.**
- **Eén codecommentaar beweert te veel**: bij `MOBILITY_SESSIONS_PER_WEEK` staat
  "doel uit de literatuur: twee tot drie sessies per week". Het artikel zegt
  terecht dat het een eigen keuze is.

### 4A. De tien bestaande artikelen (`strength-library.ts`)

| Artikel | Oordeel | Wat verandert |
|---|---|---|
| Zwaar krachtwerk en fietsen | klopt, aanvullen | Nieuwe proeven bij goed getrainde mannen bevestigen het: tien weken squats verhoogden het maximale aerobe vermogen ([Pallarés 2025](https://doi.org/10.5114/biolsport.2025.146790)), en eenbenig en tweebenig verbeterden allebei de tijdrit ([Ji 2021](https://doi.org/10.1519/JSC.0000000000004105)). Bij vrouwelijke renners kwam er in zes weken wel kracht bij, maar geen duurvermogen ([Montalvo-Pérez 2021](https://doi.org/10.3389/fphys.2021.586113)). Voor de sprint werkte sprinttraining op de fiets beter dan zwaar krachtwerk ([Kristoffersen 2019](https://doi.org/10.3389/fphys.2019.01132)). Beperking erbij: de meta-analyse vond geen verschil naar geslacht, niveau of frequentie. |
| Het gymprogramma | ongewijzigd | — |
| Kracht vasthouden in het seizoen | aanvullen | Eén sessie per week houdt kracht vast als het gewicht zwaar blijft; ouderen hebben er mogelijk twee nodig ([Spiering 2021](https://doi.org/10.1519/JSC.0000000000003964)). Renners die tien weken geen kracht deden, verloren kracht en dijspier ([Pallarés 2025](https://doi.org/10.5114/biolsport.2025.146790)). |
| Thuis met lichtere gewichten | klopt | Bron erbij: een netwerk-meta-analyse bevestigt dat spiergroei gelijk is en kracht met zwaarder gewicht meer stijgt ([Lopez 2021](https://doi.org/10.1249/MSS.0000000000002585); in het voorstel stond 2020, PubMed geeft 2021). |
| Kracht en fietsen combineren | **bijstellen** | Volgorde maakt voor duurvermogen weinig uit ([Vikestad 2024](https://doi.org/10.3390/sports12080226); [Held 2026](https://doi.org/10.1007/s40279-026-02401-y)). Krachtwinst lijdt vooral als je beide in dezelfde sessie doet, bij getrainde mensen ([Petré 2021](https://doi.org/10.1007/s40279-021-01426-9)), en bij mannen meer dan bij vrouwen ([Huiberts 2023](https://doi.org/10.1007/s40279-023-01943-9)). De tekst zegt nu dat er "geen onderzoek bij wielrenners" is naar de tijd ertussen. Hij wordt: gescheiden sessies op één dag zijn in onderzoek geen probleem; de regel in de app gaat over spierpijn vóór je sleutelsessie, niet over interferentie. Zie besluit 2. |
| Wielrennen en je botten | **bewering herzien** | "Niet in een controleerbare bron gevonden" klopt niet meer. Springen verhoogde bij volwassenen de botdichtheid in de dijbeenhals met ~1,5 %, rond 50 sprongen vier keer per week ([Florence 2023](https://doi.org/10.1080/02640414.2024.2312052)). Bij topwielrenners hield vijf keer per week vijf minuten springen, met collageen, die botdichtheid op peil ([Hilkens 2023](https://doi.org/10.1123/ijsnem.2023-0080)). Een overzicht vond weinig studies, maar wel belovende ([Florvåg 2025](https://doi.org/10.1186/s12891-025-08316-5)). Zie besluit 3. |
| Lage rugpijn bij renners | aanvullen | Een bikefit verminderde rugpijn in drie kleine studies ([Barrajón 2026](https://doi.org/10.7759/cureus.101718)). Core-stabilisatie hielp bij niet-specifieke rugpijn, al was dat niet bij renners onderzocht ([Smrcina 2022](https://doi.org/10.26603/001c.37251)). Het blijft geen behandeling. |
| Wat core-training doet | ongewijzigd | Geen proef gevonden die core-training op fietsprestatie toetst. |
| Rekken vlak voor de rit | **bijstellen** | Een nieuwere meta-analyse met alleen gecontroleerde studies vond wel krachtverlies na lang statisch rekken (≥ 60 s), maar geen nadeel voor sprongen en sprints in het algemeen ([Warneke 2024](https://doi.org/10.1016/j.jshs.2024.05.002)). Een netwerk-meta-analyse vond dynamisch rekken het best voor explosieve prestaties ([Li 2023](https://doi.org/10.1186/s13102-023-00703-6)). De serie Voor de rit blijft dynamisch; het "kost prestatie" wordt genuanceerd. |
| Stijve hamstrings en rugpijn | ongewijzigd | Geen nieuw prospectief onderzoek gevonden. |

**In de code:** het commentaar bij `MOBILITY_SESSIONS_PER_WEEK` noemt het een
eigen keuze, zoals het artikel. In `docs/kracht-literatuur.md` vervalt
"niet toegevoegd: een aparte serie voor botgezondheid, bij gebrek aan een
gecontroleerde bron".

### 4B. Nieuw artikel: kracht op de fiets

Twee publicaties uit één RCT met 37 goed getrainde mannen
([Barranco-Gil 2024](https://doi.org/10.1249/MSS.0000000000003556);
[Pallarés 2025](https://doi.org/10.5114/biolsport.2025.146790)):
- **Wat ze deden**: tien weken, twee keer per week, met 72 uur ertussen. Vijf
  sets van zeven trappen voluit vanuit stilstand op een helling van 6 %, in
  een verzet waarbij de cadans gemiddeld rond 43 rpm lag (70 % van de maximale
  trapkracht). Tussen de sets 4 minuten rust.
- **Wat het opleverde**: evenveel kracht, Wingate-vermogen en spiermassa als
  squats met hetzelfde gewicht en volume. Er kwamen geen extra klachten bij;
  de squatgroep kreeg iets meer stijfheid en pijn (niet significant).
- **Steun**: bij profs gaven sprintwerk op de fiets en krachtwerk in de
  sportschool allebei een betere tijdrit
  ([Valenzuela 2021](https://doi.org/10.1123/ijspp.2020-0305)).
- **Verschil met "torque"-training**: dit is iets anders dan de bekende
  torque-intervallen van minuten op lage cadans. Die halen maar ≤ 50 % van de
  trapkracht, en het bewijs ervoor is wisselend.
- **Beperkingen**: één onderzoeksgroep, alleen goed getrainde mannen, en
  buiten op een helling. Of het op een smart trainer net zo werkt, met een
  vliegwiel en zonder echte helling, is niet getest.

Zie besluit 4: alleen een artikel, of ook een protocol.

### 4C. Nieuw artikel: kracht als je ouder wordt

Veel leden zijn masters. Bij masters-wegrenners gaf kracht- en sprinttraining
meer spiermassa, kracht en sprintvermogen
([Del Vecchio 2019](https://doi.org/10.1519/JSC.0000000000001960)). Ouderen
hebben voor onderhoud mogelijk twee sessies per week nodig in plaats van één
([Spiering 2021](https://doi.org/10.1519/JSC.0000000000003964)). Het
ACSM-standpunt van 2026 over krachttraining komt erbij
([Currier 2026](https://doi.org/10.1249/MSS.0000000000003897), via PubMed
bevestigd bij uitvoering). Het artikel komt in de categorie Kracht, met beperkingen: er zijn
weinig studies met oudere renners zelf.

### Bewust niet voorgesteld

- *Een artikel over bikefit*: drie kleine studies; het hoort in het artikel
  over rugpijn, niet los.
- *Explosieve training of sprongen voor prestatie*: sprinttraining op de fiets
  werkt voor de sprint beter. Dat zit al in het fietsschema.
- *Een vrouwspecifiek krachtartikel*: de vrouwenstudies (Vikmoen,
  Montalvo-Pérez) wijzen dezelfde kant op als bij mannen. Ze komen in het
  hoofdartikel.

### Besluit eigenaar (2026-10-16)

"Alles ja en ook een protocol van 10 weken."

Oorspronkelijke vragen:

1. 4A uitvoeren zoals voorgesteld?
2. De regel voor kracht (alleen op een dag zonder rit, drie dagen ertussen):
   **houden**, met een eerlijkere uitleg? Dat is mijn voorstel, want het gaat
   om spierpijn vóór sleutelsessies. Of **versoepelen**, zodat kracht ook op
   een dag met alleen een rustige rit mag?
3. Botten: alleen het artikel herzien, of ook een **springserie** (rond 50
   sprongen, drie à vier keer per week, zonder materiaal)? Een nieuwe serie is
   een seed-migratie, en die is hier niet te testen.
4. Kracht op de fiets: alleen een **artikel**, of ook een **protocol** van tien
   weken met een `aiHint`, zodat de AI het als buitenrit inplant?
5. Het artikel voor masters (4C): ja of nee?

## Fase 5 — Racen en pacing

Opgesteld 2026-10-16. **Goedgekeurd door de eigenaar ("akkoord op alle 3 de
punten") en uitgevoerd op 2026-10-16.** Millour 2022, Spragg 2024 en Fujii 2025
zijn bij uitvoering via Crossref bevestigd; Karsten 2013 via PubMed. Wat er is
gebouwd, staat in `PLAN.md` (ronde "wetenschappelijke toets fase 5").
Oorspronkelijk voorstel:

**Hoe gezocht.** De Consensus-agent behandelde CP, FTP, W′ en het herstel van W′
(regels 1–4). Voor duurvermogen, pacing, drafting en warming-up gaf hij
"onvoldoende in deze set"; het ruwe rapport staat in `docs/consensus/`. De rest
heb ik gericht gezocht. Van de bronnen hieronder staan er 17 in PubMed. Drie
staan er niet in: Millour 2022, Spragg 2024 en Fujii 2025. Die worden bij
uitvoering via de uitgever bevestigd, of vallen weg.

**Wat er getoetst is.** Het pacingplan rekent met CP en W′ (`lib/pacing/cp.ts`),
een W′-balans volgens Skiba (`w-prime.ts`), een afname van CP met het werk
(`durability.ts`), een reserve vóór de sprint (`plan.ts`) en coachingregels voor
de AI (`prompt.ts`). De onderbouwing staat in `docs/racestrategie-onderzoek.md`.

**Het beeld.** Er zijn twee getallen waar het onderzoek een andere kant op wijst,
en één promptregel die een tijdrijder verkeerd adviseert. De rest klopt, maar
wordt stelliger gebracht dan het bewijs toelaat.

### 5A. CP schatten uit FTP: 0,97 → 1,00

- **Nu**: `CP_FTP_FRACTION = 0,97`. Dat geldt als er alleen een FTP is, geen
  CP van intervals.icu en geen bruikbare vermogenscurve.
- **Onderzoek**: CP ligt gemiddeld gelijk aan of iets **boven** FTP.
  - 7 W erboven, met een individuele spreiding van −19 tot +33 W
    ([Karsten 2021](https://doi.org/10.3389/fphys.2020.613151)).
  - 16 W erboven bij goed getrainden
    ([McGrath 2021](https://doi.org/10.70252/isyh9512)).
  - Geen gemiddeld verschil, maar ±30 W spreiding
    ([Morgan 2018](https://doi.org/10.1080/02640414.2018.1535772)).
- **Waarom die studies hier gelden**: zij bepaalden CP net als de app, met
  maximale inspanningen van 2 tot 20 minuten. Een strikte MLSS ligt lager
  (zie 1B en F1), maar dat is een ander getal dan de CP waar het W′-model op
  rekent.
- **Voorstel**: 1,00. Voor leden met alleen een FTP wordt het plan ~3 %
  minder voorzichtig; de W′-toets blijft.
- **In de tekst**: één factor is een ruwe schatting; per renner kan het ±25 W
  schelen.

### 5B. De W′-balans: hoe betrouwbaar is "leeg"?

- **Nu**: Skiba's differentiële model, met een vaste tijdconstante. In een
  Zwift-race houdt het plan tot de sprint 15 % van W′ achter de hand
  (`RACE_RESERVE_FRACTION`, een eigen keuze van 2026-09-21).
- **Onderzoek**:
  - Bij 15 renners in echte races gaf dit model op het moment van uitputting
    nog gemiddeld **21 ± 28 %** reserve aan (Millour 2022, niet in PubMed). Het
    eenvoudigere integrale model gaf 0 ± 30 %, het Bartram-model 42 ± 23 %.
  - In het lab overschatte het differentiële model het herstel van W′ na een
    3-minutentest ([Black 2022](https://doi.org/10.1249/MSS.0000000000003039)).
  - Het herstel vertraagt bij herhaalde inspanningen
    ([Chorley 2019](https://doi.org/10.1123/ijspp.2018-0256)), en een
    tweefasig model past beter
    ([Chorley 2021](https://doi.org/10.1007/s00421-021-04874-3);
    [2023](https://doi.org/10.1080/17461391.2023.2238679)).
  - Bij topsporters herstelt W′ juist sneller dan Skiba voorspelt
    ([Bartram 2017](https://doi.org/10.1123/ijspp.2017-0034);
    [2021](https://doi.org/10.1123/ijspp.2020-0444)).
  - Geen enkele vaste formule voorspelde uitputting goed. Een persoonlijke
    tijdconstante is nodig voor precisie
    ([Welburn 2025](https://doi.org/10.1007/s00421-025-05912-0)).
- **Gevolg**: het model is bruikbaar als toets, maar "nog 15 % over" is een
  schatting met een fout van rond de 30 %. In races zat het model gemiddeld
  aan de optimistische kant.
- **Voorstel**:
  - Het model houden; er is geen alternatief dat zonder persoonlijke test
    beter werkt.
  - De reserve vóór de sprint van **15 naar 20 %**, omdat het model gemiddeld
    ~21 % aangaf bij renners die al leeg waren.
  - De commentaren in `w-prime.ts` noemen het "een schatting", niet "de harde
    toets".

Zie besluit 2.

### 5C. W′-standaard en het fitvenster

- **20 kJ als standaard, grenzen 5–50 kJ**: plausibel, maar een vuistregel.
  Getrainde renners zaten rond 18–20 kJ
  ([Nimmerichter 2020](https://doi.org/10.1123/ijspp.2019-0621)).
- **W′ uit veld- of racedata is onbetrouwbaar**, CP niet.
  - CP uit racedata klopte op 5 à 7 W, W′ correleerde niet
    ([Spragg 2023](https://doi.org/10.1080/02640414.2023.2254574)).
  - Bij veldtests was de fout in W′ 27 %
    ([Karsten 2013](https://doi.org/10.1055/s-0033-1349844), DOI bij
    uitvoering in PubMed bevestigen).
- **Fitvenster 2–20 minuten**: klopt. Advies is minstens drie maximale
  inspanningen tussen 2 en 15 minuten
  ([Leo 2021](https://doi.org/10.1007/s00421-021-04833-y)). Alleen korte
  inspanningen overschatten CP
  ([Maturana 2017](https://doi.org/10.1016/j.jsams.2017.11.015)), en een
  1-minuutpunt meenemen ook ([Nimmerichter 2020](https://doi.org/10.1123/ijspp.2019-0621)).
- **Voorstel**: geen codewijziging. Het commentaar noemt 20 kJ en de grenzen
  een vuistregel, en de UI-uitleg van de bron noemt W′ de onzekerste van de
  twee.

### 5D. Duurvermogen in het plan

- **Begrenzing op 25 %**: ruim genoeg. Na veel werk zakt het vermogen 10–20 %
  ([Sánchez-Jiménez 2025](https://doi.org/10.1007/s00421-025-05885-0)). Na drie
  uur zonder koolhydraten zakte CP 15 %
  ([Norte 2026](https://doi.org/10.1111/sms.70326)).
- **Beperking die de app niet ziet**: de **intensiteit** van eerder werk telt
  zwaarder dan het aantal kilojoules
  ([Leo 2024](https://doi.org/10.1123/ijspp.2023-0451); Spragg 2024, niet in
  PubMed). De app rekent met kJ-drempels van intervals.icu.
- **Vrouwen** zakten bij profs na veel werk iets meer
  ([Mateo-March 2025](https://doi.org/10.1016/j.jsams.2025.02.009)). De app
  gebruikt per renner de eigen curves, dus dat zit er per persoon al in.
- **Voorstel**: geen codewijziging. Promptregel aanvullen: "vooral na veel
  werk boven CP zakt je drempel later in de rit". Beperking in
  `durability.ts` en in `racestrategie-onderzoek.md` §6.

### 5E. De coachingregels voor de AI (`prompt.ts`)

| Regel | Oordeel | Wat verandert |
|---|---|---|
| "Op een lange klim is gelijkmatig bijna altijd sneller dan een aanval; op een korte steile klim het omgekeerde." | klopt | Modellen tonen de grootste winst van variabel vermogen op lange, doorgaande klimmen bij zwaardere renners ([Boswell 2012](https://doi.org/10.1080/02640414.2012.654397)). |
| "Een tijdrijder wint met een vlak tempo en verliest met pieken." | **bijstellen** | Op een glooiende tijdrit is iets harder bergop en in tegenwind, en zachter bergaf en met de wind mee, sneller dan constant vermogen (Atkinson 2007, al in `racestrategie-onderzoek.md` §2). De regel wordt: "geen pieken, maar wel ongeveer 5–10 % harder op klimmen en in tegenwind en zachter waar het hard gaat". |
| "Sparen aan het begin." | klopt voor een massastart en een lange tijdrit | Voor een tijdrit: begin hooguit ~5 % boven je gemiddelde (§2). Dat komt er als regel bij voor `format` tt. |
| "Het laatste deel van een lange rit is zwaarder." | klopt | Aanvulling zoals in 5D. |

### 5F. Wat al klopt of al getoetst is

- **Warming-ups per wedstrijdtype (F6)**: hertoetst in fase 2 (artikel
  Warming-up). Niets nieuws.
- **Race- en ZRL-tips en TTT-kopvermogen (F5)**: steunen op de eigen data
  (`racestrategie-onderzoek.md` §11). Literatuur voegt daar niets aan toe.
- **Drafting**: de app rekent met de Zwift-fysica, niet met de literatuur.
  Buiten rekent het plan zonder slipstream, en dat blijft zo.

### 5G. `racestrategie-onderzoek.md`

§5 (W′) en §6 (duurvermogen) krijgen de bronnen hierboven. De bronlijst gaat van
losse webadressen naar DOI's waar PubMed die bevestigt.

### Bewust niet voorgesteld

- *Overstappen op het integrale of een tweefasig W′-model*: het integrale model
  lag in races gemiddeld op nul, maar met dezelfde spreiding van ±30 %. Een
  tweefasig model vraagt parameters per renner, en die heeft de app niet.
- *Een persoonlijke tijdconstante per lid*: dat vraagt een testprotocol
  ([Welburn 2025](https://doi.org/10.1007/s00421-025-05912-0)). Mogelijk een
  later idee voor het plannenboek.
- *Hitte en voeding in het pacingplan*: daarvoor bestaan protocollen, en de
  prompt geeft bewust geen voedingsadvies.

### Besluit eigenaar (2026-10-16)

"Helemaal goed, akkoord op alle 3 de punten."

Oorspronkelijke vragen:

1. 5A: CP uit FTP van 0,97 naar **1,00**?
2. 5B: de reserve vóór de sprint van **15 naar 20 %**, of houden op 15 % met
   alleen een eerlijkere uitleg?
3. 5C–5G uitvoeren zoals voorgesteld (commentaar, prompt en docs, geen andere
   rekenregels)?

## Fase 6 — Overig: rit-fysica, CORE-sensor, /hulp en privacy

Opgesteld 2026-10-16. **Goedgekeurd door de eigenaar ("ja doe dat maar") en
uitgevoerd op 2026-10-16.** Wat er is gebouwd, staat in `PLAN.md` (ronde
"wetenschappelijke toets fase 6"). Oorspronkelijk voorstel:

**Hoe gezocht.** Dit zijn smalle onderwerpen. Ik heb ze met gerichte
Consensus-zoekvragen gedaan, zonder de onderzoeksagent. Alle bronnen hieronder
staan in PubMed.

**Het beeld.** Geen getal hoeft te veranderen. De rit-fysica valt binnen wat er
gemeten is. De CORE-sensor steunt in de app op één validatiestudie, terwijl er
inmiddels vier zijn, en die spreken elkaar tegen. Alle wetenschappelijke links
op /hulp kloppen, maar twee wijzen niet naar een DOI.

### 6A. Rit-fysica (`ride-estimate.ts`, `ride-physics.ts`, `teams/power-profile.ts`)

| Constante | Oordeel | Wat verandert |
|---|---|---|
| `DEFAULT_CDA = 0,32` m² (handen op de kappen) | klopt, iets voorzichtig | Ervaren renners kwamen op de kappen op een luchtweerstand die neerkomt op ~0,29 m², in de beugel ~0,25 ([Lim 2011](https://doi.org/10.1249/MSS.0b013e3181fcb140)). 0,32 rekent iets trager; dat past bij een schatting. Bron erbij in het commentaar. |
| `DEFAULT_CRR = 0,005` (asfalt) | klopt | Dezelfde studie mat een rolweerstand die neerkomt op ~0,005–0,007, afhankelijk van de bandenspanning. Bron erbij. |
| `DRIVETRAIN_EFF = 0,97` | aanname | Gangbare waarde, niet opnieuw gezocht. Het commentaar noemt het een aanname. |
| `FLAT_DRAG_K = 0,24`, `CLIMB_POWER_SHARE = 0,85`, `OUTDOOR_SPEED_PENALTY = 0,88` | eigen ijking | Al zo benoemd: geijkt op Zwift en bedoeld voor de orde van grootte. Geen wijziging. |
| `ENDURANCE_FTP_FRACTION = 0,72`, `FALLBACK_WKG = 2,5` | eigen keuze | Het commentaar leest nu als feit ("dat volgehouden wordt"). Het wordt "eigen keuze voor het tempo van het rit-weer, door het lid te overschrijven". |

**Bewust niet:** de waarden aanpassen. Het rit-weer en de routevoorstellen
schatten de orde van grootte, en de pacing rekent met de Zwift-fysica.

### 6B. De CORE-sensor (`core-temperature.ts`, hitteprotocollen, `protocollen-onderzoek.md`)

- **Nu**: de beperking in beide hitteprotocollen noemt één validatiestudie,
  waarin de helft van de metingen meer dan 0,3 °C afweek
  ([Verdel 2021](https://doi.org/10.3390/s21175932)).
- **Erbij**:
  - Bij hockeysters onderschatte de sensor de kerntemperatuur, meer naarmate
    het warmer werd, met 41–60 % van de metingen meer dan 0,3 °C ernaast
    ([Goods 2023](https://doi.org/10.1080/17461391.2023.2193953)).
  - Bij fietsers in de hitte overschatte hij juist met ~0,3 °C in de tweede
    helft van de rit, meer bij meer onderhuids vet
    ([McLaughlin 2025](https://doi.org/10.1016/j.jtherbio.2025.104241)).
  - In een vergelijking van drie sensoren zat CORE systematisch iets te hoog
    ([Daanen 2023](https://doi.org/10.1016/j.jtherbio.2023.103480)).
- **Gevolg**: de fout is rond 0,3–0,5 °C, en per persoon en situatie naar boven
  of naar beneden. De opzet van de app past daarbij: de waarde is een
  richting, de app vinkt af, en het lid kan het vinkje weghalen.
- **Voorstel**:
  - De beperking in beide hitteprotocollen noemt nu de vier studies en de
    richting van de fout.
  - Het commentaar bij `CORE_THRESHOLD_C` en het onderzoeksdocument krijgen de
    bronnen.
  - De drempel van 38,5 °C en de 30 minuten blijven.

### 6C. /hulp

- **Gecontroleerd**: de vijf wetenschappelijke links op /hulp. Alle claims
  kloppen met de bron:
  - Periodisering: geen model beter over 8–12 weken
    ([Galán-Rioja 2023](https://doi.org/10.1123/ijspp.2022-0302)).
  - Blokperiodisering: gunstig, maar uit kleine studies
    ([Mølmen 2019](https://doi.org/10.2147/OAJSM.S180408)).
  - Vrij trainen gaf meer uitvallers
    ([Clemente-Suárez 2021](https://doi.org/10.3390/ijerph182412973)).
  - De piek viel meestal in de eerste twee weken van de taper
    ([Aubry 2014](https://doi.org/10.1249/MSS.0000000000000301)).
  - Taper van zeven dagen tot drie weken
    ([Wang 2023](https://doi.org/10.1371/journal.pone.0282838)).
- **Voorstel**: de links naar sponet.de en dovepress.com gaan naar de DOI,
  zoals de andere bronnen. Verder geen tekstwijziging: de claims die in fase
  1–5 veranderden, zijn op /hulp al meegenomen.

### 6D. Privacyverklaring

Er staan geen wetenschappelijke claims in, alleen beschrijvingen van welke data
de app gebruikt. Die kloppen met de code (38,5 °C, HRV, rust-hartslag, slaap).
De nieuwe onderdelen uit fase 2–5 gebruiken geen nieuwe gegevens: de Duurtest
rekent met ritdata die al binnenkomt, en de springserie en kracht op de fiets
met afgevinkte sessies. **Geen wijziging.**

### 6E. De toets afronden

Na fase 6 is elke regel uit het claimregister getoetst. Voorstel:
- Bovenaan het werkdocument komt een korte samenvatting van wat er per fase is
  veranderd.
- Punt 7 verhuist in `PLAN.md` van de actieve lijst naar de opgeleverde lijst.
- Wat nog openstaat, wordt apart genoemd:
  - migraties 0241 en 0242 op productie;
  - de nieuwe sprongfiguur en de voedingspagina in de browser;
  - het idee van een persoonlijke W′-tijdconstante, voor het plannenboek.

### Besluit eigenaar (2026-10-16)

"Ja doe dat maar."

Oorspronkelijke vragen:

1. 6A–6D uitvoeren zoals voorgesteld (commentaren, protocolteksten, DOI-links,
   geen nieuwe getallen)?
2. 6E: de toets daarmee afronden in `PLAN.md` en het werkdocument?

## Bronnen fase 1

Gezocht via PubMed (metadata en abstracts) en Consensus, 2026-10-16. Bij
abstract-only staat de conclusie zoals het abstract die geeft; volle tekst is in
deze ronde niet gelezen.

- Borszcz FK e.a. (2018) Int J Sports Med 39(10):737-742 — FTP20 vs FTP60. doi:10.1055/s-0044-101546
- Borszcz FK e.a. (2019) IJSPP 14(8):1029-1035 — FTP vs MLSS. doi:10.1123/ijspp.2018-0572
- Borszcz FK e.a. (2020) Int J Sports Med 41(3):175-181 — betrouwbaarheid FTP. doi:10.1055/a-1018-1965
- Buchheit M (2014) Front Physiol 5:73. doi:10.3389/fphys.2014.00073
- Buist I e.a. (2008) Am J Sports Med 36(1):33-39. doi:10.1177/0363546507307505
- Craven J e.a. (2022) Sports Med 52(11):2669-2690. doi:10.1007/s40279-022-01706-y
- Düking P e.a. (2021) J Sci Med Sport 24(11):1180-1192. doi:10.1016/j.jsams.2021.04.012
- Gough LA e.a. (2025) J Sci Cycling — FTP20 en 60-minutenvermogen. doi:10.28985/1425.jsc.06 ²
- Granero-Gallegos A e.a. (2020) IJERPH 17(21):7999. doi:10.3390/ijerph17217999
- Hellard P e.a. (2006) J Sports Sci 24(5):509-520. doi:10.1080/02640410500244697
- Hunter B e.a. (2025) Exp Physiol 110(11):1612-1624. doi:10.1113/EP092120
- Iannetta D e.a. (2020) Med Sci Sports Exerc 52(2):466-473. doi:10.1249/MSS.0000000000002147
- Impellizzeri FM e.a. (2020) IJSPP 15(6):907-913. doi:10.1123/ijspp.2019-0864
- Inglis EC e.a. (2020) IJSPP 15(4):541-547. doi:10.1123/ijspp.2019-0214
- Jamnick NA e.a. (2018) PLoS One 13(7):e0199794. doi:10.1371/journal.pone.0199794
- Javaloyes A e.a. (2019) IJSPP 14(1):23-32. doi:10.1123/ijspp.2018-0122
- Javaloyes A e.a. (2020) J Strength Cond Res 34(6):1511-1518. doi:10.1519/JSC.0000000000003337
- Karsten B e.a. (2021) Front Physiol 11:613151 — CP vs FTP. doi:10.3389/fphys.2020.613151
- Le Meur Y e.a. (2013) Med Sci Sports Exerc 45(11):2061-2071. doi:10.1249/MSS.0b013e3182980125
- Manresa-Rocamora A e.a. (2021) IJERPH 18(19):10299. doi:10.3390/ijerph181910299
- Mujika I, Padilla S (2000) Sports Med 30(2):79-87. doi:10.2165/00007256-200030020-00002
- Mujika I, Padilla S (2001) Med Sci Sports Exerc 33(3):413-421. doi:10.1097/00005768-200103000-00013
- Nielsen RØ e.a. (2014) JOSPT 44(10):739-747. doi:10.2519/jospt.2014.5164
- Plews DJ e.a. (2012) Eur J Appl Physiol 112(11):3729-3741. doi:10.1007/s00421-012-2354-4
- Plews DJ e.a. (2013) Sports Med 43(9):773-781. doi:10.1007/s40279-013-0071-8
- Rothschild JA e.a. (2025) Eur J Appl Physiol 125(10):2911-2920. doi:10.1007/s00421-025-05815-0
- Tramontin AF e.a. (2021) Int J Sports Med 43(5):411-417 — warming-up en FTP. doi:10.1055/a-1524-2312
- Valenzuela PL e.a. (2018) IJSPP 13(10):1293-1298 — FTP vs lactaatdrempel. doi:10.1123/ijspp.2018-0008

**Toegevoegd na de ronde met Consensus Pro** (rapport:
`docs/consensus/`, thread
[in Consensus](https://consensus.app/search/context-i-am-auditing-the-scientific-basis-of-a-tr/ADX3Q6--RxiBp_2cD6Ilmg/)):

- Alfonso C e.a. (2025) Sci Rep 15:34023. doi:10.1038/s41598-025-13540-z
- Azevedo RA e.a. (2023) J Appl Physiol 135(1):109-120. doi:10.1152/japplphysiol.00090.2023
- Barsumyan A e.a. (2025) Front Artif Intell 8:1623384. doi:10.3389/frai.2025.1623384
- Barsumyan A e.a. (2026) BMC Sports Sci Med Rehabil 18. doi:10.1186/s13102-026-01678-w
- Bellenger CR e.a. (2016) Sports Med 46(10):1461-1486. doi:10.1007/s40279-016-0484-2
- Caen K e.a. (2024) Sports Med 54(10):2497-2513 — CP vs MLSS. doi:10.1007/s40279-024-02075-4
- Denham J e.a. (2026) J Sports Sci — 55 en 85 % FTP. doi:10.1080/02640414.2026.2673477 ²
- Sanders D e.a. (2017) IJSPP — intensiteitsverdeling RPE vs vermogen/hartslag. doi:10.1123/ijspp.2016-0523 ²
- Coates AM e.a. (2018) Eur J Sport Sci 18(7):965-974. doi:10.1080/17461391.2018.1458907
- Damsted C e.a. (2018) Int J Sports Phys Ther 13(6):931-942. PMC6253751; doi:10.26603/ijspt20180931 ¹
- Gabbett TJ (2020) Br J Sports Med 54(1):58-66. doi:10.1136/bjsports-2018-099784
- Johnston R e.a. (2019) IJSPP 14(5):590-597. doi:10.1123/ijspp.2018-0644
- Lillo-Beviá JR e.a. (2022) J Strength Cond Res 36(1):167-173. doi:10.1519/jsc.0000000000003403 ¹
- Manresa-Rocamora A e.a. (2021b) Scand J Med Sci Sports 31(6):1164-1182. doi:10.1111/sms.13932
- McGrath E e.a. (2019) Int J Exerc Sci 12(4):1334-1345. doi:10.70252/RQOO7391
- Stevenson JD e.a. (2023) Eur J Appl Physiol 124(1):309-315. doi:10.1007/s00421-023-05285-2
- Vesterinen V e.a. (2016) Med Sci Sports Exerc 48(7):1347-1354. doi:10.1249/MSS.0000000000000910
- Wong S e.a. (2023) J Sports Sci 40(23):2578-2584. doi:10.1080/02640414.2023.2176045

¹ De studie zelf staat in PubMed, maar de DOI komt uit de metadata van
Consensus: PubMed noemt hem bij Damsted niet, en Lillo-Beviá werd niet op
titel gevonden. De rest is via PubMed bevestigd.

² DOI uit de Pro-zoekfunctie van Consensus (die geeft sinds het opnieuw
verbinden de DOI per paper mee). Gough staat niet in PubMed; Denham en Sanders
worden nog in PubMed nagelopen voordat ze in de kennisbank komen.

Alle DOI's in de eerste lijst zijn via PubMed bevestigd, behalve Gough 2025 (niet in
PubMed). Les uit deze ronde: vier DOI's die eerst uit het geheugen waren
aangevuld, bleken fout. Een DOI gaat dus pas de kennisbank in als hij via PubMed
of de uitgever is bevestigd.
