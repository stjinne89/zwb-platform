# Variatie in lange ritten

Onderzoek van 2026-10-11, bij de zes lange duurritten in de workoutbibliotheek
(migratie `0227_workout_library_long_rides.sql`).

De literatuur is hier dunner dan bij intervaltraining. Er is veel
**beschrijvend** onderzoek (wie blijft er na uren nog hard rijden) en weinig
**interventies** (welke lange rit maakt je daar beter in). Per workout staat
hieronder wat gemeten is en wat onze afleiding is.

Van de twee studies van Almquist en van Matomäki is de volledige tekst gelezen.
Van de overige alleen de samenvatting. Het proefschrift van Gallo was niet te
openen; wat hier staat komt uit de samenvatting van een zoekmachine.

## Wat de studies zeggen

1. **Vermogen na uren werk is een eigen eigenschap ("durability").** Standaard
   tests meten je fris, terwijl drempel en maximaal vermogen tijdens een lange
   inspanning zakken. Hoeveel en hoe laat verschilt per renner.
   [Maunder e.a. 2021](https://link.springer.com/article/10.1007/s40279-021-01459-0)
2. **Het beslist wedstrijden.** Bij profs onderscheidt het vermogen na veel
   arbeid de succesvolle renners beter dan het frisse vermogen.
   [van Erp e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33731651/)
   Bij 112 profs daalde het recordvermogen (10 s tot 120 min) 1,6-3,0% na
   15 kJ/kg en 6,0-9,7% na 45 kJ/kg.
   [Valenzuela e.a. 2022](https://doi.org/10.1123/ijspp.2021-0403)
   Bij amateurs verloren de betere renners na 1.000 kJ 6,5% op een test van 20
   minuten, de mindere 12,5%; op 5 minuten was er geen verschil.
   [Frontiers 2025](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1530162/full)
3. **Rustige uren hangen samen met vermogen in vermoeide staat.** Bij 30
   beloften hing de tijd onder de eerste drempel samen met een beter
   2-minutenvermogen na 2.000 kJ, en een meer gepolariseerde verdeling met een
   beter 12-minutenvermogen. Het is een verband, geen proef.
   [Spragg e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/35239466/)
   Bij tien semiprofs werkte dezelfde training anders uit op fris en op vermoeid
   presteren.
   [Voet e.a. 2024](https://lida.sport-iat.de/ta/Record/4093401?lng=en)
4. **Bij ongetrainden helpt alles.** Tien weken rustig (6,8 uur per week) of
   intensief (1,6 uur) trainen verbeterde de durability even veel; alleen
   intensief verhoogde de VO2max. Het effect op het moment waarop de waarden
   gaan verlopen was klein.
   [Matomäki e.a. 2023](https://www.frontiersin.org/articles/10.3389/fphys.2023.1128111/full)
5. **Hard werk aan het eind van een lange rit: één proef, niet gepubliceerd in
   een tijdschrift.** Twintig getrainde renners, vier weken, gelijk volume en
   gelijke tijd per zone. Intervallen aan het eind van de lange rit neigden naar
   betere prestaties na 2,5 uur rijden; losse intervaltrainingen naar betere
   prestaties in frisse staat. De uitkomsten waren gemengd.
   [Gallo 2024, proefschrift](https://unige.iris.cineca.it/handle/11567/1174438)
6. **Niet alle arbeid weegt even zwaar.** Bij 17 profs zakte de critical power
   na arbeid bóven die grens (2,2% na 2,5 kJ/kg, 16,2% na 7,5 kJ/kg) en niet na
   dezelfde arbeid eronder.
   [Mateo-March e.a. 2024](https://abacus.universidadeuropea.com/entities/publication/eb16d5fd-1caf-4e4a-bd3c-7d5e506f5f11)
7. **Sprints in een rustige rit.** Drie series van 3 x 30 seconden voluit, met
   4 minuten herstel, één serie per uur in een rit van 3 uur: het vermogen bleef
   over de series gelijk (786, 783 en 771 W). In een trainingskamp van 14 dagen
   met twaalf sprints verdeeld over vijf rustige ritten steeg het sprintvermogen
   25 W; de controlegroep bleef gelijk. Negen renners per groep, klein effect.
   [Almquist e.a. 2021](https://www.frontiersin.org/articles/10.3389/fphys.2021.692622/full)
   In drie weken met minder training hield één rit per week met negen sprints
   het sprintvermogen op peil (+4% tegen -4%); het verschil op een test van 20
   minuten was niet significant, en er was geen extra mentale belasting.
   [Almquist e.a. 2020](https://www.frontiersin.org/articles/10.3389/fphys.2020.01000/full)
8. **Lage cadans: geen bewijs.** Twaalf weken blokken op 40 toeren gaf bij
   getrainde veteranen geen winst; de groep op vrije cadans deed het op enkele
   punten beter. De ene studie die wel winst vond, combineerde lage cadans met
   sprongen.
   [Kristoffersen e.a. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3907705/)

## Wat we eruit afleiden

- **Na ongeveer twee uur telt een inspanning als "vermoeid".** 15 kJ/kg is voor
  een renner van 75 kg 1.125 kJ. Met een FTP van 250 W en duurtempo op 65% is
  dat na krap twee uur bereikt. De proef van Gallo zat op 2,5 uur. Dit is een
  omrekening van profdata naar clubrenners, geen gemeten grens.
- **Rustig rijden ervoor maakt de rit niet zwaarder dan nodig** (punt 6), en de
  rustige uren zelf doen ertoe (punt 3). De aanloop blijft dus op 60-70%.
- **Hooguit één zo'n rit per week.** Het bewijs dat hard werk aan het eind beter
  werkt dan los is dun (punt 5); het kost wel meer herstel.

## De zes ritten

Doelen in %FTP. Allemaal vorm `duur`.

| Rit | Min | Opbouw | Onderbouwing |
|---|---|---|---|
| Duur 240 | 240 | 15 in · 3 x 70 @60-72 · 15 uit | Punt 3: volume onder de eerste drempel. De bibliotheek stopte bij 180 minuten. |
| Duur 180 met sprints | 180 | 15 in · 30 duur · serie · 40 duur · serie · 40 duur · serie · 10 uit. Een serie is 3 x (30 s voluit + 4,5 min los) | Punt 7, het protocol van Almquist overgenomen. Bewijs voor sprintvermogen, niet voor duurvermogen. |
| Duur 150 tempo aan het eind | 150 | 15 in · 75 @60-70 · 20 @81-86 · 5 duur · 20 @81-86 · 15 uit | Instap: tempo begint na anderhalf uur, dus vóór de grens van twee uur. Afleiding uit punt 5 en 6; tempo zelf is niet getest. |
| Duur 180 oplopend | 180 | 15 in · 60 @60-65 · 50 @66-70 · 40 @71-80 · 15 uit | Afleiding: het zwaarste stuk valt na twee uur, zonder boven de drempel te komen. Geen studie naar deze opbouw. |
| Duur 180 fris en moe | 180 | 15 in · 2 x 8 @93-100 · 110 @60-70 · 2 x 8 @93-100 · 15 uit | De meting uit punt 2 als training: vergelijk het vermogen van de tweede set met de eerste. Dat dit durability verbetert is coachpraktijk, geen gemeten effect. |
| Duur 210 drempel aan het eind | 210 | 15 in · 150 @60-70 · 3 x 8 @93-100 met 4 los · 13 uit | Punt 5: intervallen na 2,5 uur rustig rijden. De vorm van de intervallen bij Gallo kennen we niet; 3 x 8 is onze keuze. |

In een schema kleuren en heten ze naar hun kernwerk: de ritten met drempel
"Drempel", die met tempo "Tempo", de oplopende "Intensieve duur".

## Niet opgenomen

- **Blokken op lage cadans** (punt 8).
- **Nuchter of met lege glycogeenvoorraad rijden.** Hoort bij voeding, niet in
  een workoutblok; zie [voeding](voeding-wielrennen.md).
- **Ritten boven vier uur.** Zonder bewijs dat ze iets toevoegen wat 240
  minuten niet doet; een trainer kan de duurblokken verlengen.

## Open

Een sprint van 30 seconden gaat naar intervals.icu als stap op 150-200% FTP
(`BURST_FTP_RANGE`). Voluit ligt voor de meeste renners hoger. In ERG houdt de
trainer hem op dat doel; of dat in de praktijk stoort is niet getest.
