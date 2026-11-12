# Kopman als bordspel — ontwerp

Opgesteld op 2026-11-11. Op dezelfde dag is een eerste speelbare versie
gebouwd. Hoe die werkt en waar ze van dit ontwerp afwijkt, staat onder "Eerste
speelbare versie: gebouwd" onderaan.

Sinds fase 4 (ook 2026-11-11) is het bordspel dé koers van het spel, ook voor
de tijdrit. Zie "Fase 4: het bordspel als koers, en de tijdrit" onderaan. De
preview `?bordspel` bestaat nog om elke koers los te testen.

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
   Elke kaart kost **kracht** van de renner die hem uitvoert. Je kiest zelf
   wie dat is (zie [Een kaart op een renner naar keuze](#een-kaart-op-een-renner-naar-keuze)).
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

- **Renners** leveren 2 kaarten per renner, passend bij hun type (sinds
  2026-11-11 mag elke renner ze spelen, zie
  [Een kaart op een renner naar keuze](#een-kaart-op-een-renner-naar-keuze)):

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
  | mechanieker | Snelle wielwissel | heft een lekke band of defect op (gebouwd als reservewiel naast de hand, geen kaart) |
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

Elke sector trekt een gevaar. De kans hangt af van het terrein en, sinds
2026-11-12, van het weer van die koers en de fase (zie "Eerlijk herstel,
tempo tegen aanvallen, en het weer").

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
  - de getekende 3D-weergave. Die stond als plan in het ZWB-plannenboek.
    Volgens de keuze van de eigenaar hoort hij hier. Een eerste proef is
    gebouwd in fase 5, zie onderaan.

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

## Eerste speelbare versie: gebouwd

**Code:**
- `src/kopman/engine/board.ts` is de spelmotor;
- `src/kopman/ui/board-view.tsx` is het bord;
- `tests/unit/kopman-board.test.ts` bevat de tests.

`race.ts` kreeg één vlag, `scripted`. Als die aan staat:
- vallen de computerrenners niet meer op eigen houtje aan; aanvallen komen
  alleen uit kaarten en intenties;
- rijden je eigen renners mee tenzij een kaart iets anders zegt.

Het volgen van een aanval, het achtervolgen, de vlucht van de dag, de lead-out
en de sprint blijven werken zoals in de live koers.

**De preview** leest je save (opstelling, kopman en personeel), maar schrijft
er niets in. Je kiest een koers; sinds fase 4 kan dat ook de tijdrit zijn.

**Hoe het nu werkt, en waar het afwijkt van het ontwerp hierboven:**
- **Sectoren.** Er zijn 10 even lange sectoren. Het terrein volgt uit wat er
  in een sector het meest voorkomt: kasseien vanaf 20%, klim vanaf 30%,
  afdaling vanaf 35%, anders vlak. De laatste sector is de finale. Die rijdt
  door tot de finish.
- **Kracht.** De beginwaarden zijn zoals ontworpen (10 voor de kopman, 6 voor
  een knecht, ±1 voor goud en brons). Wie kracht verliest, verliest ook
  vermogen in de physics, bij 0 kracht tot 15% in een wegrit en 8% in de
  tijdrit (tot 2026-11-12 overal 8%). Rivalen hebben ook kracht.
  Hun aanvallen en gevaren kosten die net zo.
- **Gevaren** worden getrokken nadat de sector gereden is. De kansen staan in
  `HAZARD_ODDS`.
  - Een lekke band treft één kopman, in 30% van de gevallen de jouwe.
    Valpartij en zijwind treffen elke kopman die te weinig dekking heeft.
  - Krijgt je kopman een lekke band of valt hij met dekking, dan wachten
    knechten op hem. Ze trekken hem terug met de rijstand `wachten` die al in
    `race.ts` zat.
  - Een eigen renner die gelost is, rijdt op drempeltempo terug als er een
    groep binnen 600 m rijdt.
- **Waaier trekken** maakt de sector winderig. Dan heb je 2 ploeggenoten om
  je heen nodig in plaats van 1, en jouw ploeg is beschermd.
- **Reactiekaarten** ("In het wiel" en "Gat dichtrijden") werken alleen als
  een rivaal in die sector echt aanvalt binnen 250 m. Zo niet, dan gaan ze
  terug in je hand en krijg je je kracht terug. Ze gaan bij het begin van de
  sector af, niet midden in de animatie.
- **Je hand (sinds de tweede ronde op 2026-11-11).** Je hand bevat alleen
  kaarten die je in deze sector kunt spelen.
  - Je hebt 4 kaarten, of 5 met een buschauffeur.
  - Bij elke nieuwe sector gaan kaarten die niet passen terug onder de
    stapel. Ze komen terug als het terrein klopt. Denk aan een klimkaart op
    de vlakte, een renner zonder kracht of een reactie zonder aangekondigde
    aanval.
  - Eén kaart draait mee terug onder de stapel, voor afwisseling.
  - Daarna vul je aan met kaarten die passen.
  - Rennerkaarten kun je terugnemen tot je op Rijden drukt. Stafkaarten
    werken meteen.
  - De eigenaar zei na de eerste ronde: "je kan vaak niet kiezen omdat kaarten
    niet van toepassing zijn". Een meting over alle 15 klassiekers en
    bergritten laat nu zien dat je hand in 98% van de sectoren vol is. Per
    koers zie je 10 tot 16 verschillende kaarten.
- **Drie kaarten per renner.** Elk type kreeg er een derde kaart bij die op
  ander terrein werkt:

  | Type | Derde kaart | Wat het doet |
  | --- | --- | --- |
  | klimmer | Afdalen op de limiet | alleen in een afdaling: 12% hogere topsnelheid, op eigen tempo |
  | sprinter | Rustig aan | overal: in het wiel rijden, +1 kracht |
  | klassieker | Positie vooraan | overal: je ploeg is veilig voor een val en heeft in de wind één ploeggenoot minder nodig |
  | tijdrijder | Mee in de vlucht | alleen in de eerste 4 sectoren: springt naar de kopgroep |
  | allrounder | Rustig aan | overal: in het wiel rijden, +1 kracht |

- **Kaarten die geen effect hebben, komen niet in je hand.** Dat geldt voor
  Herstel en Rustig aan als je al volle kracht hebt, en voor Mee in de vlucht
  als je al vooraan zit.
- **Het reservewiel.** Een mechanieker geeft één reservewiel per koers. Dat
  vangt vanzelf een lekke band op. Het staat naast je renners en neemt geen
  plek in je hand in. In de eerste ronde was het een kaart, de "snelle
  wielwissel", die een plek in je hand bezet hield.
- **Herstel** gaat altijd naar de kopman.
- **Een stapel** heeft 15 rennerkaarten. Daar komen tot 3 stafkaarten bij:
  Herstel van de fysio, Vooruitkijken van de ploegleider en Op scherp van de
  trainer.
- **Rivalen.** Alleen de 4 ploegen met de best passende kopman krijgen
  intenties, en er staan er hooguit 3 op het scherm. Elke ploeg valt hooguit
  2 keer per koers aan. Van de intenties gaat 20% niet door.

**Balansmeting van 2026-11-11.** De beste eigen plek, gemeten over 5
klassiekers met 6 seeds per koers:

| Ploeg | Live koers | Bordspel zonder kaarten | Bordspel, elke beurt de eerste speelbare kaarten |
| --- | --- | --- | --- |
| startploeg (brons) | meestal 30–50 | meestal 25–45 | meestal 15–35 |
| vijf beste zilveren | meestal 4–15 | meestal 10–20 | meestal 2–12, soms een zege |

Kaarten spelen helpt dus, en goed spelen zou nog meer moeten helpen. Hoe het
voelt als je zelf speelt, is niet gemeten.

**Bewust nog niet gebouwd:**
- beloningen, het seizoen, en het bordspel in de app zelf (sinds fase 4 wel
  gebouwd, zie hieronder);
- intenties voor alle 11 ploegen;
- een reactiemoment midden in een sector;
- zelf kiezen wie Herstel krijgt;
- rennervermoeidheid tussen koersen;
- 3D.

## Fase 4: het bordspel als koers, en de tijdrit

Gebouwd op 2026-11-11, nadat de eigenaar zei: "het spel speelt prima tot nog
toe ga maar verder".

**Het bordspel is de koers.**
- De knop Start op het tabblad Koers opent het bord en niet meer de live koers.
- De uitslag loopt door dezelfde afrekening als voorheen (`finishRace`). Je
  krijgt dus dezelfde munten, punten, een pakket en de seizoensbeloning. (Tot
  2026-11-12 gold voor het pakket een daglimiet; zie
  [kopman-piramide.md](kopman-piramide.md).)
- De seed is die van de live koers. Herlaad je de pagina midden in een koers,
  dan begin je die koers opnieuw, met dezelfde kaarten.
- De live koers met radio-orders (`race-view.tsx`, `radio.ts`) wordt in het
  spel niet meer gebruikt. De code staat er nog.

**De tijdrit als bordspel.** De eigenaar vroeg: "board game en meer opties,
beter aero zitten, pacing beter voor elkaar, dingen die bij TT passen".
- **Sectoren.** De Polderchrono gaat heen en terug door de polder. Op de
  heenweg waait het de ene kant op, op de terugweg de andere: kopwind of
  rugwind, gekozen uit de seed. Bij het keerpunt in sector 6 zijn bochten, en
  ook in een of twee dorpskernen.
- **Wind.** Kopwind maakt de luchtweerstand 25% groter, rugwind 20% kleiner.
  In de kopwind rijd je langzamer en ben je dus langer onderweg. Daar levert
  extra vermogen de meeste tijd op. Dat zit in de physics, niet in een regel.
- **Je stuurt alleen de kopman.** In een tijdrit rijdt iedereen alleen, dus
  knechten kunnen hem niet helpen. Hun kaarten zijn wat de ploeg aan zijn rit
  bijdraagt. Alle kaarten kosten kracht van de kopman. De knechten rijden hun
  eigen tijdrit op standaardtempo.
- **Tempo.** Iedereen rijdt standaard net onder zijn limiet (96% van zijn
  drempelvermogen). Kaarten laten je dichter bij de limiet rijden, of juist
  sparen. Per sector kies je één tempo.

  | Kaart | Soort | Kost | Wat het doet |
  | --- | --- | --- | --- |
  | Gedoseerd starten | pacing | 0 | eerste 4 sectoren: 90%, +1 kracht, tot 2 boven je start |
  | Vol gas | pacing | 2 | 104% deze sector |
  | Diep in de kopwind | pacing | 2 | alleen in de kopwind: 108% |
  | Op adem in de rugwind | pacing | 0 | alleen in de rugwind: 90%, +1 kracht |
  | Alles geven | pacing | 3 | alleen in de finale: 115% |
  | Plat op de fiets | aero | 1 | 8% minder luchtweerstand deze sector |
  | Bochten strak | techniek | 1 | in de bochten: een kwart van het tijdverlies, 15% kans op een val (−2 kracht en 200 m) |

- **Per renner:**

  | Type | Kaarten |
  | --- | --- |
  | tijdrijder | Vol gas, Diep in de kopwind, Plat op de fiets |
  | allrounder | Vol gas, Gedoseerd starten, Plat op de fiets |
  | klimmer | Gedoseerd starten, Op adem in de rugwind, Vol gas |
  | sprinter | Alles geven, Op adem in de rugwind, Bochten strak |
  | klassieker | Bochten strak, Diep in de kopwind, Gedoseerd starten |

  De stafkaarten zijn dezelfde als in de wegkoers. Een kaart staat nooit twee
  keer in je hand: een tweede exemplaar voor dezelfde renner voegt niets toe.
  Dat geldt sinds deze ronde ook in de wegkoers. Twee keer Demarrage van twee
  verschillende renners kan nog wel.
- **Bochten** kosten iedereen tijd. Een goede daler verliest minder, tot de
  helft.
- **Een lekke band** heeft per sector 8% kans. Je verliest dan 25 s, tenzij je
  een reservewiel hebt.
- **Rivalen doseren ook.** Ze rijden harder in de kopwind (de helft van de
  keren), sparen in de rugwind en geven alles in de finale.
- **Kracht** is in de tijdrit een budget voor tempo. Wie leeg is, rijdt tot 8%
  zwakker. Vroeg uitgeven kost je dus de rest van de rit.

**Balansmeting tijdrit van 2026-11-11.** Plek van de kopman, gemeten met 6
seeds, vlak voordat de regel tegen dubbele kaarten erbij kwam. De test die
slim tegen verspillen meet, slaagt ook daarna:

| Ploeg | Geen kaarten | Elke beurt de eerste kaart | Slim doseren |
| --- | --- | --- | --- |
| vijf zilveren tijdrijders | 14e, ongeveer +1:55 | 15e–21e, ongeveer +2:15 | 11e–12e, ongeveer +1:35 |
| startploeg (brons) | ongeveer 57e | ongeveer 58e | ongeveer 57e |

Bij "slim doseren" spaar je vroeg, rijd je hard in de kopwind in de tweede
helft, neem je de bochten strak en geef je alles in de finale. Het verschil
tussen goed en slecht spelen is ongeveer 40 s. Een bronzen ploeg kan in de
tijdrit weinig, net als in de live koers.

**Bewust niet gebouwd:**
- **Een tijdrit met gespreide starttijden.** Iedereen start tegelijk, zonder
  wiel, zoals de live tijdrit al deed. Zo kun je tussenstanden laten zien
  zonder starttijden.
- **Tussentijden van knechten die eerder starten.** Dat werkt pas met
  gespreide starts.
- **Knechten sturen in de tijdrit.** Met vijf renners en twee kaarten per
  sector werd het te druk, en hun plek levert weinig op.

## Fase 5, proef: het koersbeeld

Gebouwd op 2026-11-11. De eigenaar zei: "Ga gewoon verder met de fases". Het
plan "Kopman: de koers in een getekend 3D-beeld" stond in het ZWB-plannenboek
en is daar daarna weggehaald. Het vroeg om eerst een korte proef. Dit was de
eis voor "klaar": wisselen tussen het overzicht en het getekende beeld
tijdens de koers, en een beeld dat soepel loopt op een gewone telefoon. Open
vragen uit dat plan waren of het zonder zware 3D-bibliotheek kan, hoe zwaar
60 renners zijn op een telefoon, hoe renners naast elkaar komen, en of de
stripstijl overeind blijft als alles beweegt.

**Wat het is.**
- Boven het bord kies je **Overzicht** (het profiel van nu) of
  **Koersbeeld**. Je keuze wordt onthouden op dit apparaat.
- Het koersbeeld toont de koers zoals de motorcamera hem ziet. De camera
  rijdt 9 m achter je kopman.
- Alles is getekend in de stijl van Kopman: inktlijnen, papierkleuren en
  rasterpunten in de lucht en het gras.
  - Elke renner draagt zijn ploegkleur. Jouw renners zijn geel met een zwarte
    helm, en je kopman heeft een rood driehoekje boven zijn hoofd.
  - Wie aanvalt of sprint, krijgt snelheidslijnen.
  - Kasseien tekenen we als stenen en grind als korrels.
  - Bij een klim of kasseistrook verschijnt de naam in een geel kader, met
    het stijgingspercentage in een rond label.
- Onder het beeld blijft een smal profiel staan, zodat je ziet waar je bent.

**Hoe het werkt.**
- Eén canvas, zonder 3D-bibliotheek (2,5D, zoals oude racespellen).
  - `src/kopman/ui/chase-scene.ts` rekent de geometrie uit en heeft tests;
  - `src/kopman/ui/chase-view.tsx` tekent.
- De koersberekening is niet veranderd. Wat de engine niet kent, verzint het
  beeld:
  - de bochten komen uit de seed;
  - de plek op de weg volgt uit je plek in de groep. Een groep rijdt breder
    naarmate hij groter is; in de tijdrit rijdt ieder zijn eigen lijn.

  Het beeld schrijft niets terug naar de koers.
- **Hoogte** komt uit het echte profiel en is iets aangedikt. De camera kantelt
  half mee met de helling, zoals een camera op een motor. Een muur als de
  Koppenberg tekenen we op hooguit 16% ten opzichte van de camera, zodat hij
  in beeld blijft.
- **Snelheid.** Een sector van een paar kilometer gaat in 3,5 s voorbij. Een
  kasseistrook zie je dus maar een seconde. De bochten zijn daarom
  kilometers lang, zodat de weg zwiept in plaats van trilt. De wegstrepen en
  stenen schuiven op een rustiger tempo dan de koers zelf.
- **Wanneer het tekent.** Het beeld tekent alleen terwijl een sector rijdt.
  Tussen de sectoren tekent het één keer opnieuw. Het stopt buiten beeld en
  als het tabblad verborgen is. Met "beweging beperken" staan de trappers
  stil en schuift de weg niet; de koers zelf loopt wel.

**Geverifieerd:**
- 3 tests voor de geometrie;
- in de preview op desktop en op 375 px: een vlakke start, de Trouée
  d'Arenberg op de kasseien en de Koppenberg op 13%;
- op desktop meet een gemiddeld beeld 16,7 ms, en 95% van de beelden blijft
  onder 17,8 ms. Dat is 60 beelden per seconde.

**Niet geverifieerd:**
- **Een echte, gewone telefoon.** De eis uit het plan was "soepel op een
  gewone telefoon". Dat is alleen nagebootst op 375 px breed in Chrome op
  desktop.
- **Safari.**
- **De Next-pagina.** Daar is alleen tsc gedraaid.

**Bewust niet gebouwd:**
- **Echte 3D of een bibliotheek als three.js.** Het plan vroeg om het zonder
  te proberen, en dat lukt.
- **Renners naast elkaar in de koersberekening.** De plek op de weg is alleen
  beeld.
- **Een tragere animatie in het koersbeeld.** Dat zou de duur van een koers
  veranderen, en daar is niet om gevraagd.
- **Andere camerastandpunten.** Bijvoorbeeld de helikopter of de kopgroep
  volgen.

## Het bord op een telefoon

Gebouwd op 2026-11-11. De eigenaar zei: "Om het speelbaar te maken op mobiel
lijkt het mij dat de elementen allemaal in het koersbeeld moeten passen, want
je wil niet scrollen".

**Wat het is.**
- Op een telefoon vult het bord het hele scherm. Dat geldt rechtop (tot 720 px
  breed) en liggend (tot 520 px hoog). De pagina erachter scrolt dan niet mee.
- *Sinds 2026-11-12 is het overzicht weer de standaard en staan daar de
  groepen op het profiel, zie [De koers in
  groepen](#de-koers-in-groepen-en-kaarten-per-fase). Wat hieronder over het
  koersbeeld staat, geldt als je het koersbeeld kiest.*
- Het koersbeeld is het podium. Wat bij de koers hoort, staat erop:
  - linksboven de sector: terrein, lengte, kansen en wat daarna komt;
  - rechtsboven de helling en de naam van de klim of de strook;
  - onderaan de plannen van de andere ploegen, en tijdens het rijden de laatste
    twee berichten.
- Onder het beeld staan, van boven naar onder:
  - een smal profiel;
  - je vijf renners naast elkaar, met plek, achterstand en een krachtbalk met
    het getal. Je kopman heeft een kroontje en een schildje met zijn dekking;
  - je hand op één rij;
  - wat je gespeeld hebt, met de knop Rijden ernaast.
- **Overzicht** blijft kiezen. Het grote profiel staat dan op het podium, met
  dezelfde vakjes erop.
- Liggend staat het beeld links en de rest rechts. Het smalle profiel valt
  daar weg, en ook op schermen lager dan 640 px.
- De kaarten tonen op een telefoon de soort, de titel, het type dat de kaart
  meebracht en de kosten.
  De uitleg past alleen op een hoog scherm (vanaf 760 px), in drie regels. Een
  kaart die niet kan, toont altijd waarom.
- Op een hoog en smal beeld zoomt de camera wat in. Anders is de onderste helft
  lege weg. Op desktop verandert er niets.
- Op desktop is het bord gelijk gebleven.
- **De knoppen Overzicht en Koersbeeld** zijn twee getekende knoppen in de
  stripletter, zoals alle knoppen van de app (zie
  [kopman.md](kopman.md#stripstijl-in-de-hele-app)). De gekozen knop is geel
  met drukpunten en staat iets scheef. Op de telefoon staat alleen het icoon.
  - De eigenaar vroeg: "Kun je de knoppen ook in de stijl van de app maken?".
  - De eerste twee pogingen waren platte knoppen en daarna de tabtegels van
    de app. Die zijn afgekeurd: "de knoppen zijn nu juist meer ai, ik wil meer
    de striptekenstijl overal doorgetrokken".

**Geverifieerd:**
- in de preview in Chrome, nagebootst op 375×667, 390×844 en 812×375. Steeds
  even hoog als het scherm, zonder te scrollen en zonder dat iets buiten beeld
  valt; zowel bij plannen als bij rijden, in beide weergaven;
- een hele koers in de app (tabblad Koers, Start) op 375×667, tot en met de
  uitslag. De pagina scrolt daarna weer gewoon;
- tsc, eslint en de 47 tests.

**Niet geverifieerd:**
- een echte telefoon en Safari. Daar kunnen de adresbalk en de
  veilige randen (`env(safe-area-inset-*)`) anders uitvallen;
- of Nederlandse woordafbreking (`hyphens: auto`) op de telefoon werkt. Chrome
  op Windows breekt "Vooruitkijken" midden in het woord af. De titels zijn zo
  klein gezet dat de andere lange woorden passen;
- de Next-pagina zelf. Daar is alleen tsc gedraaid. Het bord ligt er vast
  over de hele pagina, ook over de kop van de site.

**Bewust niet gebouwd:**
- **Een knop om de uitleg van een kaart te openen.** De titel zegt op een
  telefoon genoeg. Een extra laag maakt het spelen trager, en de uitleg staat
  op desktop en op hoge schermen wel.
- **Een andere indeling voor tablets.** Vanaf 721 px breed krijg je het
  desktopbord, dat daar al past.
- **De klok in de bovenbalk.** Die past er niet naast de sector, de afstand
  en de knoppen. De achterstand staat bij elke renner.

## Een kaart op een renner naar keuze

Gebouwd op 2026-11-11. De eigenaar: "Ik wil eigenlijk een kaart op een
zelfgekozen renner kunnen spelen, nu heb ik telkens dezelfde renner die een
bepaalde actie kan doen".

**Wat het is.**
- **Eerst de kaart, dan de renner.** Tik een kaart aan: hij komt geel omhoog
  en de renners die hem kunnen spelen, lichten op. Bij elke renner staat wat
  hij ervoor betaalt. Tik een renner aan en de kaart is gespeeld. Kan maar één
  renner de kaart spelen, dan gaat hij meteen. Tik de kaart nog eens aan om
  terug te gaan.
- **Je opstelling beslist nog steeds welke kaarten je krijgt.** Elke renner
  brengt de drie kaarten van zijn type mee in de stapel. De kaart toont dat
  type ("Klimmer") in plaats van een naam.
- **Een renner van een ander type betaalt 1 kracht meer** (`OFF_TYPE`),
  behalve bij een herstelkaart (sinds 2026-11-12). Een
  gouden renner blijft 1 minder betalen. De physics rekent verder met de
  renner zelf: een sprinter die bergop versnelt, betaalt meer en haalt er
  minder uit dan je klimmer.
- **Na de sector zijn de kaarten weer van de ploeg.** Een kaart die terugkomt
  in je hand, heeft weer geen renner.
- **Een kaart staat maar één keer in je hand.** Twee allrounders brengen
  allebei "Rustig aan" mee, maar met vrije keuze voegt een tweede exemplaar
  niets toe. Eerst gold dat per renner.
- **De tijdrit blijft zoals hij was.** Daar stuur je alleen de kopman, dus is
  er niets te kiezen, en betaalt hij geen meerprijs.

**Terug tijdens een koers.** Ook op 2026-11-11 gevraagd: "ik wil ook terug
kunnen wanneer een wedstrijd bezig is". Linksboven op het bord staat een
terugknop. De koers blijft dan staan waar hij was, met wat je al gespeeld
hebt. Op het tabblad Koers heet Start dan **Verder**. Reed de sector nog,
dan rijdt hij uit en wacht het bord op je volgende beurt.

**Bewust niet gebouwd:**
- **Een koers stoppen en opnieuw beginnen.** Een koers heeft per save een
  vaste uitkomst (`raceSeed`); opnieuw beginnen helpt dus niet, en een knop
  meer maakt het scherm voller. Verder spelen kan altijd.
- **De koers bewaren als je de pagina sluit.** Het bord staat alleen in het
  geheugen. Sluit je de pagina, dan begin je die koers opnieuw.
- **Geen meerprijs.** Ook overwogen; dan beslist alleen de renner zelf en
  telt het type in je opstelling minder. De eigenaar koos voor de meerprijs.

**Geverifieerd:**
- in de preview in Chrome op 375×667: een kaart kiezen, de renners met hun
  kosten, spelen op een renner van een ander type (3 kracht in plaats van 2),
  terug, Verder, en de gespeelde kaart staat er nog;
- op desktop: de rennerlijst licht op, de kopman valt weg voor "Uit de wind
  zetten";
- tsc, eslint en 49 tests, waarvan 2 nieuw voor de vrije keuze.

**Niet geverifieerd:** een echte telefoon, Safari, en of de meerprijs van 1
kracht de goede balans is.

## De koers in groepen, en kaarten per fase

Gebouwd op 2026-11-12. De eigenaar speelde een seizoen en zei: "de game
weergave voegt heel weinig toe, er is geen overzicht, je weet niet waar je
renners zitten". Ook: je kunt in het spel niet zien wat je renners kunnen,
er mochten zeldzame grapkaarten bij ("1/1000 zou best grappig zijn"), en "het
is in het spel te makkelijk te winnen als je een betere renner hebt, je kan
erg vroeg aanvallen en je kopman wordt niet gauw moe". Het voorstel is
goedgekeurd, met één wijziging: "De kans om een streekkaart te trekken moet
mss hoger".

**De koers in vogelvlucht** (`ui/group-view.tsx`). Eerst stonden hier het
profiel en daaronder een strook per groep. Dezelfde dag vond de eigenaar dat
"veel van hetzelfde op elkaar gestapeld", met de vraag: "is het daarnaast geen
idee om dit als bird view te doen zodat je een kronkelende lijn ziet met de
gezichten van de renners en de bolletjes". Ook wilde hij de rivalen als
gezichtjes zien en ze kunnen aantikken, "zodat je weet tegen wie je racet".
Nu is het één blok:
- Het overzicht is weer de standaard. De keuze staat onder een nieuwe sleutel
  (`kopman:weergave`), zodat een eerdere keuze voor het koersbeeld niet blijft
  hangen. Het koersbeeld blijft te kiezen.
- **De weg** is een kronkelend lint door het gras: het stuk rond de sector van
  nu, verlengd tot de achterste groep die telt en de kop van de koers. Een
  koers heeft geen kaart, dus de bochten zijn getekend. Ze hangen aan de
  afstand en aan de koers, dus ze schuiven mee en zijn elke keer hetzelfde.
- Een klim kleurt de weg geel, kasseien bruin met stenen, grind zand. Bij elke
  klim of strook staat een bordje met de naam, bij een klim met het gemiddelde
  stijgingspercentage. De sectorgrenzen zijn streepjes over de weg, de finish
  is geblokt.
- **Elke groep** is een wolkje bolletjes in ploegkleur; hoe groter de groep,
  hoe langer de wolk. Voor de kop, het peloton en elke groep met een renner
  van jou staat een label met de achterstand (de kop met het aantal). Liggen
  groepen te dicht op elkaar om apart te tekenen, dan schuiven ze zo weinig
  mogelijk uit elkaar; het label geeft de echte achterstand.
- **Je renners** zijn gezichtjes boven de weg, met een lijntje naar hun plek.
  Ze hebben de stemming van het portret en wiebelen mee als de sector rijdt
  (niet bij `prefers-reduced-motion`). Ze staan nooit op de weg zelf.
- **De kopmannen van de rivalen** zijn kleinere gezichtjes onder de weg, onder
  hun eigen groep, met een ring en een lijntje in hun ploegkleur. Meer dan vier
  in één groep staan in twee rijen. Hun portret beweegt niet, dat scheelt werk
  voor een telefoon.
- Het hoogteprofiel van de hele koers staat er smal onder (op desktop erboven).
- Op een telefoon staan de plannen van de andere ploegen naast elkaar, met
  alleen de ploegkleur en de renner. Bij het plannen staat er dan één bericht
  onder in plaats van twee. Anders drukten ze het beeld te plat.

**De kaart van een renner.** Tik een renner aan (in de vogelvlucht, in je rij
renners of in de lijst op desktop) en zijn kaart opent, met alle waarden, zijn
kracht en waar hij rijdt. Dat kan ook bij een rivaal; dan staat zijn ploeg
erbij. Wacht er een kaart op een renner, dan speelt de tik op een van jouw
renners die kaart, zoals eerder.

**Fases.** Een wegrit heeft drie fases: de opening (sector 1 tot 3), het
middenstuk (4 tot 7) en de finale (8 tot 10). De fase staat voor de naam van
de sector. De tijdrit heeft geen fases.

**Ploegkaarten.** In elke wegrit komen vier kaarten van de ploeg in de stapel,
naast de kaarten van je renners. Ze hebben geen type, dus geen meerprijs.

| Kaart | Kosten | Wanneer | Wat |
|---|---|---|---|
| In het wiel blijven | 0 | opening, alleen de kopman | +1 kracht, hij spaart in het wiel |
| Bevoorrading | 0 | middenstuk, één keer per koers | een renner naar keuze +2 kracht |
| Bidons halen | 1 | middenstuk, alleen een knecht | de kopman +1 kracht |
| Sprinttrein | 2 | finale | sprint 8% sterker met twee ploeggenoten bij je, anders 2%; de sprint begint op 450 m |

**Vroeg aanvallen kost meer.** Demarrage en Bergop versnellen kosten buiten
de finale 1 kracht extra (`EARLY_ATTACK`; tot 2026-11-12 was dat 2). Dat stapelt met de meerprijs voor
een ander type.

**Moeheid.**
- Bij 0 kracht verliest een renner in een wegrit 15% vermogen
  (`FATIGUE_FLOOR`); dat was 8%. In de tijdrit blijft het 8%.
- **Alleen rijden kost kracht.** Rijdt een renner na een sector zonder
  ploeggenoot in zijn groep, dan verliest hij 1 kracht. Zit hij vooraan met
  hooguit twee anderen, dan nog 1. Dat geldt niet voor de vlucht van de dag en
  niet in de finale. Voor je kopman staat het in het verslag.
- **Het peloton jaagt meteen op een favoriet.** Rijdt er een kopman meer dan
  10 s voor het peloton uit, dan gaan de drie sterkste ploegen zonder renner
  vooruit direct op kop, ook vroeg in de koers. Eerst gebeurde dat pas na
  45% van de koers of bij meer dan 150 s.

**Streken.** Heel soms trek je in een wegrit een streek in plaats van een
kaart uit je stapel: 1 op 150 per getrokken kaart (`STREEK_ODDS`), dus
ongeveer één per vier à vijf koersen. Een streek kost niets en is na één keer
weg.

| Streek | Wat |
|---|---|
| Punaises | ongeveer een derde van de rivalen in de groep van je kopman verliest 250 m |
| EPO op de kamer | de sterkste rivaliserende kopman verliest een minuut |
| Plakbidon | je kopman +3 kracht, nooit boven zijn begin |
| Verkeerde pijl | de groep voor je kopman rijdt 400 m om |
| Valse bidon | een rivaliserende kopman verliest 2 kracht |

Een streek die niets kan doen, kan niet gespeeld worden (bijvoorbeeld de
verkeerde pijl als je kopman al vooraan rijdt).

**Balans.** Een sterke ploeg (de beste gouden renner per type) reed 15
wegritten met 4 seeds, met de kopman die het best bij de koers past:

| Aanpak | Voor: zeges | Voor: gemiddelde plek | Na: zeges | Na: gemiddelde plek |
|---|---|---|---|---|
| Niets spelen | 17 | 19,6 | 12 | 16,1 |
| Vroeg aanvallen (sector 2–3) | 24 | 11,5 | 16 | 20,8 |
| Laat aanvallen (finale) | 30 | 12,1 | 29 | 11,9 |

Vroeg aanvallen is nu slechter dan niets doen; laat aanvallen werkt zoals
eerst.

**Bewust niet gebouwd:**
- **Een kans van 1 op 1000.** Dat was de vraag, maar dan trek je met zo'n
  35 kaarten per koers één streek per 28 koersen, minder dan één per seizoen.
  De eigenaar vond de kans mag hoger.
- **Streken voor de rivalen.** Dan verlies je een koers door een grap waar je
  niets tegen kunt doen.
- **De piramide (divisies, promotie en degradatie).** Die wordt in een andere
  sessie gebouwd, niet in deze ronde.

**Geverifieerd:**
- in de preview in Chrome op 375×667: de vogelvlucht bij de start, met vier
  groepen op de kasseien en bij een klim met bordje; de kaart van een eigen
  renner en van een rivaal openen en sluiten; desktop op 1280×800;
- tsc, eslint en 55 tests, waarvan 6 nieuw (fases en ploegkaarten, de
  meerprijs voor vroeg aanvallen, alleen rijden, plakbidon en verkeerde pijl,
  EPO, hoe vaak een streek komt);
- de balansrun hierboven.

**Niet geverifieerd:**
- een echte telefoon en Safari;
- een streek en de stijl ervan in het spel zelf: in de preview is er geen
  getrokken, de tests spelen ze wel;
- of de nieuwe balans prettig speelt. De run zegt iets over een sterke ploeg,
  niet over hoe het voelt.

## Eerlijk herstel, tempo tegen aanvallen, en het weer

Gebouwd op 2026-11-12, na een seizoen spelen. De eigenaar meldde: een
herstelkaart kost soms meer dan hij oplevert; tempo op kop door een
tijdrijder werkt beter dan aanvallen; de kansen op zijwind, valpartij en
lekke band veranderen nooit. Ze wilden ook zien wat materiaal en personeel
per renner doen. Gemeten met dezelfde koers twee keer, met en zonder één
kaart (`.tmp/kopman-kaarten.ts`, niet in git): 6 koersen van Kermis tot
Proftour, 4 seeds, de startploeg.

**Herstel.**
- Herstelkaarten (`RECOVERY_CARDS`: Rustig aan, In het wiel blijven,
  Bevoorrading, Herstel, Op adem in de rugwind, Gedoseerd starten) hebben
  geen meerprijs meer voor een ander type. Vóór deze ronde leverde "Rustig
  aan" op een renner van een ander type gemiddeld +0,02 op: 113 van de 144
  keer niets en 14 keer minder dan niets.
- Wie herstelt, rijdt mee in het wiel (`mee`) in plaats van te sparen
  (`sparen`, wiel volgen tot 95%). Sparen liet hem bergop of in een snelle
  groep lossen, en dan kostte alleen rijden weer kracht. Wie in een sector
  herstelt, betaalt die sector niet voor alleen rijden (`board.rested`).
  Dat geldt ook voor de kopman bij Uit de wind zetten, Bidons halen en
  Herstel.
- Gemeten na de aanpassing: elke herstelkaart levert gemiddeld +1,0 tot +1,2
  op (Bevoorrading +2,2), nooit minder dan niets.

**Tempo tegen aanvallen.**
- **Op kop sleuren** en **Tempo op de klim** zijn knechtenkaarten. De
  knecht trekt de groep, rivalen ook; zo rijd je een gat dicht of laat je
  zwakke renners lossen. De kopman kan ze niet meer spelen: zelf een sector
  lang op 104 tot 112% rijden was een goedkopere aanval dan de aanval zelf.
- **Demarrage** en **Versnellen bergop** houden na de versnelling 106% van
  de drempel vast tot het eind van de sector (`ATTACK_HOLD`); eerst zakte de
  renner terug naar gewoon tempo. Vóór de finale kosten ze 1 kracht extra
  (`EARLY_ATTACK`, was 2).
- Gemeten, gemiddelde plek van de kopman (lager is beter):

  | | Vóór | Na |
  | --- | --- | --- |
  | Sector 6, geen kaart | 43,8 | 40,9 |
  | Sector 6, sleuren door een knecht | 40,2 | 36,5 |
  | Sector 6, sleuren door de kopman | 35,7 | kan niet meer |
  | Sector 6, demarrage | 38,3 | 34,5 |
  | Finale, sleuren door de kopman | 39,3 | kan niet meer |
  | Finale, demarrage | 41,7 | 29,8 |

  De nulmeting verschuift doordat het weer de toevalsgetallen verandert.

**Het weer.** Elke koers krijgt bij de start wind (windstil, wind, storm) en
droog of regen (`weatherFor`, met een eigen seed). Aan de kust, in de polder
en in Nederland waait het vaker. De kansen per sector (`oddsFor`):
- de basis per terrain blijft `HAZARD_ODDS`;
- zijwind ×0,2 bij windstilte, ×1 bij wind, ×2 bij storm;
- valpartij ×0,6 in de opening en ×1,5 in de finale-fase, ×1,5 bij regen;
- lekke band ×1,3 bij regen;
- per sector nog ×0,7 tot ×1,3, en nooit meer dan 60%.
Het weer staat als icoon in de kop van het bord; de kansen per sector staan
er zoals voorheen.

**Wat materiaal en personeel opleveren.** `statBoost` rekent de bonus van de
ploeg per renner om naar punten op zijn kaart: de winst in een eigenschap die
in `bodyOf` hetzelfde oplevert. Die punten staan als groen plusje achter de
eigenschap, op de ploegpagina en op de rennerkaart tijdens de koers. Voeding
(reserve), de fysio, de ploegleider en de buschauffeur horen bij geen
eigenschap en tellen daarin niet mee. Banden tellen op de kasseien zwaar:
lagere rolweerstand is daar het meeste waard.

**Ook in deze ronde.**
- Bij zelf kiezen voor een ruil staan bovenaan de kaarten waarvan je de
  meeste exemplaren hebt, renners, materiaal en personeel door elkaar. Wat je
  niet kunt ruilen, staat onderaan.
- Op de ploegpagina heeft elk vak voor materiaal en personeel de kleur van
  zijn niveau, met het niveau in de tekst en ×N als je er meer van hebt.

**Bewust niet gebouwd.**
- Een knecht die na Op kop sleuren terugzakt. Dan lost hij en betaalt hij
  voor alleen rijden, bovenop de kosten van de kaart.
- Plusjes voor rivalen op hun rennerkaart: die rijden met het materiaal van
  hun niveau, maar dat staat nergens anders in beeld.
- De sprint zelf rijden in de finale: de volgende ronde, op deze balans.

## Nog niet bekend

- **Balans.** Hoeveel kracht, hoe duur zijn de kaarten en hoe vaak gaat het
  mis? Dat blijkt pas na spelen.
- **Duur.** Of 4 kaarten en maximaal 2 per beurt snel genoeg speelt om op 5
  minuten te blijven.
- **Rennervermoeidheid.** Of er tussen koersen iets moet komen, zodat je je
  ploeg moet roteren. Daar is nu niet voor gekozen; het staat in ronde 1
  bewust uit.
