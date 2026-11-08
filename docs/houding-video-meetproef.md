# Houding en bikefit uit live video: onderzoek en meetproef

**2026-11-08.** Aanleiding: de eigenaar zag Aerox (aeroxbefaster.com) en vroeg wat
ZWB voor de houding op de fiets kan doen. Na een eerste voorstel met foto's koos de
eigenaar voor **live video**: één keer een camera neerzetten werkt makkelijker dan
foto's maken, zeker na 20 minuten als je moe bent. Hij wil ook **bikefit-tips**, met de
maten van de **Zwift Ride**; hoeveel sneller je wordt, vindt hij minder belangrijk.
Toekomstplannen horen in het plannenboek; dit document legt het onderzoek en de
meetproef vast.

## Aerox in het kort

- Een webcam of telefoon staat op ongeveer 1,3 m vóór de trainer. De app haalt het
  silhouet uit het beeld en meet het **frontaal oppervlak (A)**. Als schaal klik je
  beide stuureinden aan; de eerste keer vul je de stuurbreedte en de cameraafstand in.
- De CdA die de app toont, is A maal een **geschatte** Cd. De weerstand zelf wordt niet gemeten.
- Diagnose in twee sessies: tot tien houdingen live vergelijken en daarna de beste
  minstens 20 minuten vasthouden. Daarna een advies voor je houding, plus winst in km/h.
- €49 eenmalig (normaal €79), beschikbaar vanaf 1 december 2026. Alleen Mac en
  Windows. Voor de modi met watt naar km/h is een FTMS-trainer nodig.
- Beweringen als "+2,3 km/h gemiddeld" en "3 % herhaalbaar" komen van de maker zelf; er
  is geen publicatie die ze bevestigt.

Voor ZWB telt dat de **echte houding op Zwift niets uitmaakt**. De winst is buiten, en in
comfort en het volhouden van een houding.

## Wat het onderzoek zegt

**Oppervlak uit beeld.**
- Een foto van voren is een geldige en betrouwbare manier om A te meten
  ([Debraux 2009](https://doi.org/10.1055/s-0028-1105940)).
- De opstelling luistert nauw: een meter verder van de camera geeft ongeveer 5 % minder
  oppervlak, en een referentie die 0,4 m verkeerd staat 25 % minder
  ([Olds & Olive 1999](https://doi.org/10.1080/026404199366046)).
- Een relatieve vergelijking binnen één sessie, met de camera op dezelfde plek, heeft
  daar het minst last van. Tussen remgrepen en beugel scheelt het ongeveer 10 %
  ([Wheat 2014](https://doi.org/10.28985/jsc.v3i2.142)).

**Lager is niet altijd beter.**
- Een lagere romp kost vermogen en rendement
  ([Fintelman 2015](https://doi.org/10.1080/02640414.2015.1009936)).
- Onder ongeveer 30 km/h is rechtop zitten gunstiger
  ([Fintelman 2014](https://doi.org/10.1016/j.jbiomech.2014.02.029)).
- Bij getrainde renners in tijdrittempo wint de aerodynamica toch
  ([Faulkner & Jobling 2020](https://doi.org/10.1123/ijspp.2019-0547)).

**Zadelhoogte.**
- Er is sterk bewijs dat je de zadelhoogte het best instelt op de kniehoek *tijdens het
  trappen*. Verschillen van minder dan 4 % van de beenlengte doen weinig
  ([Bini & Priego-Quesada 2021](https://doi.org/10.1080/02640414.2021.1994727)).
- Richtwaarde voor de kniebuiging onderin de trap: 33–43° bij rustig trappen en
  30–40° bij hoge intensiteit
  ([Swart & Holliday 2019](https://doi.org/10.1249/jsr.0000000000000665),
  [Millour 2019](https://doi.org/10.37190/abb-01428-2019-02)).
- Trek de kniehoek bij rechtop staan ervan af; zonder die correctie zit je ongeveer 10°
  verkeerd ([Priego Quesada 2016](https://doi.org/10.28985/jsc.v5i1.234)).

**Hoe nauwkeurig de modellen zijn.**
- MediaPipe zat bij fietsen 3–9° naast een meting met markers, en is slecht bij enkel
  en voet ([Bini 2023](https://doi.org/10.1007/s11332-023-01075-7)).
- OpenPose zat er 4–8° naast ([Bini 2023](https://doi.org/10.1080/02640414.2023.2194725)).
- Dat is bijna zo breed als de richtwaarde zelf. Een advies kan dus alleen bij een
  duidelijke afwijking, gevolgd door opnieuw meten.

**Overige afstellingen.** Voor stuurhoogte, cranklengte, Q-factor en schoenplaatjes zijn
geen duidelijke aanbevelingen ([Husband 2024](https://doi.org/10.1080/02640414.2024.2394752)).

## Zwift Ride

- **Drie schuiven:** zadelhoogte, stuurhoogte en bereik, elk met één bout (10 Nm).
  Naar voren of achteren gaat alleen via de zadelrails.
- **Letters:** A tot en met X. Elke letter is 2 cm lichaamslengte, van A = 152 cm tot
  X = 198 cm, met dezelfde letter op alle drie de schuiven
  ([fitkaart](https://wahoofitness.com/media/wysiwyg/cms/zwift/ride/zwift-ride_guide_bike-fit_a-1.pdf)).
- **Geen omrekening naar mm.** Zwift publiceert geen tabel van letter naar millimeter
  en heeft geen bikefit-hulp
  ([forum, december 2025](https://forums.zwift.com/t/zwift-ride-with-bike-fitting/661745)).
- **Niet uit te lezen.** De afstelling is mechanisch; een app kan de letters niet zien.
- **V2** (september 2026):
  - lichaamslengte vanaf 146 cm;
  - een stuur dat bijna 4 cm lager kan;
  - een kop op de zadelpen met vier standen, ongeveer 30 mm verschil naar voren of
    achteren;
  - nieuwe tekens op de schaal, waarvan niet bekend is wat ze betekenen
    ([Zwift Insider](https://zwiftinsider.com/zwift-ride-v2/)).
- **Stuur:** 420 mm hart op hart.
- **Cranks:** standaard 170 mm. De verstelbare cranks van Zwift gaan van 160 tot 175 mm.

De eigenaar heeft een V2. Met de meetproef kan hij meten hoeveel kniehoek één letter
op de zadelpen scheelt.

## Techniek

- **MediaPipe Tasks Vision 0.10.35**, vastgezet.
  - Vanaf versie 1.0 stuurt de bibliotheek elke minuut gebruiksgegevens naar
    `odml.pa.googleapis.com`, zonder beeld maar ook zonder manier om het uit te zetten.
  - In 0.10.35 staat dat adres niet; dat is in het pakket nagezocht, in de JS en de WASM.
  - Het beeld wordt op het toestel verwerkt.
- **Modellen:**
  - pose landmarker lite (5,8 MB): 33 lichaamspunten plus een masker van de persoon;
  - selfie segmenter (0,25 MB): als tweede masker, ter vergelijking.
- **Herkomst van de bestanden.** Sinds de bèta voor leden (2026-11-08) komen WASM en
  modellen van ZWB zelf, onder `/mediapipe/`. De modellen staan in git; de WASM zet
  `scripts/kopieer-mediapipe.mjs` bij elke build uit `node_modules` neer. Een
  service worker cachet ze niet, want die is er alleen voor wie pushmeldingen
  aanzet. Elk lid haalt dus eenmalig ongeveer 17 MB op; let op de Netlify-tegoeden.
- **Camerarecht:** `Permissions-Policy: camera=(self)` geldt alleen op
  `/beheer/houding-meetproef` en `/zwbeter-worden/materiaal/houding`; elders blijft
  `camera=()`.
- **Bekende risico's:**
  - een app op het beginscherm van een iPhone vergeet soms de cameratoestemming;
  - warmte en batterij bij 20–30 minuten meten. De proef rekent daarom 15 beelden per
    seconde door en houdt het scherm aan met de Wake Lock.

## De meetproef (`/beheer/houding-meetproef`)

Alleen voor wie `roles.manage_permissions` heeft. Er wordt niets opgeslagen; de
resultaten gaan als CSV naar het klembord of als bestand naar je toestel.

**Vooraanzicht.**
1. Zet de camera recht voor de fiets, op ongeveer stuurhoogte.
2. Klik beide stuureinden aan, met de stuurbreedte in mm erbij (standaard 420).
3. Kies het masker (pose of selfie) en druk op **Basis** in je normale houding.
4. Rijd. De grafiek toont het oppervlak per seconde ten opzichte van de basis.

**Zijaanzicht.**
1. Zet de camera liggend, op 2–3 m, recht van opzij en op zadelhoogte. Geen
   groothoeklens, goed licht.
2. **Staand meten:** sta 3 seconden stil en rechtop naast de fiets, in beeld.
3. Rijd op 75–95 omwentelingen per minuut. Je ziet:
   - de kniebuiging onderin en bovenin, als mediaan van de laatste tien omwentelingen;
   - de kniebuiging onderin min de staande meting;
   - de heuphoek bovenin, de romp, de elleboog en de cadans.

**Controle met de hand.**
1. **Bevries en meet na** zet het kale beeld vast, precies het beeld dat het model zag.
2. Klik in het zijaanzicht heup, knie en enkel aan; in het vooraanzicht de omtrek van
   de renner.
3. **Vergelijk** zet model en hand naast elkaar in de tabel.

**Wat de proef moet uitwijzen.**
1. Verschilt de kniehoek van het model minder dan ongeveer 5° van de hand, over minstens
   tien beelden op verschillende plekken in de trap?
2. Verschilt het oppervlak van het masker minder dan een paar procent van de omtrek met
   de hand? En welk masker is beter, pose of selfie?
3. Kan het model een verschil van één letter op de zadelpen zien in de kniehoek onderin?
4. Hoe houdt een telefoon 20 minuten meten vol: beelden per seconde, warmte, batterij?
5. Werkt het op de iPhone, ook als app op het beginscherm?

~~Pas daarna besluit de eigenaar of er een functie voor leden komt.~~ De eigenaar
koos ervoor om niet te wachten: sinds 2026-11-08 is er een bèta voor leden op
`/zwbeter-worden/materiaal/houding`, met alleen de delen die niet afhangen van
vraag 1 tot en met 3:
- een vergelijking van voren in procent ten opzichte van een basis, zonder
  stuurschaal;
- de knie onderin met de richtwaarde 33–43° en een meetmarge van 5°;
- romp, elleboog en cadans zonder richtwaarde.

Advies in Zwift Ride-letters komt er pas als vraag 3 met ja beantwoord is.
