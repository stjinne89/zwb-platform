# Praktijktest trainer-cockpit

Doel van deze test: controleren of de volledige trainingsflow begrijpelijk en bruikbaar is voor renner en trainer. We testen toegang geven, intake maken, AI-concept genereren, reviewen, publiceren naar intervals.icu en daarna de koppeling richting Wahoo/Garmin.

## Belangrijk vooraf

Deze test publiceert echte workouts naar intervals.icu. Als intervals.icu met Wahoo of Garmin gekoppeld is, kunnen die workouts ook daar verschijnen.

Maak daarom bewust een kort weekplan. Gebruik herkenbare testnamen, bijvoorbeeld `ZWB test weekplan`, en ruim testworkouts na afloop op in intervals.icu/Wahoo/Garmin als je ze niet wilt bewaren.

Gebruik geen medische of privacygevoelige details in vrije tekstvelden. Algemene aandachtspunten zoals `testplan, rustig opbouwen` zijn genoeg.

## Benodigd

- Een trainer-account met rol `Trainer`.
- Een renner-account met intervals.icu gekoppeld.
- Bij voorkeur een Wahoo/Garmin-koppeling via intervals.icu.
- Optioneel: hersteldata delen via `Herstel & belastbaarheid`.

## Testscript renner

1. Log in en ga naar `/training`.
2. Controleer of intervals.icu gekoppeld is.
3. Zet `Herstel & belastbaarheid` aan als je hersteldata wilt delen.
4. Geef de trainer toegang via `Trainer-toegang`.
5. Maak een trainingsdoel aan voor maximaal 1 week:
   - titel: `ZWB test weekplan`;
   - doeltype naar keuze;
   - targetdatum binnen 7 tot 10 dagen;
   - beschikbare dagen: 2 tot 4 dagen;
   - max uren per week: bijvoorbeeld 3 tot 5 uur;
   - aandachtspunten: vermeld dat dit een testplan is.
6. Noteer of duidelijk was wat je deelt met de trainer.

## Testscript trainer

1. Log in en ga naar `/training?tab=trainer`.
2. Kies de renner in de linkerlijst.
3. Controleer of je ziet:
   - FTP/categorie;
   - belasting: CTL, TSB, CTL-doel, 28 dagen en komende workouts;
   - hersteltrend als de renner hersteldata deelt;
   - doelen/intake;
   - komende workouts.
4. Klik `AI-concept maken`.
5. Wacht tot het concept klaar is.
6. Beoordeel het schema:
   - is het ongeveer een weekplan?
   - kloppen duur, intensiteit en beschikbare dagen?
   - zijn herhalingen uitgesplitst in losse werk- en herstelblokken?
   - zijn wattage-ranges logisch?
   - houdt het plan rekening met herstel en aandachtspunten?
7. Pas minimaal een workout aan.
8. Controleer de grafische workoutblokken.
9. Keur het schema goed.
10. Publiceer naar intervals.icu.
11. Controleer in intervals.icu of workouts op de juiste dagen staan.
12. Controleer op Wahoo/Garmin of de workouts doorkomen of bruikbaar zijn.
13. Download eventueel een FIT-bestand vanuit ZWB en controleer of het workoutprofiel klopt.
14. Verwijder na afloop het testschema in ZWB en ruim testworkouts in intervals.icu/Wahoo/Garmin op als gewenst.

## Feedback die we willen ophalen

- Waar liep je vast of moest je nadenken?
- Was duidelijk dat publicatie echte kalenderitems maakt?
- Was een weekplan makkelijk genoeg te maken?
- Duurde AI-generatie acceptabel?
- Gaf de status tijdens AI-generatie genoeg feedback?
- Klopten de workouts na publicatie in intervals.icu?
- Kwamen workouts goed door naar Wahoo/Garmin?
- Klopten intervalblokken, rustblokken en wattage-ranges in Wahoo/Garmin/FIT?
- Was herstel/wellness zichtbaar genoeg voor trainer en renner?
- Waren foutmeldingen begrijpelijk?
- Wat voelde onveilig, onlogisch of te technisch?
