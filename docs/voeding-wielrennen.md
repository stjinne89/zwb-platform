# Voeding voor wielrenners — onderbouwing van de voedingsmodule

Onderzoek van 2026-09-17, als basis voor de tab Voeding in ZWBeter Worden.
Bijgewerkt op 2026-10-02, nadat de volledige tekst van het UCI-positiestandpunt
is gelezen (zie §0). Dit
document legt vast welke richtlijnen de code gebruikt, waar ze vandaan komen en
waar het bewijs ophoudt. De samenvattingen voor leden staan in
`src/lib/nutrition/library.ts`; de getallen in `src/lib/nutrition/targets.ts` en
`src/lib/nutrition/day-type.ts`.

## Uitgangspunten

- **Hiërarchie van bewijs.** Consensus- en positiestukken eerst, daarna
  systematische reviews en narratieve reviews van de auteurs die die
  consensus schrijven. Losse studies alleen als ze een richtlijn verklaren
  (eiwitbehoefte, eiwit voor het slapen, keto).
- **Wielerspecifiek waar het kan.** In 2025–2026 verscheen het *UCI Sports
  Nutrition Project*: veertien reviews en één positiestandpunt, met 54
  onderzoekers. Dat is de ruggengraat.
- **Alles per kg lichaamsgewicht.** Zo formuleren de bronnen het. Er komt geen
  kcal-doel in beeld (zie §7).
- **Regelgebaseerd, geen AI.** Uitlegbaar, toetsbaar, en er worden geen
  macro's of richtlijnen verzonnen.

## 0. Wat de volledige tekst van het positiestandpunt veranderde (2026-10-02)

Op 2026-09-17 zat het positiestandpunt (Burke et al. 2026) achter een
betaalmuur; de getallen kwamen toen uit de open onderliggende reviews. De
eigenaar leverde op 2026-10-02 de pdf aan. Naast elkaar gelegd:

| Onderwerp | Stond in de code | Positiestandpunt | Besluit |
|---|---|---|---|
| Eiwit per dag | 1,6–1,8 g/kg | 1,6–2,1 g/kg (tabel 2) | Overgenomen |
| Onderweg, > 2,5 uur | 60–90 g/u | 90 g/u (tabel 3) | Band blijft 60–90; de tekst noemt 90 als doel |
| Onderweg, 40–75 min | niets | Mondspoelen kan helpen | Alleen in de kennisbank |
| Herstel | 1,0–1,2 g/kg/u, 0,3 g/kg eiwit | Idem (0,3–0,4+ g/kg), plus vocht 125–150% van het verlies over 4–6 uur, met natrium | Tekst in de kennisbank |
| Koolhydraten per dag | 3–12 g/kg (ACSM) | 5–7 licht, 6–10 matig (< 3 u/dag), > 8 intensief (> 4 u/dag), 10–25 extreem | Niet overgenomen, zie hieronder |
| Soort eten per dag | niet | Zie §12 | Stuurt de receptkeuze |
| Micronutriënten | niet | Calcium 800–1200 mg/dag; vitamine D > 50, liefst 75 nmol/l | Kennisbank; labels per recept |

- **Waarom de dagbanden niet zijn overgenomen.** Het positiestandpunt richt zich
  uitdrukkelijk op elite-renners ("particularly targeted to the elite levels")
  en geeft geen band voor een rustdag. De ACSM-banden beginnen bij 3–5 g/kg en
  passen bij leden die naast hun werk trainen. De bovenkant (8–12 g/kg op een
  lange dag) valt binnen wat het positiestandpunt voor intensieve training
  noemt.
- **120 g/u.** Het positiestandpunt noemt het een waargenomen praktijk bij profs
  waarvan het nut nog gevalideerd moet worden. Dat blijft dus tekst, geen
  rekenregel.
- **Niet overgenomen: gewichtstrucs.** Het low-residue-dieet (48–72 uur weinig
  vezels voor ongeveer 0,7% minder gewicht) en bewust uitdrogen voor een weging
  staan in het positiestandpunt als praktijk. ZWB bouwt daar niets voor: het
  botst met §7, en het stuk waarschuwt zelf voor de weegcultuur in esports.

## 1. Brandstof volgens de training

| Dagtype in ZWB | Wanneer | Koolhydraten |
|---|---|---|
| rust | geen training | 3–5 g/kg |
| licht | < 60 min of herstelrit | 3–5 g/kg |
| matig | 60–90 min duur/tempo | 5–7 g/kg |
| zwaar | ≥ 60 min drempel/VO2max/anaeroob, of ≥ 90 min, of een race < 3 u | 6–10 g/kg |
| lang | ≥ 180 min | 8–12 g/kg |
| wedstrijd | race ≥ 180 min | 8–12 g/kg |

- **Bandbreedtes.** Die komen uit ACSM/AND/DC (Thomas et al. 2016) en
  Burke et al. (2011), en zijn overgenomen in het UCI-positiestandpunt.
- **Omzetting naar dagtypes.** Die is van ZWB. De bronnen spreken van
  "matig, ongeveer een uur", "1–3 uur matig tot hoog" en "4–5 uur of meer". De
  drempels van 60, 90 en 180 minuten zijn onze vertaling daarvan.
- **"Fuel for the work required".** De koolhydraten volgen de sessie, niet de
  kalender (Impey et al. 2018; Morton et al. 2025). Train-low noemen we alleen
  als gericht hulpmiddel. De adaptatiewinst op celniveau is duidelijker dan de
  prestatiewinst (Impey et al.: signalering verbeterde in 73% van de studies,
  prestatie in 37%).

Bronnen:
- Burke LM, Dolan E, Gonzalez JT, Mujika I, Jeukendrup AE, et al. (2026). UCI Sports Nutrition Project: Position Statement on Nutrition for Cycling. *IJSNEM*. doi:10.1123/ijsnem.2026-0135 — https://pubmed.ncbi.nlm.nih.gov/42744290/ · https://biblio.ugent.be/publication/01M2N1VZRCCYTRZ8VBE94DATBG
- Morton JP, Hearris M, Fell MJ, Owens DJ, Halson S, Trommelen J (2025). UCI Sports Nutrition Project: Nutritional Periodization. *IJSNEM* — https://pubmed.ncbi.nlm.nih.gov/41130458/
- Impey SG, Hearris MA, Hammond KM, et al. (2018). Fuel for the Work Required. *Sports Med* 48:1031–1048 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5889771/
- Burke LM, Hawley JA, Wong SHS, Jeukendrup AE (2011). Carbohydrates for training and competition. *J Sports Sci* 29(S1):S17–S27 — https://www.tandfonline.com/doi/full/10.1080/02640414.2011.585473
- Thomas DT, Erdman KA, Burke LM (2016). Nutrition and Athletic Performance. *J Acad Nutr Diet* 116(3):501–528 — https://pubmed.ncbi.nlm.nih.gov/26920240/
- Stellingwerff T, Morton JP, Burke LM (2019). A Framework for Periodized Nutrition for Athletics. *IJSNEM* 29(2):141 — https://pubmed.ncbi.nlm.nih.gov/30632439/

## 2. Voor de rit en stapelen

- **Maaltijd vooraf.** 1–4 g/kg koolhydraten, 1–4 uur voor de start. ZWB rekent
  de snack "voor de rit" op 1 g/kg: de onderkant, omdat die het dichtst bij de
  start zit.
- **Stapelen.** 10–12 g/kg gedurende 36–48 uur, alleen zinvol bij inspanningen
  van meer dan ongeveer 90 minuten.
- Bronnen: Burke et al. 2011; Thomas et al. 2016; Kerksick CM et al. (2017), ISSN
  position stand: nutrient timing — https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/

## 3. Koolhydraten tijdens de rit

| Rijduur | ZWB rekent met |
|---|---|
| < 60 min | niets |
| 60–150 min | 30–60 g/u |
| ≥ 150 min | 60–90 g/u |

- **Tot 120 g/u.** Bij getrainde renners kan dat de oxidatie verder verhogen
  (Morton et al. 2026). Het vraagt wel darmtraining. Het staat daarom in de
  kennisbank, maar niet als standaard in de rekenregel.
- **Mix van suikers.** Fructose:glucose 0,6–1,0 werkt het best. Gewone suiker
  (sucrose) is 1:1; de zelfgemaakte sportdrank in de recepten gebruikt dat.
- **Vorm.** Drank, gel en reep geven vergelijkbare oxidatie.
- **Hitte en hoogte.** Die verlagen de oxidatie met 20–50%. De richtlijn
  verandert daardoor niet.
- **Profpeloton.** Het ≥100 g/u daar hangt samen met een hoge dagelijkse inname.
  Dat is observationeel, en de overdraagbaarheid naar recreanten is onbekend
  (Wilson 2025).

Bronnen:
- Morton JP, Fell JM, Gonzalez JT, Hearris MA, Podlogar T, Pugh JN, Wallis GA (2026). *J Nutr* 156(5):101442 — https://pmc.ncbi.nlm.nih.gov/articles/PMC13197957/
- Podlogar T, Wallis GA (2022). New Horizons in Carbohydrate Research and Application for Endurance Athletes. *Sports Med* 52(Suppl 1):5–23 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9734239/
- Wilson PB (2025). A Narrative Review of the High-Carbohydrate Fueling Revolution (≥100 g/h) in the Professional Peloton. *Sports Med* 56(2):295–313 — https://link.springer.com/article/10.1007/s40279-025-02372-6
- Jeukendrup AE, et al. (2026). UCI Sports Nutrition Project: Race Nutrition for Road Cycling. *IJSNEM* — https://pubmed.ncbi.nlm.nih.gov/41911900/

## 4. Darmtraining en maagklachten

- **Darmtraining.** Maagontlediging en opname zijn trainbaar. Stapsgewijs
  oefenen met de hoeveelheid en producten van wedstrijddag verlaagt klachten.
- **Low-FODMAP en probiotica.** Het bewijs is beperkt.
- **Stapgrootte in de kennisbank.** De ophoging van 10–15 g/u per stap is een
  praktische vertaling, geen harde grens uit de bronnen.

Bronnen:
- Jeukendrup AE (2017). Training the Gut for Athletes. *Sports Med* 47(Suppl 1):101–110 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5371619/
- Costa RJS, Gaskell SK, Henningsen K, et al. (2025). SDA/USSF Joint Position Statement: Exercise-Associated Gastrointestinal Perturbations and Symptoms. *Sports Med* 55:1097–1134 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12106582/
- Systematische review (2025). Nutritional strategies for minimizing gastrointestinal symptoms during endurance exercise. *JISSN* 22(1) — https://www.tandfonline.com/doi/full/10.1080/15502783.2025.2529910

## 5. Eiwit

- **Per dag.** 1,6–2,1 g/kg (UCI-positiestandpunt, tabel 2). De onderkant sluit
  aan op Kato et al., die met de IAAO-methode bij duursporters een gemiddelde
  behoefte van 1,65 en een aanbevolen inname van 1,83 g/kg maten. Kanttekening
  bij Kato: zes mannen, één inspanningsdag.
- **Wanneer de bovenkant.** Op rustdagen na zwaar werk, en in periodes met
  weinig energie of koolhydraten. Op dagen met heel veel koolhydraten is het
  dagtotaal lastig te halen; het positiestandpunt raadt aan dat op hersteldagen
  in te halen.
- **Verdeling.** Of spreiden over de dag op lange termijn extra oplevert, noemt
  het positiestandpunt onzeker. Het helpt wel om het dagtotaal te halen.
- **Spiermassa.** Boven ongeveer 1,6 g/kg voegt eiwit weinig toe aan spiermassa
  (Morton et al. 2018, bij krachttraining). De hogere band is er voor herstel
  en behoud, niet voor meer spier.
- **Per maaltijd.** 0,3–0,4 g/kg (ISSN). ZWB rekent met het midden, 0,35 g/kg.
- **Voor het slapen.** Ongeveer 40 g (Snijders et al. 2019). Trommelen et al.
  (2023) vonden met 45 g na een avondrit meer mitochondriale en myofibrillaire
  eiwitsynthese, zonder verschil tussen caseïne en whey.

Bronnen:
- Kato H, et al. (2016). *PLoS One* 11(6):e0157406 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4913918/
- Morton RW, Murphy KT, McKellar SR, et al. (2018). *Br J Sports Med* 52(6):376–384 — https://pubmed.ncbi.nlm.nih.gov/28698222/
- Snijders T, Trommelen J, Kouw IWK, Holwerda AM, Verdijk LB, van Loon LJC (2019). *Front Nutr* 6:17 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6415027/
- Trommelen J, van Lieshout GAA, Pabla P, et al. (2023). *Sports Med* 53:1445–1455 — https://pmc.ncbi.nlm.nih.gov/articles/PMC10289916/

## 6. Herstel en vocht

- **Snel herstel.** Valt de volgende zware sessie binnen ongeveer 8 uur, dan
  1,0–1,2 g/kg/u koolhydraten in de eerste uren. ZWB geeft deze tip als je al
  gereden hebt en er vandaag nog een sessie gepland staat. De receptportie "na
  de rit" rekent met 1,0 g/kg koolhydraten en 0,3 g/kg eiwit.
- **Vocht.** Begin gehydrateerd. Houd het verlies onder ongeveer 2% van je
  gewicht, maar drink niet meer dan je zweet.
- **Natrium.** Vooral bij lange of hete inspanningen en veel zweetverlies.
  Voorladen (20–40 mg/kg met 10 ml/kg vocht, 1–2 uur vooraf) helpt alleen in
  specifieke situaties in de hitte. Dat staat bewust niet als tip in de app.
- **Indoor.** Weinig rijwind betekent veel zweet. De UCI-review over esports
  baseert zich deels op interviews, omdat er weinig studies zijn.

Bronnen:
- Thomas et al. 2016; Kerksick et al. 2017; Morton et al. 2025 (zie boven).
- McCubbin AJ, Allanson BA, et al. (2020). SDA Position Statement: Nutrition for Exercise in Hot Environments. *IJSNEM* 30(1):83 — https://journals.humankinetics.com/view/journals/ijsnem/30/1/article-p83.xml
- McCubbin AJ (2023). Modelling sodium requirements of athletes across a variety of exercise scenarios. *Eur J Sport Sci* — https://onlinelibrary.wiley.com/doi/10.1080/17461391.2022.2083526
- Cheung S, et al. (2025). UCI Sports Nutrition Project: Special Environments. *IJSNEM* — https://pubmed.ncbi.nlm.nih.gov/41468209/
- Whitfield J, Mujika I, Burke LM (2026). UCI Sports Nutrition Project: Nutrition for Esports and Gravel. *IJSNEM* — https://pubmed.ncbi.nlm.nih.gov/41569815/

## 7. Genoeg eten: REDs, en waarom er geen kcal-doel is

- **Wat REDs is.** Langdurig te lage energiebeschikbaarheid schaadt stofwisseling,
  hormonen, botten, immuniteit, glycogeenopbouw en prestatie, bij vrouwen én
  mannen. Wielrennen heeft door de focus op laag gewicht een verhoogd risico.
- **Gevolgen voor het ontwerp:**
  - Geen caloriedoel en geen afvalfunctie.
  - Geen vetpercentage.
  - Geen eetdagboek.
  - Bij vermoeidheid (readiness "recovery" of wellness "fatigued") zegt de tip
    "eet genoeg".
  - Een test bewaakt dat geen tiptekst om minder eten vraagt.
- **Lengte.** Wordt alleen gebruikt voor Mifflin-St Jeor, om de *vaste*
  receptingrediënten mee te schalen. Die schatting komt nooit in beeld.

Bronnen:
- Mountjoy M, Ackerman KE, et al. (2023). IOC consensus statement on REDs. *Br J Sports Med* 57(17):1073–1097 — https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/BJSM-IOC-consensus-statement-on-Relative-Energy-Deficiency-in-Sport-REDs.pdf
- Burke LM, et al. (2026). UCI Sports Nutrition Project: Body Composition, Energy Requirements, and Energy Availability in Cycling. *IJSNEM* — https://pubmed.ncbi.nlm.nih.gov/41911915/

## 8. Vrouwen en ijzer

- **Cyclusfase.** Het effect op prestatie is gemiddeld triviaal. De studies zijn
  vaak van lage kwaliteit en verschillen sterk onderling. Algemene regels per
  fase zijn dus niet te onderbouwen (McNulty et al. 2020). ZWB maakt ze niet en
  verwijst naar persoonlijke observatie in het logboek.
- **IJzertekort.** Komt vaak voor bij vrouwelijke en duursporters, en bij 5–11%
  van mannelijke atleten. Suppleren alleen na bloedonderzoek.

Bronnen:
- Sims ST, Kerksick CM, Smith-Ryan AE, et al. (2023). ISSN position stand: nutritional concerns of the female athlete. *JISSN* 20(1):2204066 — https://www.tandfonline.com/doi/full/10.1080/15502783.2023.2204066
- McNulty KL, Elliott-Sale KJ, Dolan E, et al. (2020). *Sports Med* 50:1813–1827 — https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/
- Sim M, Garvican-Lewis LA, Cox GR, et al. (2019). Iron considerations for the athlete. *Eur J Appl Physiol* 119(7):1463–1478 — https://pubmed.ncbi.nlm.nih.gov/31055680/

## 9. Supplementen

- **Sterke onderbouwing voor wielrennen.** Cafeïne, creatine,
  natriumbicarbonaat, bèta-alanine, nitraat en glycerol, elk voor specifieke
  situaties (UCI-review 2026).
- **Cafeïne.** 3–6 mg/kg, ongeveer 60 minuten vooraf, met grote individuele
  verschillen (ISSN 2021).
- **Contaminatierisico.** In Nederland: NZVT-geteste batches. Ook NZVT geeft geen
  100% garantie.
- **ZWB noemt geen merken** en geeft geen doseeradvies per lid.

Bronnen:
- Maughan RJ, Burke LM, Dvorak J, et al. (2018). IOC consensus statement: dietary supplements and the high-performance athlete. *Br J Sports Med* 52(7):439–455 — https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/13136/Maughan_2018_BJSM_IOCconsensus_CC.pdf
- Whitfield J, et al. (2026). UCI Sports Nutrition Project: Sports Foods and Supplements in Cycling. *IJSNEM* — https://pubmed.ncbi.nlm.nih.gov/41570809/
- Guest NS, VanDusseldorp TA, Nelson MT, et al. (2021). ISSN position stand: caffeine and exercise performance. *JISSN* 18:1 — https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/
- AIS Sports Supplement Framework — https://www.ausport.gov.au/ais/nutrition/supplements
- Dopingautoriteit, NZVT — https://www.dopingautoriteit.nl/programmas/nzvt

## 10. Low-carb en keto

Bij elite snelwandelaars verhoogde een ketogeen dieet de vetverbranding, maar
verslechterde het de efficiëntie bij wedstrijdtempo. Het prestatievoordeel van
het trainingsblok verdween. De groepen met veel of geperiodiseerde koolhydraten
werden wél sneller. Kanttekening: kleine groepen, snelwandelaars en geen
wielrenners.

- Burke LM, Ross ML, Garvican-Lewis LA, et al. (2017). *J Physiol* 595(9):2785–2807 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5407976/

## 11. Gezonde basis en receptdata

- **Nederlandse richtlijnen.** Gezondheidsraad, Richtlijnen goede voeding 2015 —
  https://www.gezondheidsraad.nl/documenten/2015/11/04/richtlijnen-goede-voeding-2015
- **Voedingswaarden.** NEVO-online versie 2025/9.0, RIVM (CC-BY 4.0) —
  https://www.rivm.nl/nederlands-voedingsstoffenbestand. Het bestand is op
  2026-09-17 gedownload na akkoord op de voorwaarden. Die voorwaarden zeggen:
  - Gebruik alleen in ongewijzigde vorm, met bron en versie.
  - Berekeningen vermelden "Gebaseerd op gegevens van NEVO-online versie
    2025/9.0, RIVM, Bilthoven".
  - Eindgebruikers mogen geen kosten in rekening gebracht krijgen voor de data.
- **Hoe ZWB dat invult:**
  - Alle 2.328 producten staan ongewijzigd in `nutrition_foods`. Sinds
    2026-10-02 ook de productgroep, calcium, ijzer, magnesium, zink, vitamine D,
    vitamine C, EPA en DHA (bestand opnieuw gedownload na akkoord op de
    voorwaarden). EPA en DHA staan apart, zoals NEVO ze levert; optellen gebeurt
    in de code.
  - Lege NEVO-waarden blijven `null`.
  - Een receptportie met zo'n waarde toont "≥".
- **Aanpak receptenboek.** Lis DM, et al. (2026). UCI Sports Nutrition Project:
  Plate to Performance — https://pubmed.ncbi.nlm.nih.gov/41946455/

## 12. Het soort eten per dag

Het positiestandpunt (thema 7, naar Lis & Strobel 2026) beschrijft hoe
ploegkoks de richtlijnen naar het bord vertalen:

- **Zware trainingsdag of wedstrijd.** Koolhydraatrijk, licht verteerbaar,
  relatief weinig vezels en weinig volume. Zo haal je veel koolhydraten zonder
  maagklachten.
- **Rustdag of lichte dag.** Minder koolhydraten; meer eiwit, micronutriënten
  en vezelrijke producten, voor herstel, afweer en darmgezondheid.
- **Vet.** 20–35% van de energie, tegengesteld aan koolhydraten: weinig op
  dagen met veel koolhydraten, meer op rustige dagen.
- **Voor de rit.** In de laatste één tot drie uur geeft veel vet of eiwit bij
  gevoelige renners sneller klachten (thema 6).

De bronnen geven hier geen grammen. Waar de receptkeuze drempels gebruikt voor
"licht verteerbaar" of "vezelrijk", zijn dat vertalingen van ZWB; ze staan bij
de receptkeuze hieronder.

Bron: Lis DM, Strobel N (2026). UCI Sports Nutrition Project: Plate to
Performance. *IJSNEM* 36(3):335–351 — https://doi.org/10.1123/ijsnem.2025-0198

## 13. Bot, weerstand en ouder worden

- **Bot.** Wielrenners, vooral wegrenners, hebben een lagere botmassa dan andere
  sporters en dan niet-sporters. Oorzaken: weinig stootbelasting, meer
  botafbraak na lange ritten, lage energiebeschikbaarheid. Lage
  koolhydraatbeschikbaarheid lijkt daarbij zwaarder te wegen dan energie alleen.
  Calcium 800–1200 mg/dag; vitamine D monitoren bij risico.
- **Weerstand.** Genoeg energie en koolhydraten zijn de kern. Voor polyfenolen
  komt het bewijs vooral uit supplementstudies; voor probiotica is het bij
  sporters wisselend.
- **Masters.** Spieren reageren minder op training en eiwit; eiwit en
  botnutriënten wegen zwaarder. De dorstprikkel neemt af. Het positiestandpunt
  noemt geen leeftijdsgrens en geen aparte getallen, dus de code rekent voor
  oudere leden niet anders.

Bronnen:
- Saffioti N, et al. (2026). UCI Sports Nutrition Project: Does Cycling Create a "Perfect Storm" for Bone Health? *IJSNEM* 36(3):324–334 — https://doi.org/10.1123/ijsnem.2025-0033
- Wilson PB, Pyne DB, Rotunno A (2026). UCI Sports Nutrition Project: Illnesses and Injuries in Elite Cycling. *IJSNEM* 36(3):352–368 — https://doi.org/10.1123/ijsnem.2025-0144
- Aragon AA, Tipton KD, Schoenfeld BJ (2023). Age-related muscle anabolic resistance. *Nutr Rev* 81(4):441–454 — https://doi.org/10.1093/nutrit/nuac062
- Gonzalez J, et al. (2026). Nutritionally Relevant Technological Advancements in Professional Cycling. *IJSNEM* 36(3):369–381 — https://doi.org/10.1123/ijsnem.2025-0048. Vermogensmeters zijn bruikbaar om energieverbruik te schatten; glucosesensoren en zweetsensoren zijn dat voor voedingskeuzes nog niet.

## Receptschaling

Elk ingrediënt heeft een rol:
- **`kh_bron`** schaalt naar het koolhydraatdoel van het moment.
- **`eiwit_bron`** schaalt naar het eiwitdoel.
- **`vast`** schaalt mee met de verhouding van je ruststofwisseling tot die van
  een referentierenner (70 kg, 180 cm, 35 jaar). Zonder lengte wordt dat de
  gewichtsverhouding, begrensd op 0,75–1,5.

Elke factor blijft tussen 0,5 en 2, zodat het hetzelfde gerecht blijft.

Doelen per moment (`mealTarget`):

| Moment | Koolhydraten | Eiwit |
|---|---|---|
| ontbijt / lunch / diner | 25% / 20% / 30% van het dagmidden | 0,35 g/kg |
| tussendoor | 10% van het dagmidden | — |
| voor de rit | 1 g/kg | — |
| tijdens de rit | midden van de g/u-band (één portie = één uur) | — |
| na de rit | 1,0 g/kg | 0,3 g/kg |
| voor het slapen | — | 40 g |

**De verdeling over maaltijden is van ZWB, niet uit een bron.** De bronnen geven
dagtotalen en momenten rond de rit, geen percentages per maaltijd.

## Receptkeuze: het dagmenu

`src/lib/nutrition/menu.ts` kiest per moment één recept. De bronnen zeggen welk
soort eten bij welke dag hoort (§12); hoe dat in punten wordt omgezet is van ZWB.

- **Momenten.** Altijd ontbijt, lunch en diner. Tussendoor vanaf een matige dag.
  Voor de rit zolang de geplande rit nog moet komen; tijdens de rit vanaf 60
  minuten; na de rit vanaf 60 minuten gepland of gereden; voor het slapen na een
  avondrit en op zware, lange en wedstrijddagen.
- **Passende portie.** De geschaalde portie wordt naast het doel van dat moment
  gelegd. Koolhydraten tellen in beide richtingen en wegen dubbel. Eiwit telt
  alleen als het doel niet gehaald wordt: de meeste maaltijden met vlees, vis
  of peulvruchten zitten ruim boven 0,35 g/kg, en dat is geen slechtere keuze.
- **Profiel.** Zware dag, of diner vóór een zware dag: koolhydraatrijk eerst.
  Rustdag: eiwitrijk eerst. Anders gemengd eerst.
- **Soort eten.** Licht verteerbaar telt mee vóór de rit en bij de
  hoofdmaaltijden op zware dagen; vezelrijk op rust- en lichte dagen.
- **Voorkeur.** Een favoriet krijgt een bonus; "niet voor mij" valt af.
- **Afwisseling.** Alles binnen 0,2 punt van de beste telt als gelijkwaardig en
  schuift per dag één plek op. De hoofdmaaltijden krijgen op één dag niet twee
  keer dezelfde koolhydraatbasis, tenzij het lid zelf doorklikt.

De gewichten (profiel 0,3 en 0,15; soort eten 0,15; favoriet 0,25; band 0,2)
zijn gekozen, niet gemeten. Gemeten is wat ze opleveren: bij 55, 70 en 90 kg
heeft elk moment op elk dagtype een clubrecept dat het doel voor minstens 85%
haalt (test), en over veertien dagen toont het menu bij 70 kg per moment 7 tot
14 verschillende recepten. Uitzondering: de lunch op zware, lange en
wedstrijddagen, met 4 of 5.

### Labels per portie (`traits.ts`)

| Label | Regel | Herkomst |
|---|---|---|
| Vezelrijk | ≥ 3 g vezels per 100 kcal | Verordening (EG) 1924/2006 |
| Licht verteerbaar | < 1,5 g vezels per 100 kcal én ≤ 25% van de energie uit vet | Vezelgrens: onder "bron van vezels" uit dezelfde verordening. Vetgrens: eigen keuze, de onderste helft van de 20–35% uit het positiestandpunt |
| Rijk aan calcium, ijzer, magnesium, zink, vitamine D, vitamine C | ≥ 30% van de referentie-inname per portie | Verordening (EU) 1169/2011 bijlage XIII voor de referentie-innames. De verordening rekent per 100 g; per portie is onze vertaling |
| Rijk aan omega-3 | ≥ 0,25 g EPA + DHA per portie | De dagelijkse inname die EFSA toereikend noemt |

Een waarde die in NEVO ontbreekt telt als nul. Een label verschijnt dus alleen
als de bekende waarden de grens al halen. Er is geen dagtotaal: zonder
eetdagboek valt dat niet te berekenen.

### Waar de recepten vandaan komen

- **120 clubrecepten** in `scripts/nutrition/standard-recipes.json`: de 24 uit de
  eerste ronde, 25 naar een externe bron en 71 nieuwe eigen.
- **Externe bronnen.** 24 gerechten naar de receptenverzameling van het
  Australian Institute of Sport (https://www.ausport.gov.au/ais/nutrition/recipes,
  343 recepten van sportdiëtisten) en één naar het Voedingscentrum. Overgenomen
  is het gerecht: de ingrediënten en ongeveer de verhoudingen. De bereiding is
  opnieuw beschreven en de voedingswaarden zijn met NEVO berekend. Elk recept
  noemt zijn bron met een link.
- **Aangepast ten opzichte van de bron.** Producten die NEVO niet kent zijn
  vervangen (ingedikte melk door halfvolle melk, vissaus weggelaten, hokkien
  noodles door pasta). Bij koolhydraatrijke hoofdmaaltijden is de koolhydraatbron
  15–25% groter gemaakt, zodat het recept op een zware of lange dag binnen de
  schaalgrenzen blijft; bij een aantal recepten is de eiwitbron kleiner gemaakt.
  Het recept in de app is dus niet het recept van de bron.
- **Recepten van leden.** Een lid kan een eigen recept voorstellen; wie schema's
  mag maken keurt goed of wijst af.
- **Niet gedaan.** Teksten of foto's overnemen. Het Voedingscentrum vraagt
  daarvoor schriftelijke toestemming van de afdeling Communicatie.

## Wat nog open is

- **Inhoudelijke controle.** De teksten en de 120 clubrecepten zijn niet door een
  (sport)diëtist nagekeken. Doe dat voordat de module breed wordt aangekondigd.
- **Dieetlabels.** Een test bewaakt dat een recept met het label vegetarisch,
  vegan, lactosevrij of glutenvrij geen product uit de verkeerde NEVO-groep
  bevat. Sporen en verborgen bestanddelen (melk in brood, gluten in
  sojasaus) ziet die test niet; bij twijfel heeft een recept het label niet.
- **Tekst van het UCI-positiestandpunt.** Afgehandeld op 2026-10-02, zie §0. De
  begeleidende reviews zelf zijn niet gelezen; wat hier uit Lis & Strobel,
  Saffioti en Wilson staat, komt uit de samenvatting in het positiestandpunt.
- **Dagtype-drempels.** De grenzen van 60, 90 en 180 minuten zijn een vertaling.
  Na een paar weken gebruik is het de moeite waard te kijken of de dagtypes
  kloppen met hoe leden hun dagen ervaren.
