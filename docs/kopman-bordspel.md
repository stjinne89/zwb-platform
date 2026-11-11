# Kopman als bordspel — ontwerp

Opgesteld op 2026-11-11. Nog niets van dit ontwerp is gebouwd.

## Aanleiding

Na de rondes over materiaal, personeel en ruilen zei de eigenaar: "het spel
zelf is niet zo leuk". De vraag was om meer richting een bordspel te gaan,
"waarbij je met verschillende krachten kaarten speelt die het spel kunnen
beinvloeden en hoe je je kopman kan beschermen".

Het probleem met de huidige koers: de physics rekent alles uit en jij kijkt
toe. Je hebt één order per hand en daartussen gebeurt er weinig. Een bordspel
geeft je elke beurt een echte keuze.

## Keuzes van de eigenaar (2026-11-11)

- **Beslissing per sector: de physics-motor.** Eerst worden de kaarten
  gespeeld. Daarna rekent `race.ts` de sector uit, en je ziet dat als een
  korte animatie. Er komen geen losse bordspelgetallen voor snelheid of
  afstand.
- **Tegenstanders: computerploegen.** Spelen tegen andere mensen is voor
  later en hoort niet in dit ontwerp.
- **Lengte: 10 beurten,** ongeveer 5 minuten per koers.
- **Kopman wordt een losse game, niet een deel van ZWB.** De code staat nu in
  `src/kopman` binnen zwb-platform. Een importtest houdt die map los, zodat
  hij er later uit kan. Plannen voor het spel komen daarom in deze docs, niet
  in het ZWB-plannenboek.

## De kern

Een koers is een **bord van 10 sectoren**. Per sector speel je één beurt.

1. **Vooruitkijken.** Je ziet de huidige sector (terrein, lengte, gevaar) en
   de volgende. Je ziet ook wat de rivaliserende ploegen van plan zijn, zoals
   "Ploeg Rood maakt tempo op de klim".
2. **Kaarten spelen.** Je hebt 4 kaarten in je hand en speelt er maximaal 2.
   Elke kaart kost **kracht** van de renner die hem uitvoert.
3. **Reageren.** Speelt een rivaal een kaart die jou raakt, dan mag je één
   reactiekaart spelen.
4. **Uitrijden.** De physics rijdt de sector. Kaarten zetten een renner voor
   de duur van die sector in een rijstand, zoals de `Mode` en `Override` die
   er al zijn (`aanval`, `tempo`, `sparen`, `volgen`, `sprint`). Je ziet de
   groepen bewegen.
5. **Gevaar.** Elke sector trekt een gevaarkaart. Staat je kopman zonder
   dekking, dan raakt het gevaar hem.
6. **Aanvullen.** Je trekt kaarten tot je er weer 4 hebt, en de volgende
   sector begint.

De laatste sector is de **finale**: een klim, een sprint of de kasseien,
afhankelijk van de koers. Die beslist met de kracht die je kopman nog heeft,
zijn statistieken en je laatste kaarten.

## Middelen

- **Kracht** is wat een renner deze koers nog te geven heeft. Een kopman
  begint met 10 punten, een knecht met 6. Goud geeft er 1 bij en brons 1
  minder. Kaarten kosten 1 tot 3 punten. Met 0 punten kan een renner alleen
  nog meerijden of afhaken.
  - Kracht staat los van W′ in de physics: W′ herstelt, kracht niet. Zo
    worden je keuzes over de hele koers verdeeld.
  - De physics beslist nog wel of een aanval lukt.
- **Dekking** is het aantal knechten in dezelfde groep als je kopman. Ze
  vangen gevaren op. Een knecht die een gevaar opvangt of "uit de wind zetten"
  speelt, verliest kracht. Is hij leeg, dan valt hij terug.
- **De afweging:** gebruik je je knechten vroeg om de kopman veilig te
  houden, of spaar je ze voor de finale?

## Waar de kaarten vandaan komen

Je **opstelling en je beste materiaal en personeel vormen je stapel**. Je
verzameling en de pakketten krijgen zo een doel tijdens de koers.

- **Renners** leveren 2 kaarten per renner, passend bij hun type:

  | Type | Kaarten |
  | --- | --- |
  | klimmer | Versnellen bergop, Tempo op de klim |
  | sprinter | Lanceren, In het wiel |
  | klassieker | Kasseien hard nemen, Waaier trekken |
  | tijdrijder | Op kop sleuren, Gat dichtrijden |
  | allrounder | Demarrage, Uit de wind zetten |

- **Een gouden renner** geeft een sterkere versie (+1 effect, of 1 kracht
  goedkoper).
- **Personeel** levert 1 kaart:

  | Rol | Kaart | Wat het doet |
  | --- | --- | --- |
  | mechanieker | Snelle wielwissel | heft een lekke band of defect op |
  | fysio | Herstel | +2 kracht |
  | ploegleider | Vooruitkijken | zie twee sectoren verder en ruil een kaart |
  | trainer | Op scherp | volgende kaart kost 1 kracht minder |
  | chauffeur | Vroeg op pad | begin met een kaart extra in je hand |

- **Materiaal** blijft een vaste bonus in de physics, zoals nu. Het levert
  geen kaarten op. Zo blijft de stapel overzichtelijk.

## Soorten kaarten

| Soort | Wanneer | Wat het doet | Voorbeelden |
| --- | --- | --- | --- |
| Aanval | je beurt | een renner springt naar de groep ervoor, of rijdt weg | Demarrage, Versnellen bergop |
| Tempo | je beurt | het peloton rijdt deze sector harder; groepen achterop verliezen kracht | Op kop sleuren, Tempo op de klim |
| Bescherming | je beurt of bij een gevaar | een knecht vangt een gevaar op of neemt de wind; de kopman spaart kracht | Uit de wind zetten, Wiel afgeven |
| Verstoring | je beurt, op een sector of ploeg | maakt de sector zwaarder voor wie niet vooraan zit | Waaier trekken, Kasseien hard nemen |
| Reactie | als antwoord op een rivaal | heft een aanval of tempo op, of laat je meespringen | Gat dichtrijden, In het wiel |

## Gevaren

Elke sector trekt een gevaar. De kans hangt af van het terrein: kasseien en
wind vaker, een vlakke weg zelden.

- **Lekke band of defect.** Zonder dekking verliest de kopman tijd. Met
  dekking geeft een knecht zijn wiel af en verliest hij zelf tijd.
- **Valpartij in het peloton.** Wie achterin het peloton zit, verliest
  kracht.
- **Zijwind.** Wie niet vooraan zit, raakt achter een waaier.
- **Niets.** Dat gebeurt ongeveer de helft van de tijd, zodat een gevaar
  spannend blijft.

## Rivalen

Elke computerploeg heeft een kopman en een plan, afgeleid van het parcours en
van hun type renners. Per sector toont een ploeg een **intentie** voordat jij
speelt, zoals "valt aan op de klim", "maakt tempo" of "spaart". Zo kun je
vooruit denken en reageren. Een ploeg wijkt soms af van zijn intentie
(ongeveer 20%), zodat je hem niet blind kunt volgen.

## Wat er blijft en wat er verandert

- **Blijft:**
  - kaarten, pakketten, ruilen, het seizoen en de kalender;
  - de stripstijl en de portretten;
  - `race.ts` als rekenmotor. Die krijgt een functie die één sector uitrijdt
    met de rijstanden die de kaarten kiezen;
  - `course.ts`, dat het bord opdeelt in 10 sectoren.
- **Verandert:**
  - de radio-orders (`radio.ts`) en de hand van 20 seconden gaan op in de
    kaarten van dit ontwerp;
  - de koersweergave wordt een bord met sectoren, groepen en een hand
    kaarten.
- **Komt later:**
  - spelen tegen mensen;
  - de getekende 3D-weergave. Die staat nu nog als plan in het
    ZWB-plannenboek. Volgens de keuze van de eigenaar hoort hij hier.

## Eerste speelbare versie

Het doel is voelen of het leuker is voordat de rest omgaat. Daarom komt het
naast de huidige koers in de preview (`?bordspel`). Het spel en de saves van
nu blijven ongemoeid.

- één koers uit de kalender, met 10 sectoren en een klim- of sprintfinale;
- je opstelling en je personeel als stapel, met de kaarten uit de tabellen
  hierboven: ongeveer 12 verschillende kaarten;
- kracht en dekking, en de drie gevaren;
- rivalen met zichtbare intenties;
- de physics per sector, als animatie van een paar seconden;
- een uitslag, maar nog geen beloning en geen seizoen.

**Klaar wanneer:**
- een koers speelbaar is in ongeveer 5 minuten;
- elke beurt een echte keuze heeft;
- je kopman kan winnen of verliezen door hoe je je knechten inzet.

## Nog niet bekend

- **Balans.** Hoeveel kracht, hoe duur zijn de kaarten en hoe vaak gaat het
  mis? Dat blijkt pas na spelen.
- **Duur.** Of 4 kaarten en maximaal 2 per beurt snel genoeg speelt om op 5
  minuten te blijven.
- **Rennervermoeidheid.** Of er tussen koersen iets moet komen, zodat je je
  ploeg moet roteren. Daar is nu niet voor gekozen; het staat in ronde 1
  bewust uit.
