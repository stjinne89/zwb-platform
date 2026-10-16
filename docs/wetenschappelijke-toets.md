# Wetenschappelijke toets van ZWBasis

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
| A1 | FTP = 0,75 × hoogste minuut van de ramptest (stappen ~20 W/min) | `lib/training/ftp-test.ts` | ⚠ geen gepeerreviewde validatie gevonden; zie 1B |
| A2 | FTP = 0,95 × 20-minutengemiddelde | idem | ◐ betrouwbaar, maar individueel ruim; zie 1B |
| A3 | Een FTP ouder dan acht weken verdient een nieuwe test | `workouts.ts` prompt | ◐ eigen keuze, niet zo benoemd |
| A4 | HRV-status: 7-daags gemiddelde < 0,90 × baseline = vermoeid, > 1,05 = fris | `wellness.ts` `summarizeWellness` | ⚠ zie 1C |
| A5 | Rust-HR > baseline + 3 slagen = vermoeid | idem | ✖ vaste grens, geen meetfout meegenomen |
| A6 | Afgeleide readiness: neutraal 70, HRV-afwijking × 200, rust-HR × 300, slaapscore ±8 | `wellness.ts` `deriveReadiness` | ✖ eigen gewichten |
| A7 | Slaapstaffel < 5,5 / 6,0 / 6,5 uur → aftrek 22 / 14 / 6 | `wellness.ts` | ◐ richting klopt (zie 1C), getallen eigen keuze |
| A8 | TSB ≤ −25 herstel, ≤ −10 voorzichtig, ≥ 8 klaar; < −40 ernstig | `wellness.ts` `summarizeTrainingReadiness` | ✖ geen bron |
| A9 | Hoge belasting + HRV boven baseline = goed aangepast, dus verzachten | idem | ⚠ HRV kan ook stijgen bij overreaching; zie 1C |
| A10 | Readiness-schaal ≤ 50 laag, < 70 matig, ≥ 75 goed | idem | ◐ overgenomen van apparaten |
| A11 | Zones (Zwift/Coggan): Z2 60–75 %, Z3 76–89 %, Z4 90–104 %, Z5 105–118 %, Z6 ≥ 119 % FTP | `workouts.ts` | ◐ afspraak (eigenaar, 2026-09-15); zie 1D |
| A12 | RPE ↔ %FTP-tabel (RPE 5 = 71–80 %, 7 = 90–104 %, …) | `workouts.ts`, `targets.ts` | ✖ eigen omzetting |
| A13 | Duurblokken minstens 65 % FTP | `workouts.ts` prompt | ◐ eigen keuze (ronde 2026-09-21) |
| A14 | Naleving 80–115 % is "volgens plan" | `compliance.ts` | ◐ eigen keuze, asymmetrie uitgelegd |
| A15 | Wegzakken ≥ 10 %, te hard begonnen ≥ 5 %, ontkoppeling ≥ 5 % (≥ 75 min, VI ≤ 1,10) | `training-advice.ts`, `execution.ts` | ◐ vuistregels met bron in `racestrategie-onderzoek.md` §8 |

### B. Opbouwregels in de AI-trainingsprompt (fase 1)

| # | Claim | Waar | Status |
|---|---|---|---|
| B1 | Weekvolume groeit ±10 % per opbouwweek, "veilig" | `defaultTrainingPrompt` | ⚠ zie 1A |
| B2 | 2–4 opbouwweken, dan een herstelweek | idem | ◐ gangbare praktijk, geen bron |
| B3 | In de piekweek ≥ 85 % van het urenplafond | idem | ◐ eigen keuze |
| B4 | Na > 10 dagen rust lager instappen, ~2 weken terug opbouwen | idem | ✔ in lijn met detraining-literatuur; bron ontbreekt in app |
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
| 25 kennisbankartikelen, 64 bronnen (`lib/nutrition/library.ts`) | ✔ · hertoetsen |
| Koolhydraatbanden g/kg per dagtype, eiwit, 40 g eiwit voor het slapen, 1 g/kg koolhydraat voor de rit (`targets.ts`) | ✔ ACSM 2016, UCI 2026 · hertoetsen |
| Dagtips; regel "nooit minder eten" (`tips.ts`) | ✔ IOC REDs 2023 |
| 13 voedingsprotocollen: cafeïne, bicarbonaat, nitraat, ijsslush, glycerol, koolhydraten laden, bèta-alanine, creatine, darmtraining, herstel na wedstrijd, kersensap, vitamine D, collageen | ✔ `docs/protocollen-onderzoek.md`, `docs/supplementen-onderzoek.md` · hertoetsen |

### E. Kracht, core en mobiliteit (fase 4)

| Onderdeel | Status |
|---|---|
| 10 krachtartikelen (`strength-library.ts`) | ✔ · hertoetsen |
| Twee core-/mobiliteitssessies per week als doel (`MOBILITY_SESSIONS_PER_WEEK`) | ✖ geen bron in code |
| Oefeningen en series (in de database, `0109` e.v.) | ✖ beschrijvend, geen bronnen per serie |

### F. Racen en pacing (fase 5)

| # | Claim | Waar | Status |
|---|---|---|---|
| F1 | CP = 0,97 × FTP als alleen FTP bekend is | `pacing/cp.ts` | ⚠ Karsten 2021 vond CP iets *boven* FTP20×0,95 (gemiddeld +7 W). Bij een strikte bepaling liggen CP en MLSS maar een paar watt uit elkaar ([Caen 2024](https://doi.org/10.1007/s40279-024-02075-4)), terwijl MLSS vaak *onder* FTP ligt (1B). De bronnen spreken elkaar hier deels tegen; uitzoeken in fase 5 |
| F2 | W′ standaard 20 kJ, grenzen 5–50 kJ; CP-fit tussen 2 en 20 min | `pacing/cp.ts` | ◐ |
| F3 | W′bal-herstel volgens Skiba (τ = 546·e^(−0,01·DCP) + 316) | `pacing/w-prime.ts` | ✔ bron, maar opgesteld in één populatie; hertoetsen |
| F4 | Durability: CP-afname begrensd op 25 % | `pacing/durability.ts` | ◐ |
| F5 | Race- en ZRL-tips, TTT-kopvermogen | `zrl-analysis/`, `racestrategie-onderzoek.md` | ✔ getoetst op eigen data |
| F6 | Vijf warming-ups per wedstrijdtype | `warming-up-per-wedstrijdtype.md` | ✔ · hertoetsen |

### G. Overig (fase 6)

| # | Claim | Waar | Status |
|---|---|---|---|
| G1 | Fiets 8 kg, luchtconstante 0,24, 85 % van het vermogen tegen de zwaartekracht, buiten ×0,88 | `ride-physics.ts` | ◐ geijkt op Zwift, zo benoemd |
| G2 | CORE-sensor: doel ~38,5 °C, afwijking t.o.v. rectaal | `protocols/core-temperature.ts` | ✔ |
| G3 | Teksten op /hulp en in de privacyverklaring | `app/(app)/hulp` | · |

## Fase 1 — Toets en voorstellen

Fase 1 gaat over A en B: de regels die het schema en het advies sturen. Bij elk
onderdeel staat wat de app doet, wat de literatuur zegt, en een voorstel.
**Niets hiervan is uitgevoerd.**

### 1A. Opbouw: hoe snel, en wanneer afremmen

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

### 1B. FTP-test

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
   met een link naar het artikel. Een ramptest die bij een uithoudingsrenner te
   hoog uitvalt, is dan zichtbaar voordat het schema erop draait.
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

### 1C. Herstel: HRV, rust-HR, slaap en readiness

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

### 1D. Zones, trainingsvormen en RPE

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

### 1E. Trainingsanalyse en naleving

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
