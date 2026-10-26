import {
  Bike,
  CalendarDays,
  Lightbulb,
  Medal,
  Mountain,
  ShieldCheck,
  Smartphone,
  Trophy,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";

// De inhoud van de hulp die als lijst op de categoriepagina's staat.

/**
 * Korte video's per onderdeel, in public/hulp-video/. Gemaakt met
 * scripts/instructievideo (CLIPS in scenes.mjs) en met demodata, dus zonder
 * echte leden in beeld. Komt er een clip bij of verandert een duur, dan hier
 * bijwerken; `bouw.mjs` schrijft de duur in out/hulp/clips.json.
 */
export const HELP_VIDEOS = [
  { id: "account-aanmaken", title: "Account aanmaken", seconds: 45 },
  { id: "starthelper", title: "De starthelper", seconds: 18 },
  { id: "app-op-beginscherm", title: "App op je beginscherm", seconds: 21 },
  { id: "wegwijs", title: "Wegwijs in de app", seconds: 29 },
  { id: "zwift-id", title: "Je Zwift-ID", seconds: 20 },
  { id: "profiel", title: "Je profiel", seconds: 27 },
  { id: "strava-koppelen", title: "Strava koppelen", seconds: 17 },
  { id: "zonder-strava", title: "Ritten zonder Strava", seconds: 17 },
  { id: "meldingen", title: "Meldingen aanzetten", seconds: 16 },
  { id: "aanmelden-event", title: "Aanmelden voor een event", seconds: 12 },
  { id: "kj-standen", title: "Durability: de kJ-standen", seconds: 48 },
] as const;

export type HelpVideoId = (typeof HELP_VIDEOS)[number]["id"];

export const START_STEPS = [
  {
    title: "Maak je profiel compleet",
    text: "Naam, foto, regio, Zwift-ID en zichtbaarheid staan onder Profiel.",
    href: "/profiel?weergave=bewerken",
  },
  {
    title: "Strava-data toevoegen",
    text: "Koppel Strava met activiteitenrecht of importeer je ritten (CSV, GPX of FIT) op het dashboard.",
    href: "/dashboard#strava-sync",
  },
  {
    title: "Zet meldingen aan",
    text: "Voor events, live ritten, badges en trainingsschema's.",
    href: "/profiel?weergave=bewerken#meldingen",
  },
  {
    title: "Bekijk de kalender",
    text: "RSVP met Ja of Misschien als je mee wilt rijden.",
    href: "/kalender",
  },
];

export const GUIDES = [
  {
    id: "profiel",
    icon: UserCircle,
    title: "Profiel en ledenlijst",
    bullets: [
      "Je profiel bepaalt wat andere leden mogen zien.",
      "Onder je naam op Profiel staat een schuifknop met drie standen: het potlood om je profiel te bewerken, de mensen voor hoe andere leden het zien en de wereldbol voor je deelbare profiel. Profiel opent in het midden.",
      "Onder Interesses kies je welke eventtypes je wilt zien op de kalender, en welke afstand en hoogtemeters je grens zijn.",
      "Badges blijven zichtbaar op je profiel en in de ledenlijst.",
      "Onder Mijn fietsen tonen we je fietsen uit Strava (naam + kilometers); zonder Strava voeg je een fiets handmatig toe. Je kiest per fiets of die zichtbaar is en zet er een foto bij.",
      "Bestuur of beheerders keuren nieuwe leden goed.",
    ],
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy en zichtbaarheid",
    bullets: [
      "Live tracking is per rit opt-in en verdwijnt bij inactiviteit.",
      "Je profielvelden hebben eigen zichtbaarheidsschakelaars.",
      "Een trainer ziet je trainingsdata alleen als jij daar toestemming voor geeft.",
    ],
  },
  {
    id: "events",
    icon: CalendarDays,
    title: "Events en RSVP",
    bullets: [
      "Gebruik de kalender voor groepsritten, ZRL, Ladder en socials.",
      "Met Voor mij toont de kalender alleen events die bij je passen: de categorieën en types die je op je profiel aanvinkt, events van je eigen teams, en ritten binnen je grens voor afstand en hoogtemeters.",
      "Events waar je Nee op hebt geantwoord verdwijnen uit Voor mij. Onder Alles blijven ze staan, dus je kunt altijd van gedachten veranderen.",
      "Heb je Ja gezegd, je beschikbaar gemeld voor je team of sta je in de opstelling, dan blijft het event onder Voor mij staan, ook als het buiten je interesses of grenzen valt. Misschien telt niet als aanmelding.",
      "Vink je geen enkel eventtype aan, dan telt alles als interessant en verbergt Voor mij niets op interesse.",
      "Vul je op je profiel geen max afstand of hoogtemeters in, dan leidt ZWB die grens af uit je langste rit van het afgelopen jaar, plus 20 procent. Zonder ritten in ZWB blijft die grens leeg en wordt er niets op omvang verborgen.",
      "Onder de knop staat wat er verborgen is en waarom; met Alles zie je de hele kalender weer.",
      "Met Labels, naast Alles en Voor mij, kies je welke events je ziet, bijvoorbeeld alleen ZRL en Ladder. Je kunt er meerdere tegelijk aanvinken en ze werken samen met Alles en Voor mij; Wis labels toont alles weer.",
      "Training, Social en Goed doel zijn geen categorie maar een type dat erbij komt: een Zwift-event kan een training zijn, een buitenrit een social of een rit voor een goed doel. Een event heeft hooguit één type. Kies je Zwift en Training, dan zie je alleen de Zwift-trainingen.",
      "Een programma is een reeks events die bij elkaar horen, ook als ze van een andere categorie of een ander type zijn: bijvoorbeeld Road to WK GF met de kwalificaties, trainingskampen, social rides en trainingsritten, of alle races van een ZRL-seizoen. Elk event blijft op zijn eigen dag staan en draagt het programma als label. Klik op dat label voor de programmapagina met alle events op volgorde, ook de voorbije. Onder Labels filter je op programma.",
      "Elke categorie heeft een eigen kleur, als rand links van de regel en in het label: buitenritten van groen naar blauw, gravel amber, en alles wat virtueel is van rood via oranje (Zwift) naar geel (MyWhoosh). Een training is feller met een bredere rand, een social pastel, en een goed doel heeft een hartje in het label.",
      "Op eventdagen kan de liveticker deelnemers tonen die live tracken.",
      "GPX, routekaart en hoogteprofiel staan op de eventpagina.",
      "Maak je een event aan, plak dan bovenaan bij Eventlink de link van het event en kies Ophalen. Wat op die pagina staat, komt in de lege velden: titel, start en einde, locatie, beschrijving, de link zelf en een cover, en waar dat duidelijk is ook de categorie. Bij een Zwift-link komen er route, ronden en afstand bij, bij MyWhoosh afstand en hoogtemeters. Bij andere sites hangt het af van wat de organisator op zijn pagina zet; vaak zijn dat alleen titel, beschrijving en afbeelding. Wat je al had ingevuld blijft staan, en kijk de rest na voor je opslaat. De cover wordt bij het opslaan bij ZWB bewaard.",
    ],
  },
  {
    id: "teams",
    icon: Trophy,
    title: "Teams en wedstrijden",
    bullets: [
      "Teams tonen leden, rosterkoppelingen en bekende wedstrijdstanden.",
      "Een ZRL-raceweek staat als één event in de kalender, met de informatie die voor alle teams geldt. Daaronder heeft elk team zijn eigen race, met eigen starttijd, Zwift-link en opstelling. Plak je bij Bewerk de Zwift-link bij Eventlink en kies je Ophalen, dan komen starttijd, ronden en afstand van de Zwift-groep van dat team (A, B, C of D, uit de teamnaam).",
      "Heeft je team subteams, zoals B met B1 en B2? Dan is het hoofdteam een paraplu: je meldt je per raceweek beschikbaar bij het hoofdteam, op de teampagina of op de raceweek zelf, en de captain deelt je in bij een subteam. Het hoofdteam rijdt zelf geen races.",
      "Voor een ZRL-race meld je je niet op Zwift aan maar met de WTRL-racepass van je team. Die staat bovenaan de race van je team, en op de raceweek bij elk team. Een beheerder zet de passes per ronde op Beheer → ZRL-beheer.",
      "Bovenaan een race staat Raceinfo: je pacingplan en links naar Zwift, ZwiftPower en ZwiftRacing, recon-video's, ZwiftInsider en de racepagina op de ZWB-site. Zwift, ZwiftPower en ZwiftRacing volgen uit de Zwift-koppeling. Bij een ZRL-teamrace zet het platform die koppeling zelf, met starttijd en route, zodra WTRL het event op Zwift publiceert; daarvoor moet de divisie van het team op Beheer → ZRL-beheer → WTRL-teams staan. Heeft de race een Zwift-route, dan staat er ook ZwifterBikes bij: die opent de route, zodat je ziet welke fiets daar het snelst is. Je vermogen, gewicht en lengte vul je daar zelf één keer in; ZwifterBikes onthoudt ze in je browser. De andere links zet een beheerder onderaan Bewerk. De race van je team toont ook de links en de route van de raceweek, en op de raceweek wijst Pacingplan naar de race van je eigen team.",
      "Bij een Zwift-event staat bij Raceinfo welke powerups het event uitdeelt, met de kans per powerup zoals de organisator die instelt. Standaard betekent dat de organisator niets heeft ingesteld en Zwift zijn gewone mix uitdeelt; Geen betekent dat powerups uit staan. Bij een (ploegen)tijdrit zonder eigen instelling staat er niets, omdat het event daar niet zegt of er powerups zijn. Welk nummer in de eventgegevens bij welke powerup hoort, maakt Zwift niet bekend; die indeling komt uit de community.",
      "Rond de start van een race met Zwift-event staat bij Raceinfo en op je dashboard de knop ZWB DS, het live raceoverzicht; zie ZWB DS hieronder.",
      "Bij elke ZRL-teamrace staat bij Raceinfo de knop Racebriefing, voor alle leden. Bovenaan staat het racebriefje, een spiekbriefje zoals in de TTT Planner: de route getekend, met in markeerstift de afdaling die direct in een klim overgaat (daar gaat het veld op een lint en breekt het) en de slotklim omcirkeld, en bij een puntenrace of Race of Truth de sprints in groen, daaronder de momenten per kilometer, wat je onthoudt (de hoofdregel van het format omcirkeld), het plan van de captain, de rol per renner, wie je volgt en wat er mis is met de opstelling. Met Deel als plaatje onder het briefje deel je het als afbeelding, bijvoorbeeld in de teamapp; op de telefoon opent het deelmenu, op de computer wordt het plaatje gedownload. Wie de race beheert, schrijft onder het briefje het plan en een rol per renner, en past met Briefje bewerken alles op het briefje aan: de momenten, Onthouden, Volgen, Let op en de aantekeningen in het profiel (markeerstift, omcirkeld, label, boog of sprint, van en tot welke kilometer). Weet je iets wat de app niet weet, zoals een escalator in New York die je een duw van zo'n 1200 W geeft, zet het er dan zo op. Wat je niet aanraakt, blijft het voorstel van de app en groeit mee met de data; met Voorstel terugzetten haal je een aanpassing weer weg. De tactiek komt uit de kennisbank racen: klimmen, positie, de finale, en de laatste boog waar je een powerup krijgt. De tijd over een klim is een schatting voor de kop van de groep (A 5, B 4,5, C 3,8 en D 3 W/kg); hoe lang jij erover doet, hangt van je eigen vermogen af. Onder het briefje staan het parcours, onze ploeg en het veld. Onder het parcours staat Snelste fiets: de drie frames met wielen die op deze route het snelst zijn, met het verschil op de snelste en op de Zwift Carbon. Dat is gerekend met een renner van 75 kg en 183 cm op de middelste zFTP van onze renners (zonder zFTP 3,5 W/kg), met slipstream zoals het format die geeft, op stage 0, het niveau dat iedereen met dat frame heeft. Wat jij met je eigen plan het snelst rijdt, zie je onder Opzet in je pacingplan. Bij onze renners staan zFTP en zMAP uit WTRL, in oranje vanaf 97 % van de grens van de divisie: wie er in de race overheen gaat, krijgt strafpunten. De verwachte volgorde en punten per ploeg volgen uit de Zwift Racing Score van iedere renner (en de vELO van ZwiftRacing, zodra die gekoppeld is). Dat is een verwachting, geen voorspelling: dagvorm, tactiek en wie er echt start, zitten er niet in. De rollen zijn een voorstel uit vermogen en score; de captain past ze aan. Onder Eerder staat je plek in de massastarts van deze ronde; de ploegentijdrit telt niet mee. De ZRS wordt een keer per dag bij Zwift ververst; een renner die net is ingeschreven, krijgt zijn score bij het volgende bezoek.",
      "Stelt de captain je op, dan sta je op ja voor de race van dat team, ook als je eerder nee zei, en komt de race in je trainingsschema. Verplaatst of haalt de captain je weg, dan vervalt die ja.",
      "Meld je je beschikbaar voor een ZRL-race, of zeg je Ja op de racepagina van je team, dan sta je meteen in het team waar die race bij hoort. Afmelden haalt je er niet weer uit; dat doet een teambeheerder.",
      "Bij ZRL-teams staan zFTP, zMAP, categorie en divisieadvies per renner, zoals WTRL ze toont. Een beheerder plakt daarvoor de teams van WTRL My Teams op Beheer → ZRL-beheer → WTRL-teams. Wie daar in een team staat, ook als uitgenodigde, komt ook in het ZWB-team; zonder account kom je in het rooster en word je lid zodra je je naam claimt. Wie bij WTRL vertrekt en via WTRL in het team kwam, gaat er ook bij ZWB uit.",
      "Een Flamme Rouge-tour (FRR) staat als één regel in de kalender, met een knop per etappe; die regel blijft staan tot de laatste etappe is gereden. Op de tour zie je alle etappes met hun tijdsloten, op een etappe de tijdsloten waarin je die etappe kunt rijden. Je schrijft je in op Zwift. ZWB haalt de inschrijvingen daar om de paar uur op en zet je op ja voor het slot waarin je staat; kies je op Zwift een ander slot, dan verhuist je ja mee. Op de etappe zie je per slot welke ZWB'ers rijden, en links naar het klassement, de truien en het reglement op de FRR-site en naar het Discord-kanaal van de tour.",
      "Bij de tour en bij elke etappe staan ook de ZWB'ers in het algemeen klassement van FRR, per klasse, en onder Renners om in de gaten te houden de renners die in jouw klasse tot vijf plaatsen voor of achter je staan, of binnen een minuut eGAP. Bij elke renner staat in welk slot hij deze etappe rijdt; op de tour gaat dat over de eerstvolgende etappe. Met de ster volg je een renner, ook van buiten je klasse; met Volgen voeg je iemand toe met zijn Zwift-ID of ZwiftPower-link. Wie je volgt, ziet alleen jij. De eGAP is de achterstand op de leider van je klasse zoals FRR hem toont. Geeft FRR een renner een straf voor een upgrade, dan zit die in zijn eGAP en plaats, maar niet in zijn tourtijd; de straf staat er dan bij. Het klassement wordt ververst nadat een etappe is gereden, en telt alleen renners die de laatste etappe reden. Voor de eerste etappe is er nog geen klassement; dan zie je alleen je gevolgde renners. Je Zwift-ID moet op je profiel staan.",
      "Op de tour kies je bij ZWB in het klassement een etappe en zie je de stand na die etappe. Definitief is het klassement van de FRR-site; Voorlopig rekent ZWB zelf uit de finishtijden van Zwift, zoals hieronder beschreven, en is er meestal eerder. Heeft een etappe een van de twee nog niet, dan is die knop grijs. Volgen er van de laatste etappe nog tijdsloten, dan opent de lijst op de etappe ervoor. In het voorlopige klassement staat een ZWB'er zonder plaats als hij een etappe mist; renners die je zelf uit je klassement haalde, tellen er ook hier niet mee.",
      "Onder Voorlopig klassement staat je eigen FRR-klasse zoals ZWB hem zelf uitrekent, omdat FRR een etappe pas later verwerkt. De finishtijden komen per tijdslot uit Zwift en worden om de paar uur opgehaald. Per etappe en tijdslot zet de winnaar van je klasse de tijd, als hij elke etappe tot dan toe reed; iedereen daarachter verliest eGAP op hem, en het klassement telt dat over de etappes op. Reed de winnaar niet alles, dan krijgt de eerste renner die dat wel deed 1 seconde en rekent de rest vanaf hem. Een tijdrit gaat op individuele tijd: daar geldt hetzelfde over alle tijdsloten heen. Wie een etappe twee keer rijdt, telt met zijn eerste rit. Heeft FRR een etappe van een renner al verwerkt, dan neemt ZWB dat verlies over, met promoties en tijdstraffen erin. De eGAP is de achterstand op de leider van je klasse. Rechts staat het verschil met jou. Een straf die FRR al gaf, telt mee en staat erbij. Het is niet officieel: FRR kan tijden corrigeren, nieuwe straffen geven en renners naar een andere klasse zetten. Wie een etappe nog niet reed, staat apart onder Mist een etappe. Volgen er van een etappe nog tijdsloten, dan staat wie hem nog kan rijden onder Nog te rijden. Staat er een startgroep bij een renner, dan reed hij in een andere startgroep dan de rest van je klasse. Met het poppetje haal je een renner uit je klassement, bijvoorbeeld wie gepromoveerd is of in de verkeerde startgroep reed; hij zet dan ook geen tijd meer in zijn slot. Dat geldt alleen voor jou, en onder Verwijderd zet je hem terug.",
      "De Sunday Race Club (SRC) van MyWhoosh staat per zondag als één regel in de kalender, met daaronder de herenrace en de damesrace. De laatste zondag van de maand is de finale. Inschrijven doe je zelf op MyWhoosh, van maandag 09:00 tot donderdag 05:00 (Nederlandse zomertijd; in de winter een uur eerder): de knop staat op je race, samen met de starttijd per categorie en het weigh-in-venster. MyWhoosh deelt je categorie zelf in; die hoor je een dag voor de race.",
      "Voor een SRC-teamuitslag rijden 3 tot 5 renners uit dezelfde categorie onder dezelfde teamnaam; de beste drie tijden tellen. Je team ligt de hele maand vast, en voor de teamuitslag in de finale heb je in die maand twee afgeronde races nodig. Op een SRC-zondag in de kalender, of op Sunday Race Club (menu Club), klik je per zondag of je kunt. Deed je die maand nog niet mee, dan schrijft die klik je meteen in: heren of dames volgens je profiel, met je laatst gereden categorie. Race en categorie pas je aan op Sunday Race Club; daar kies je ook je team als er meer dan één is. Staat de race van die zondag al in de kalender, dan wordt dat meteen je antwoord op die race; anders gebeurt dat zodra MyWhoosh de race publiceert. Onder elk team zie je per zondag hoeveel renners er per categorie kunnen, en per renner hoeveel kwalificaties hij deze maand uitreed (finale ✓ vanaf twee). Van team wisselen kan tot de eerste race van de maand. Met herinneringen aan krijg je een pushbericht op de avond voordat de inschrijving sluit (tenzij je zei dat je niet kunt), en tien minuten voor het weigh-in-venster als je in een categorie met weigh-in rijdt.",
      "ZRL- en Ladder-uitslagen komen waar het kan vanzelf binnen.",
      "Ontbreekt er iets, dan kan een beheerder het met de hand aanvullen.",
    ],
  },
  {
    id: "zwb-ds",
    icon: Smartphone,
    title: "ZWB DS: live raceoverzicht",
    bullets: [
      "ZWB DS is het raceoverzicht voor een tweede scherm tijdens een Zwift-race, bijvoorbeeld je telefoon naast Zwift op je tablet. Je hebt er geen Sauce of computer voor nodig.",
      "De knop ZWB DS staat bij Raceinfo op de race en bij Jouw races op je dashboard, van een kwartier voor tot twee uur na de start. Hij verschijnt bij elke race in de kalender met een Zwift-event. Bij een ZRL-race staat hij ook op de live stand, en op ZWB DS staat een knop terug naar de stand.",
      "ZWB DS opent in de Zwift-groep waarin jij staat, anders in de groep met de meeste ZWB'ers. Met de knoppen bovenaan wissel je van groep.",
      "Bovenaan staat het hoogteprofiel van de hele race, met streepjes voor de sprints en KOM's en een stip per renner; de ZWB'ers in clubkleur. Renners die dicht bij elkaar rijden, staan op een stapel, zodat je ziet hoe groot een groep is. Daaronder dezelfde weg uitvergroot, drie kilometer rond jou, of rond de kop als je zelf niet meerijdt. De stippen schuiven tussen twee standen door op hun laatste snelheid.",
      "Per ZWB'er zie je de plek in het veld, de achterstand op kop, W/kg nu en gemiddeld sinds de start, snelheid, cadans, draft en de helling waar hij of zij rijdt, en daaronder de kilometers die nog resten en de volgende sprint of KOM. ZWB'ers die nog niet in beeld zijn, staan eronder.",
      "Onder Groepen staan de groepen van voor naar achter met hun achterstand, gemiddelde W/kg, snelheid, helling en de ZWB'ers erin; open een groep om per renner W/kg nu, gemiddeld en snelheid te zien. Geeft Zwift geen gewicht, dan staat er watt in plaats van W/kg. Wie binnen is, staat onderaan.",
      "Zwift geeft maar een beperkt aantal standen per minuut, voor alle races samen. Een stand kan daarom een halve minuut oud zijn, en op een avond met veel races tegelijk ouder; tussendoor schat ZWB DS de plek met de laatste snelheid. Renners die meer dan 5 seconden uit elkaar liggen, staan in een andere groep. Onder de titel staat hoe oud de stand is. Staat er Zwift remt af, dan haperde het bijwerken even.",
      "Hartslag toont ZWB DS van niemand. Wat we opvragen en hoe lang we het bewaren, staat in de privacyverklaring.",
      "Zwift je op een computer, dan geeft Sauce for Zwift dezelfde informatie seconde voor seconde, met de renners om je heen.",
    ],
  },
  {
    id: "rankings",
    icon: Trophy,
    title: "ZWB Rankings",
    bullets: [
      "Alle ritten tellen mee, of ze nu via Strava, intervals.icu of een import binnenkwamen. Een rit die twee keer binnenkwam telt één keer.",
      "Alle lijsten gaan over één week, van maandag tot en met zondag: Zitvleeskampioen (meeste uren), Kilometervreter, Klimmer van de week (hoogtemeters), Meest actief (ritten), Lange adem (langste rit in tijd), Buitenbeentje (buiten) en Binnenvetter (op de rollenbank); die twee kun je bekijken in kilometers of in uren.",
      "Verder: Metronoom (op hoeveel dagen je fietste), Clubmens (events waar je ja op zei, plus de dagen dat je live meereed via Samen fietsen) en Groeibriljant (hoeveel punten je ZWBriljant-steen erbij kreeg sinds de steen van vorige week).",
      "Groeibriljant toont alleen leden die hun ZWBriljant-steen delen. Verberg je je steen, dan sta je er niet in en zie je de lijst niet.",
      "Je ziet de top 3 en je eigen plek. Tik op een lijst voor de hele ranglijst.",
      "De winnaars van Zitvleeskampioen, Kilometervreter, Klimmer van de week en Meest actief krijgen na afloop van de week een weekbadge.",
    ],
  },
  {
    id: "badges",
    icon: Medal,
    title: "Badges en achievements",
    bullets: [
      "Weekbadges en milestonebadges komen uit je ritten: via Strava, intervals.icu of een import.",
      "Krijg je een melding over activiteitenrecht? Koppel Strava opnieuw en zet het vinkje voor activiteiten aan.",
      "Geen plek voor Strava? Laat je ritten binnenkomen via intervals.icu (zie Ritten via intervals.icu), of importeer op het dashboard je historie (activities.csv) of ritten met spoor (GPX of FIT).",
      "Het aantal Strava-koppelingen is beperkt. Ben je 90 dagen niet in de app geweest, dan vervalt je koppeling; twee weken vooraf krijg je een melding.",
      "Ontkoppel je Strava op je profiel, dan kies je zelf: Ritten bewaren laat je opgehaalde ritten, segmenttijden en fietsen in ZWB staan, Ritten wissen haalt ze weg. Er komt daarna niets nieuws meer binnen. Badges en ZWBlokken blijven altijd.",
      "Milestonebadges blijven altijd op je profiel staan.",
      "Klik op een badge om te zien welke drempel erbij hoort.",
    ],
  },
  {
    id: "cols",
    icon: Mountain,
    title: "Cols, segmenten en records",
    bullets: [
      "ZWB herkent cols en segmenten automatisch uit je Strava-ritten.",
      "Je recordtijd komt rechtstreeks van Strava; per segment zie je de ZWB-ranglijst.",
      "Nieuw record niet zichtbaar? Klik op ZWB Rankings op 'Badges herberekenen'. Recordtijden haalt de knop één keer per dag bij Strava op.",
    ],
  },
  {
    id: "onderhoud",
    icon: Wrench,
    title: "Mijn garage",
    bullets: [
      "Houd slijtbare onderdelen (ketting, cassette, banden, remblokken …) bij op basis van je Strava-kilometers.",
      "Kies per onderdeel een slijtage-range (enige, normale of hoge slijtage) of vul een eigen kilometerdrempel in.",
      "Je krijgt een melding zodra een onderdeel toe is aan vervanging; op het dashboard zie je wat bijna of over de drempel is.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community, polls, media en ritverslagen",
    bullets: [
      "Met een poll vraag je de club snel om een keuze.",
      "Onder Media staan nieuws, mededelingen, video's en podcasts.",
      "Schrijf na een gereden event een ritverslag met vaste kopjes: voorbereiding, verloop, uitslag en leerpunten. Je hoeft niet alles in te vullen; je eigen uitslag staat er al bij als die bekend is.",
      "Anderen kunnen op je verslag reageren; met Deel stuur je het via WhatsApp door.",
    ],
  },
  {
    id: "zwbieb",
    icon: Lightbulb,
    title: "ZWBieb",
    bullets: [
      "ZWBieb (onder Club) is de bieb van de leden. Onder Kennis zie je per onderwerp wie er ervaring mee heeft, met hun tips. Onder Spullen zie je wie iets wil uitlenen, zoals een fietskoffer, momentsleutel, fietsendrager of camper.",
      "Onder Leeszaal staan alle artikelen uit de kennisbanken trainen, voeding en core & mobiliteit bij elkaar, per onderwerp, met een zoekveld. Onder een artikel staan clubleden die er ervaring mee hebben; bij een onderwerp onder Kennis staan de artikelen die erover gaan.",
      "Doe mee via Mijn ZWBieb: kies tot zes onderwerpen en tot vijftien spullen, met eventueel een korte toelichting. Daar stop je ook; je onderwerpen en spullen verdwijnen dan, je tips en gesprekken blijven.",
      "Staat jouw onderwerp of spul er niet tussen, typ het dan onder Ander onderwerp of Ander spul. De app laat eerst zien wat er al op lijkt. Je kunt er vijf per dag toevoegen. Kies geen onderwerp over je gezondheid: dat ziet de hele club.",
      "Vraag het aan opent een gesprek met dat lid, alleen voor jullie twee, ook om iets te lenen. Ophalen, terugbrengen en schade spreken jullie samen af. Je krijgt een melding bij een antwoord, en een icoon bovenin zolang er iets ongelezen is.",
      "Krijg je in een gesprek een antwoord dat de club ook moet weten, kies dan Bewaar als tip. De tip komt op naam van wie het schreef; die krijgt een melding en kan hem aanpassen of verwijderen. Je eigen berichten kun je niet als tip bewaren: dat beslist de ander.",
      "Een tip kan ook bij een event horen: onder Van leden op de eventpagina, samen met tips bij de cols op de route.",
      "Je tips pas je aan of verwijder je in de lijst of onder Mijn ZWBieb. Het bestuur kan een tip verbergen, en een onderwerp hernoemen of verbergen.",
    ],
  },
  {
    id: "training",
    icon: Bike,
    title: "Training en trainer-toegang",
    bullets: [
      "Koppel intervals.icu voor geplande workouts en trainingsbelasting.",
      "Je doeltype bepaalt of het schema naar één piekdag toewerkt of doorbouwt tot het eind.",
      "Je kiest zelf welke trainer jouw trainingsdata mag zien.",
      "AI maakt conceptschema's; de trainer keurt publicatie goed.",
      "Sla je een doel op, dan krijgt je trainer een melding dat er een concept gedraaid kan worden.",
      "In de coachchat vraag je waarom je schema eruitziet zoals het eruitziet, en wat je trainingsdata zeggen.",
      "Op zondagavond vanaf 18:00 opent je weekoverzicht: per scherm wat je die week deed (ritten, schema, belasting, vermogen, je ZWBriljant-steen, teams, voeding en core, club), het oordeel van de coach, en als laatste je beschikbaarheid voor de week erna. Tik rechts voor verder, links voor terug, houd vast om te pauzeren. Wat je die week niet gebruikte, krijgt geen scherm.",
      "Op de laatste pagina van het weekoverzicht schuif je per dag je tijd; je ziet erbij voor welke events je al beschikbaar, opgesteld of aangemeld bent, en waar een event meer tijd vraagt dan je opgaf. Opslaan werkt je schema bij, net als op de schemapagina.",
      "Het oordeel in het weekoverzicht schrijft de AI-coach als je ZWBeter voor je training gebruikt; anders is het een korte samenvatting uit vaste regels. De pop-up komt vanzelf tot en met woensdag; op het dashboard staat de hele week een ingang naar het overzicht van de laatst afgesloten week.",
      "Je trainer ziet bij een gereden training suggesties uit de uitvoering, en onder Races de tips uit je Zwift-races; hij beslist zelf wat hij je als feedback stuurt.",
    ],
  },
  {
    id: "zwbgame",
    icon: Bike,
    title: "ZWBgame: Zwift-koers, jouw tactiek",
    bullets: [
      "Speel via Club → ZWBgame een Zwift-race tegen clubgenoten, op echte Zwift-routes van 15 tot 25 km: Flat Route, Hilly Route, Cobbled Climbs, Greater London Loop, Tempus Fugit, Innsbruckring en Glasgow Crit Circuit, met hun eigen ronden, sprints en KOM's. Een route staat er pas als het hoogteprofiel in de routebibliotheek zit. Een race van 30 tot 40 minuten speelt in ongeveer zes minuten: de tijd loopt versneld. Waar de koers beslist wordt, loopt hij langzamer, zodat je kunt kiezen: bij de start, een aanval in de buurt, een gat dat valt, de voet en de top van een klim, een sprint of KOM, en de laatste kilometer. Een gouden label naast de klok zegt welk moment het is.",
      "Club Ladder: jouw ploeg van vijf tegen een andere clubploeg van vijf, zoals op ladder.cycleracing.club. De finishplekken 1 tot en met 10 krijgen 10, 9, 8 … 1 punt; de ploeg met de meeste punten wint. Jij bent altijd de uitdager, dus een gelijke stand is verlies. Je daagt een ploeg uit tot zeven plekken boven je. Win je, dan neem je hun plek in en schuift iedereen daartussen één plek omlaag. Rij je in een ZWB-ladderteam, dan rijden je herkenbare teamgenoten mee; open plekken gaan naar clubgenoten van jouw niveau. De tegenstanders zijn negen clubploegen rond jouw niveau, de zwakste onderaan. De ladder bewaart je browser.",
      "ZRL: jouw ploeg tegen vijf clubploegen van gelijke sterkte, volgens de WTRL-regels. Staat er een ZWB-ZRL-race met route in de clubkalender, dan staat die route bovenaan: zo oefen je de race van de week. Rij je in een ZRL-team, dan rijden je herkenbare teamgenoten mee (bij B1 of B2 dat subteam). Kies het format. Puntenrace: FAL (eerste over de streep van een sprint of KOM: evenveel punten als starters, dan één minder per plek), FTS (de tien snelste tijden over een segment: 15, 12, 10, 8, 6, 5, 4, 3, 2, 1), finish (evenveel punten als starters, aflopend) en podium (10, 8, 6, 4, 2). Race of Truth: dezelfde punten, zonder slipstream. Scratch: alleen finish en podium. Ploegentijdrit: alleen het wiel van je eigen ploeg, de tijd van je vierde renner telt, met minder dan vier binnen heeft je ploeg geen uitslag. De ploeg met de meeste punten (of de snelste tijd) krijgt evenveel leaguepunten als er ploegen zijn, dan één minder per plek.",
      "FRR-tour: vier etappes na elkaar met hetzelfde veld van 24 renners rond jouw niveau: een vlakke rit, een heuvelrit, een tijdrit en een slotrit. De tijdrit is zoals op Zwift: iedereen start tegelijk, zonder slipstream en zonder powerups. Het klassement (geel) telt je tijdverlies op de winnaar per etappe op; alleen wie elke etappe uitrijdt, staat erin. Finishpunten per etappe: 25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, daarna 1 punt; in de tijdrit dubbel. Sprints en klimmen scoren alleen op de snelste tijd over het segment (geen punten voor wie eerst boven is), met dezelfde schaal voor de beste vijftien: een klim maal zijn moeilijkheid (1 tot 5, naar de hoogtemeters), sprints in een vlakke rit maal 1,3. Groen gaat naar de meeste sprintpunten, de bolletjes naar de meeste klimpunten, blauw naar alle punten samen. Kom je meer dan 20% na de winnaar binnen, dan kost de bezemwagen je 20 punten op het totaal. Je tour blijft in je browser tot je hem stopt of uitrijdt.",
      "Vrije race: jij tegen maximaal 23 clubgenoten rond jouw niveau, zoals een Zwift-categorie. Bij een klein roster vullen fictieve gasten het veld aan.",
      "Je rijdt in een van vier standen: Sparen (1), Meerijden (2), Naar voren (3) of Aanvallen (4); ook met pijltje omhoog en omlaag. Meerijden houdt je in het wiel en volgt het tempo van de groep, maar geen aanval. Gaat er iemand weg, dan wordt de knop Volg (ook met 2): daarmee ga je mee in het wiel van de aanvaller. Doe je niets, dan valt er een gat. Over de top van een klim neemt Meerijden even gas terug; wie dan geen gat wil, kiest Naar voren. Valt er een gat van meer dan zo'n 20 meter, dan rijd je je eigen tempo tot je zelf iets doet. Sparen trapt niet meer dan nodig en nooit boven je drempel. Naar voren rijdt op je drempel in de wind, en met een groep achter je iets harder (een beurt op kop). Aanvallen gaat er ver boven en wordt in de laatste 400 meter Sprinten. Tik op een renner in het koersoverzicht om diens wiel te volgen.",
      "Zoals in Zwift sinds Pack Dynamics 4: in het wiel heb je minder luchtweerstand, en hoe verder achter in een rij, hoe meer (als tweede ongeveer een kwart, als vierde ruim een derde). De slipstream reikt achter een groep verder dan achter één renner. Op het vlak scheelt dat veel, op een steile klim bijna niets; daar telt vermogen per kilo. Naast de renner op kop zit je zelf in de wind, dus voorbijgaan kost echt vermogen. Een groep rijdt alleen hard als renners om de beurt op kop gaan. De start gaat hard: wie dan spaart, mist de kopgroep. Op een steile afdaling brengt Sparen je in supertuck, maar alleen buiten het wiel.",
      "W′ is je reserve boven je drempel: aanvallen, gaten dichtrijden en sprinten kosten W′. Onder je drempel vult hij weer, langzaam. Is hij leeg, dan kom je niet meer boven je drempel en zet het spel je terug op Meerijden. Frisheid daalt met elke lucifer die je afsteekt en met lang hard rijden; minder frisheid kost drempel en sprint voor de rest van de race. In het wiel sparen houdt je fris voor de finale.",
      "Powerups krijg je onder een sprint- of KOM-boog en op de rondestreep, één tegelijk. Gebruik ze met de spatiebalk, net als in Zwift. Veer maakt je 30 seconden lichter (klimmen), Aerohelm geeft 15 seconden minder luchtweerstand (sprint, aanval), Draft boost geeft 40 seconden meer slipstream (alleen in het wiel). Burrito: 20 seconden krijgt niemand achter je slipstream (wegrijden op het vlak). Spook: 15 seconden ziet niemand je aanval, niet in de laatste 400 meter. Aambeeld: 15 seconden zwaarder, alleen in een afdaling (met supertuck). Stoomwals: 30 seconden rol je over onverhard als over asfalt. Het aambeeld krijg je alleen op een route met een echte afdaling, de stoomwals alleen op een route met onverhard.",
      "Onverhard, gravel en kasseien staan als bruine strook in het hoogteprofiel en op de weg. Een racefiets rolt daar veel trager, zoals in Zwift: het werkt als een korte klim. Zit vooraan als het onverhard begint; wie aanvalt, doet dat daar.",
      "Ploegorders in de ladder en de ZRL (5, 6, 7, 8): Vrij rijden laat je ploeggenoten hun eigen koers rijden. Breng me terug laat een ploeggenoot met de meeste reserve op je wachten en je terugslepen naar de groep. Lead-out laat een ploeggenoot in de laatste kilometer de sprint voor je aantrekken. Pak de punten (alleen in een ZRL-puntenrace en Race of Truth) stuurt je snelste ploeggenoot op de FAL- en FTS-punten af; de tegenstanders doen dat altijd. Maak het hard (9): je ploeggenoten in jouw groep rijden tempo op kop, om sprinters te lossen. Niet meewerken (0): zit jij voor, dan rijden je ploeggenoten in de groep erachter niet mee op kop en halen ze je dus niet terug. Ga mee (G): je ploeggenoten springen meteen mee met elke aanval van een andere ploeg. Om beurten aanvallen (O): wordt jouw aanval teruggehaald, dan valt een uitgeruste ploeggenoot meteen aan, zodat de rest opnieuw moet jagen. Bij de lead-out rijdt in de laatste 800 meter een tweede ploeggenoot vooruit, als springplank. De andere ploegen rijden per race een eigen plan (hard maken, meegaan of om beurten aanvallen) en zetten altijd een lead-out op. In een ploegentijdrit kies je Korte beurten (5, snel maar zwaar), Lange beurten (6, rustiger maar trager) of Wacht op de vierde (7: wie op kop rijdt, neemt gas terug als de vierde renner meer dan 10 meter achter ligt). De tussenstand van de ploegen staat bovenin, ook per groep.",
      "In de tijdrit en de Race of Truth is er geen wiel: Meerijden is je eigen tijdrittempo. Met de knoppen min en plus (of de toetsen - en +) zet je dat tempo in stappen van 3% tussen 91% en 103% van je drempel. Wie te hard begint, heeft aan het eind geen W′ meer.",
      "In de koerslijst laat een vlam zien wie nu aanvalt (hard en uit het wiel), en een icoon het rennerstype: bliksem voor een sprinter, berg voor een klimmer, pijl omhoog voor een puncher, meter voor een diesel, fiets voor een allrounder. Een aanval vanuit het wiel zien anderen pas als de aanvaller eruit komt: dat is de slingshot.",
      "Na de finish staat het koersverloop per kilometer: in welke groep je zat (goud is de kopgroep), hoeveel W′ je over had, en hoe lang je in de wind reed. Erboven staan je aanvallen en powerups, en rood waar je W′ leeg was of waar je gelost werd. Daaronder dezelfde momenten als lijst. Zo zie je waar de koers voor jou beslist werd.",
      "Oefenen: zeven korte koersen met elk één doel. Eerste selectie (haal de kopgroep na de start), Over de top (blijf bij de groep over drie korte klimmen), Slingshot (win de sprint uit het wiel), Overbruggen (sluit aan bij een groep van vijf, met een afdaling ertussen), Wegrijden (win na het onverhard), Puntenjacht (kom als eerste over twee van de drie bogen) en Ploegentijdrit (je vierde renner is sneller dan die van een ploeg net boven jullie niveau; dat lukt alleen met beurten op kop). Een oefening wordt niet bewaard of hervat; je browser onthoudt alleen welke je haalde.",
      "Iedere renner heeft per race een dagvorm tussen -6% en +6%; die van jezelf zie je onder de bediening. Bots rijden per race met een eigen karakter: hoe aanvallend ze zijn en hoe ver van de streep ze hun finale inzetten. Ze vallen aan waar koersen breken: over de top van een klim, onderaan een afdaling, op onverhard, vlak nadat een aanval is teruggehaald, en vaker als de koers al lang hard ging.",
      "Je kwaliteiten komen automatisch uit het platform: de Intervals-vermogenscurve als je die hebt gekoppeld, anders FTP en gewicht uit je profiel. Vlak volgt je FTP in watts, klimmen je watts per kilo en sprint je 15-secondenvermogen. In de race rekent iedereen met hetzelfde referentielichaam, dus de game laat geen echte watts zien. Zonder FTP of gewicht rijd je met een basisprofiel van 100. Rosterleden zonder account rijden altijd met een basisprofiel.",
      "Via Spelinstellingen kun je herkenbare deelname uitschakelen; dan rijd je niet mee in het peloton of de ploeg van anderen. Kloppen je platformgegevens niet, sla dan een eigen spelprofiel op. Eigen meting vraagt FTP en gewicht; sprint- en korte vermogens zijn optioneel. Met Platformgegevens gebruiken zet je dat terug.",
      "Een Intervals-spelprofiel gebruikt een 90-dagencurve, met alleen meetpunten waarvan de activiteit een bevestigde toegestane bron heeft. Vul je gewicht zelf in. Een geschikt 20-minutenpunt is nodig; de game schat FTP als 95% daarvan. Onbekende bronnen en Strava-data worden uitgesloten. Bijwerken kan maximaal drie keer per uur. Een eigen spelprofiel vervalt na 30 dagen; daarna gelden weer je platformgegevens. Herkenbare deelname wijzigen wist ook je eigen spelprofiel.",
      "Pauzeer met de pauzeknop, Esc of P. Een verborgen tabblad pauzeert automatisch. Hervatten controleert het ledenroster opnieuw; afgemelde leden worden gasten en ingetrokken of gewijzigde sportprofielen worden basisrenners. Per browser en account blijft één race maximaal zeven dagen hervatbaar. Een nieuwe race vervangt de vorige. Uitslagen en ladder zijn alleen lokaal; uitslagen wis je bij Jouw laatste koersen.",
      "Draai je telefoon liggend: tijdens de race vult het spel dan het hele scherm, met de standen onder je rechterduim, powerup en ploegorders links en het hoogteprofiel rechtsboven. Tik op een groep in de groepenbalk om die groep in beeld te zien; tik op je eigen groep om weer jezelf te volgen. Met de knop voor volledig scherm verdwijnt ook de adresbalk; op telefoons die het toestaan draait het beeld mee. 3D · zuinig verlaagt de grafische belasting. Zonder WebGL blijven koersoverzicht en bediening bruikbaar. Bij een geblokkeerde browseropslag kun je wel spelen, maar niet betrouwbaar bewaren.",
      "Beheerders kunnen ongeclaimde rosterleden uitsluiten of weer toevoegen via /zwbgame/beheer. Er is nog geen multiplayer of gedeeld klassement.",
    ],
  },
  {
    id: "voorzpwelbokaal",
    icon: Trophy,
    title: "voorZpWelBokaal: wedden op het veldrijden",
    bullets: [
      "Via Club → voorZpWelBokaal zet je ZWBallen in op de elitewedstrijden van dames en heren in het veldrijden. Tik op Meedoen; je begint het seizoen met 10 ZWBallen.",
      "Op het bord staan per renner drie quoteringen: wint, podium (top 3) en top 10. Daaronder staan twee duels: wie van de twee eindigt hoger. Tik een quotering aan, kies met + en − hoeveel ballen erop gaan en tik Op de lei zetten. Een raak briefje betaalt inzet × quotering terug op je saldo; die winst kun je weer inzetten.",
      "Per wedstrijd zet je hoogstens 5 ballen in, dames en heren apart, ook als je saldo groter is. Met 10 ballen speel je dus beide wedstrijden voluit; staat je saldo lager, dan kies je.",
      "Je kunt inzetten en intrekken tot de start van die wedstrijd. Je quotering ligt vast op het moment dat je inzet, ook als het bord daarna nog verandert.",
      "De quotering komt uit de veldritrating van CyclingFlash. Elke renner krijgt een kracht e^(rating ÷ 35); de kans om te winnen is zijn kracht gedeeld door de som van alle krachten op de startlijst. Podium en top 10 komen uit 20.000 gesimuleerde koersen met dezelfde krachten, een duel is kracht A ÷ (kracht A + kracht B). De quotering is 1 ÷ kans, naar beneden afgerond op de ladder van een gokkantoor (1,05 · 1,10 · … · 33 · 50). Onder 1,05 staat er een streepje, boven 50 wordt het 50. Renners zonder rating rekenen met 600.",
      "Per wedstrijd is er een bonusvraag met vaste antwoorden. Antwoorden kost niets; een goed antwoord levert 1 ZWBal op. Het platform kijkt hem na uit de uitslag.",
      "Niet gestart: je inzet komt terug. Opgegeven telt als niet gefinisht. In een duel waarin geen van beiden finisht, krijg je je inzet terug. Gaat een wedstrijd niet door, dan krijgt iedereen zijn inzet terug.",
      "Briefjes toont al je inzetten van dit seizoen met wat ze opleverden. Op de lei staat iedereen die meedoet, met saldo. Na de laatste wedstrijd van het seizoen wint het hoogste saldo. Sta je op nul, dan kom je terug via de bonusvragen.",
      "Met Stoppen onder je briefjes wis je je deelname van dit seizoen, met al je inzetten en antwoorden.",
      "Beheerders zetten wedstrijden op het bord via /voorzpwelbokaal/beheer: ratings ophalen, met Seizoenskalender alle komende wedstrijden van Wereldbeker, Superprestige, HG Cross en de kampioenschappen (BK, NK, EK, WK) in de lijst zetten of een losse eventlink van CyclingFlash toevoegen, de startlijst ophalen (dat zet ook de echte starttijd) en na de koers de uitslag ophalen en afrekenen. Weigert CyclingFlash de server, plak dan de paginabron.",
    ],
  },
];

// Volledige wegwijzer: wat doet elke pagina/sectie van de app.
export const OVERVIEW: { href: string; name: string; text: string }[] = [
  { href: "/dashboard", name: "Dashboard", text: "Je startscherm: deze week, recente clubritten, ritverslagen en nieuws. Hier koppel en synchroniseer je ook je ritten, of importeer je ze (CSV/GPX)." },
  { href: "/kalender", name: "Kalender", text: "Alle events: groepsritten, ZRL, Ladder en socials. RSVP met Ja of Misschien, en filter met Voor mij op wat bij je past, of per label op soort event of programma." },
  { href: "/samen-fietsen", name: "Samen fietsen", text: "Live kaart van wie er nu rijdt, met livechat. Tracking stel je in via je Garmin of Wahoo." },
  { href: "/teams", name: "Teams", text: "Teams, rosters en ZRL-/Ladder-standen, inclusief de TTT-planner." },
  { href: "/src", name: "Sunday Race Club", text: "Je SRC-team per maand en per zondag wie er kan, per categorie." },
  { href: "/leden", name: "Leden", text: "Ledenlijst met categorie en badges; filter op regio of categorie." },
  { href: "/stats/rankings", name: "ZWB Rankings", text: "De ranglijsten van deze en vorige week, de Hall of fame en het herberekenen van badges." },
  { href: "/zwbeter-worden", name: "ZWBeter Worden", text: "Schema's, AI-coach, je ZWBeterWorden-advies, belasting en de koppelingen." },
  { href: "/zwbeter-worden/vermogen", name: "Mijn vermogen", text: "Je powercurve en de vergelijking met de club." },
  { href: "/zwbeter-worden/racen", name: "ZWBeter racen", text: "Je gereden Zwift-races (ZRL, FRR of via een geplakte link): tips, de ploeg of je eigen race, en je rit uit intervals.icu. Onder Kennisbank: tactiek in een Zwift-race, met bronnen." },
  { href: "/zwbeter-worden/materiaal", name: "ZWBeter materiaal", text: "Kennisbank over materiaal en kleine winsten, met een rekenaar wat een verandering je oplevert." },
  { href: "/mijn-garage", name: "Mijn garage", text: "Je fietsen en de slijtage van hun onderdelen, met een melding zodra er iets toe is aan vervanging." },
  { href: "/profiel/cols", name: "Cols & segmenten", text: "Welke cols en segmenten je deed, met je PR en de ZWB-ranglijst." },
  { href: "/ritverslagen", name: "Ritverslagen", text: "Schrijf een verslag bij een gereden event; anderen reageren." },
  { href: "/community", name: "Community", text: "Mededelingen en clubnieuws." },
  { href: "/polls", name: "Polls", text: "Snelle stemmingen vanuit de club." },
  { href: "/qa", name: "Q&A", text: "Je vraag over de app, met het antwoord van het bestuur." },
  { href: "/media", name: "Media", text: "Nieuws, nieuwsbrieven, podcasts, video's en Instagram." },
  { href: "/stats", name: "Stats", text: "Club: de cijfers en ranglijst van alle leden. Ik: je eigen ritten, vermogen en records." },
  { href: "/sponsors", name: "Sponsors", text: "Onze sponsoren en ledenvoordeel." },
  { href: "/voorzpwelbokaal", name: "voorZpWelBokaal", text: "Wedden met ZWBallen op het veldrijden: het bord, je briefjes en de lei." },
  { href: "/profiel?weergave=bewerken", name: "Profiel", text: "Je gegevens, zichtbaarheid, je fietsen, koppelingen (Strava/intervals) en account." },
];

export const GARMIN_LIVETRACK_STEPS = [
  "Maak op Samen fietsen je persoonlijke adres en kopieer het. Het wordt één keer getoond.",
  "Zet je Edge aan, open Garmin Connect en wacht tot de Edge verbonden is.",
  "Ga naar Veiligheid en tracking → LiveTrack → Deelinstellingen → Ontvangers.",
  "Maak daar een nieuw contact aan met het adres. Een contact in je telefoon is niet nodig.",
  "Start een LiveTrack-sessie en kijk bij Sessiedetails of het adres als ontvanger staat. Je verschijnt binnen een paar minuten op de kaart.",
  "Zet Automatisch starten aan, dan start LiveTrack voortaan bij elke rit vanzelf.",
];

export const WAHOO_LIVETRACK_STEPS = [
  "Open de ELEMNT-app, ga naar Live Track en kopieer je vaste link (wahooligan.com/users/live/…).",
  "Plak de link op Samen fietsen bij Wahoo en klik Koppelen.",
  "Start een rit op je ELEMNT terwijl je telefoon verbonden is. Je verschijnt op de kaart zodra iemand Samen fietsen of de eventpagina opent; dat kan een paar minuten duren.",
];

export const LIVETRACK_NOTES = [
  "Je Wahoo-link blijft bij ons: andere leden zien je positie op de ZWB-kaart, niet de link.",
  "Per rit hoef je niets te doen. Na de rit verdwijn je vanzelf.",
  "Klik op Samen fietsen op een renner voor snelheid, afstand, vermogen en cadans. Hartslag zie je alleen bij wie Hartslag delen met leden aanzet.",
  "Geen bolletje op de kaart? Je fietscomputer heeft dan nog geen GPS-fix. Binnen lukt dat meestal niet.",
  "Laat Garmin Connect of de ELEMNT-app op de achtergrond draaien; zonder telefoonverbinding komt er niets door.",
  "Een nieuw adres maken vervangt het oude meteen. Koppeling stoppen of ontkoppelen werkt direct; haal het adres daarna ook weg in Garmin Connect.",
];

export const RIDE_MESSAGE_GARMIN_STEPS = [
  "Zet op je profiel de ZWB-meldingen aan op je telefoon en vink Bericht op mijn fietscomputer aan. Op een iPhone werkt dat alleen als ZWB als app op je beginscherm staat.",
  "Zet in Garmin Connect de meldingen van je telefoon aan voor je Edge of horloge. Op Android kies je daar per app; vink ZWB of je browser aan.",
  "Test het met Testbericht op Samen fietsen.",
];

export const RIDE_MESSAGE_WAHOO_STEPS = [
  "Installeer Telegram op je telefoon. De ELEMNT toont geen ZWB-meldingen, wel die van Telegram.",
  "Klik op Samen fietsen bij Berichten via Telegram op Koppelen en dan op Open Telegram. Druk in Telegram op Start.",
  "Zet in de Wahoo-app bij je ELEMNT de meldingen voor berichten aan (bij een oudere ELEMNT heet dat Alerts).",
];

export const RIDE_MESSAGE_NOTES = [
  "De maker van een event stuurt een bericht vanuit de livechat; elk lid kan op Samen fietsen een bericht sturen aan iemand die live rijdt.",
  "Berichten zijn één regel van hoogstens 160 tekens.",
  "Hangt er ook een smartwatch aan je telefoon, dan krijgt de ELEMNT de melding soms niet.",
  "Met Testbericht op Samen fietsen stuur je jezelf een bericht, om te zien of het op je fietscomputer verschijnt.",
  "Stoppen kan met Ontkoppelen op Samen fietsen, of met /stop in Telegram. Het vinkje op je profiel zet beide kanalen uit.",
];

export const WAHOO_STEPS = [
  {
    title: "Open de Wahoo-instellingen op intervals.icu",
    text: "Ga op intervals.icu naar Settings (instellingen) en scroll naar het Wahoo-blok.",
  },
  {
    title: "Connect to Wahoo",
    text: "Klik op 'Connect to Wahoo', log in met je Wahoo-account en geef toestemming.",
  },
  {
    title: "Zet 'Upload planned workouts' aan",
    text: "Vink het vakje aan om geplande workouts te uploaden. De workouts van de komende 7 dagen gaan dan automatisch naar de Wahoo Cloud.",
  },
  {
    title: "Synchroniseer je ELEMNT",
    text: "De workouts verschijnen op je ELEMNT onder Planned Workouts (sync via wifi of de ELEMNT-app). Geen bestand downloaden nodig.",
  },
];

export const ZWIFT_STEPS = [
  {
    title: "Open de Zwift-instellingen op intervals.icu",
    text: "Ga op intervals.icu naar Settings (instellingen) en zoek het Zwift-blok.",
  },
  {
    title: "Connect",
    text: "Klik op 'Connect' en geef toestemming. Log eerst in op het Zwift-account dat je zelf gebruikt.",
  },
  {
    title: "Zet ritten aan bij de workout-types",
    text: "Kies welke types naar Zwift gaan en zorg dat ritten aanstaan. De workouts van de komende week gaan dan automatisch mee.",
  },
  {
    title: "Start Zwift",
    text: "De training van vandaag staat op het beginscherm, of via Workouts → Custom → Intervals.icu.",
  },
];

export const ZWIFT_NOTES = [
  "Zet je FTP in Zwift gelijk aan die in ZWB: de blokken gaan als percentage van je FTP mee, dus een afwijkende FTP geeft andere watts.",
  "Alleen vermogen en cadans gaan mee, geen hartslagdoelen.",
  "Alleen de komende week wordt vooruitgestuurd, niet je hele schema.",
  "Je Zwift-ritten komen vanzelf terug in intervals.icu, dus je belasting in ZWB blijft kloppen.",
  "Dag aangepast? Publiceer opnieuw, dan gaat de nieuwe versie bij de volgende sync mee.",
];

export const ZWIFT_MATCH_FACTORS = [
  {
    title: "Duur:",
    text: "hoe dicht het event bij de geplande tijd zit. Weegt het zwaarst.",
  },
  {
    title: "Intensiteit:",
    text: "de W/kg van de pacegroep omgerekend naar een percentage van jóúw FTP. Dezelfde groepsrit is voor een lichtere of sterkere renner een andere training.",
  },
  {
    title: "Belasting:",
    text: "de geschatte TSS van het event naast die van je geplande training.",
  },
  {
    title: "Terrein:",
    text: "klimwerk bij tempo, drempel en VO2max; vlak bij duur en herstel.",
  },
  {
    title: "Starttijd:",
    text: "hoe ver de start afligt van het moment waarop je training staat.",
  },
  {
    title: "Populariteit:",
    text: "weegt het lichtst, en telt hoe druk een event is vergeleken met andere events op hetzelfde uur van de dag. Rijden er ZWB'ers mee, dan zie je dat erbij.",
  },
];

export const ZWIFT_MATCH_NOTES = [
  "Voorstellen gaan over ongeveer de komende elf uur: verder vooruit geeft Zwift zijn kalender niet vrij. Voor de training van vandaag of vanavond staat er dus iets, voor die van overmorgen niet.",
  "Vul je FTP en gewicht in op je profiel. Zonder die twee kunnen we de W/kg van een pacegroep niet naar jouw intensiteit omrekenen en blijft er weinig te vergelijken over.",
  "Bij een groepsrit wijzen we de pacegroep aan die het tempo van je training rijdt, niet de snelste groep waar je in mag.",
  "Bij een race telt de categorie wél als toelatingseis: valt je W/kg buiten elke categorie, dan stellen we de race niet voor.",
  "Races en tijdritten verschijnen alleen bij een geplande race of een harde sessie, nooit bij een duur- of hersteltraining.",
  "Een event kiezen is een notitie bij je training: je duur, je blokken en wat er naar intervals.icu ging blijven ongewijzigd. Wil je de training even lang maken als het event, pas dan zelf de duur aan.",
  "Inschrijven doe je in Zwift zelf; de knop brengt je naar de eventpagina.",
  "Staat er niets? Dan was er niets dat goed genoeg paste. Liever geen voorstel dan een verkeerd voorstel.",
];

export const OUTDOOR_ROUTE_NOTES = [
  "Zet eerst een vertrekpunt op je profiel: je prikt een punt op de kaart, je vult geen adres in. ZWB bewaart die plek afgerond op ongeveer honderd meter en geen ander lid kan erbij.",
  "De afstand volgt uit de geplande duur en intensiteit, met je FTP en gewicht erbij. Staan die niet op je profiel, dan doet ZWB geen voorstel, want elke afstand zou dan een gok zijn.",
  "Bij wind legt het eerste rondje het láátste stuk met de wind mee: het stuk waar je moe bent. Over een heel rondje kun je de wind niet ontlopen: je komt terug waar je begon, dus je krijgt altijd een deel tegen. Bij windstilte zijn het gewoon drie kanten op.",
  "Een drempel- of tempotraining krijgt een rondje met meer hoogtemeters, een duur- of hersteltraining een vlakker rondje.",
  "De rondjes komen van een routeplanner op OpenStreetMap-data, niet van ZWB: ze houden rekening met fietspad, ondergrond en drukte, maar ze zijn niet door een mens gereden. Kijk hem na voordat je vertrekt.",
  "De drie rondjes staan samen op één kaart, elk in een eigen kleur. Klik een lijn aan (of de regel eronder) om de gegevens te zien en dat rondje te kiezen.",
  "Met GPX zet je het rondje op je fietscomputer. Op een telefoon open je het bestand met Delen in de Wahoo-app (ELEMNT ACE, BOLT 3 en ROAM 3 lezen FIT, GPX en TCX), of je importeert het in Garmin Connect onder Training & Planning \u2192 Banen.",
  "Rechtstreeks naar je fietscomputer sturen kan nog niet. Garmin heeft zijn ontwikkelaarsprogramma in 2026 op pauze gezet, dus er is voor nieuwe partijen geen weg naar Garmin Connect. Voor Wahoo bestaat die weg wel; of we die bouwen is nog niet besloten.",
  "Een rondje blijft staan tot je opnieuw om een voorstel vraagt.",
];

export const DATA_FRESHNESS_HELP = [
  "Onder Training → Belasting staat per bron wanneer er voor het laatst iets binnenkwam.",
  "Strava-ritten haal je zelf op met Strava syncen op het dashboard; nieuwe ritten kunnen tot een half uur duren.",
  "Hersteldata (slaap, HRV, rust-hartslag) komt van je horloge of ring via intervals.icu. ZWB haalt op wat daar staat, maar levert je apparaat niets aan, dan blijft het leeg.",
  "De herstelwaarden zijn gemiddelden over de laatste 7 dagen. Staat je bron langer stil, dan zie je streepjes.",
  "Controleer bij lege hersteldata eerst op intervals.icu of je wellness-koppeling (Garmin, Polar, Oura, Whoop) nog actief is.",
];

export const INTERVALS_CONNECT_STEPS = [
  "Open in intervals.icu Settings en daarna Developer Settings.",
  "Kopieer je persoonlijke API-key.",
  "Plak de sleutel in ZWB bij Training en kies Koppelen.",
];

export const INTERVALS_RIDE_STEPS = [
  {
    title: "Maak een gratis account op intervals.icu",
    text: "Een gratis account is genoeg; supporter worden hoeft niet.",
  },
  {
    title: "Koppel je toestel rechtstreeks",
    text: "In intervals.icu bij Settings → Connections: Garmin, Wahoo, Zwift, MyWhoosh, Rouvy, Hammerhead, Polar, Suunto of Coros. Niet via Strava: ritten die via Strava binnenkomen, geeft intervals.icu niet aan ons door.",
  },
  {
    title: "Koppel intervals.icu in ZWB",
    text: "Open in intervals.icu Settings → Developer Settings, kopieer je API-key en plak die in ZWB bij Training → Doelen.",
  },
  {
    title: "Open intervals.icu af en toe",
    text: "Een gratis account slaapt in als je 90 dagen niet op intervals.icu bent geweest, en dan komen er geen ritten meer binnen. ZWB herinnert je elke 60 dagen.",
  },
];

export const INTERVALS_RIDE_NOTES = [
  "Je ritten komen elk uur binnen, of meteen met Ritten ophalen op het dashboard. De eerste keer halen we een jaar op.",
  "Zwift apart koppelen in intervals.icu: Garmin stuurt Zwift-ritten niet door.",
  "Oudere ritten: importeer het archief dat Strava je mailt (Settings → Download or delete your account) in intervals.icu, of upload activities.csv hieronder.",
  "Wat via intervals.icu niet kan: kudos en de kilometers per fiets in Mijn garage. Badges, weekstanden, ZWBlokken, cols en je trainingsschema werken wel. Segment- en coltijden meet ZWB zelf uit het spoor; die staan met GPS in het klassement.",
  "Heb je nu Strava gekoppeld? Op je profiel kun je overstappen. Je Strava-ritten verdwijnen dan en komen terug via intervals.icu, voor zover ze daar staan. Zo komt er een Strava-plek vrij voor een ander lid.",
];

export const ADMIN_GUIDES = [
  {
    id: "eventbeheer",
    title: "Events, routes en uitslagen",
    bullets: [
      "Een cover verschijnt op de eventpagina, kalender en bij ritverslagen.",
      "De externe link kan verwijzen naar een route op Strava, Komoot, RideWithGPS of Garmin.",
      "De live timing-link is voor een actuele timingfeed; ZWB toont daaruit alleen herkende leden.",
      "De uitslagenlink wordt gebruikt om klasseringen en tijden van ZWB-leden op te halen.",
      "Een GPX-bestand levert route, afstand, hoogtemeters en startpunt. Een nieuwe upload vervangt de bestaande route.",
      "Beheer → Programma's: maak een programma aan en hang er events aan. Met Events koppelen kies je een periode en eventueel een categorie of type; Zoek events toont de events die er nog niet in zitten, en je vinkt aan welke je koppelt. Met Alles zet je een heel ZRL-, FRR-, SRC- of Ladderseizoen in één keer in een programma. Van een raceweek of tour wordt alleen het hoofdevent gekoppeld; de teamevents, etappes en tijdsloten eronder tellen vanzelf mee. Een los event hang je aan een programma in het eventformulier, en een event kan in meerdere programma's zitten. Een gearchiveerd programma is niet meer te kiezen, maar zijn pagina blijft bestaan. Bij hernoemen blijft de link van het programma gelijk.",
      "Events van de ZWB-club op Zwift, zoals de Monday Ride, komen elk uur vanzelf op de kalender zodra Zwift ze aanmaakt: met omschrijving, wereld, route, cover en de ingeschreven leden als deelnemer, net als een event dat je met een Zwift-link aanmaakt. Clubevents op kalender (Eventscan) doet hetzelfde meteen. Wat al op de kalender staat, blijft staan. Een clubevent dat je van de kalender verwijdert, komt niet vanzelf terug; Clubevents op kalender zet het wel terug.",
      "Beheer → FRR-kalender zet een hele FRR-tour in de kalender vanuit de Zwift-tag van de tour (bijvoorbeeld frrignite): een event voor de tour, daaronder een event per etappe en daaronder een event per tijdslot. Opnieuw opslaan of Nu verversen vult alleen aan. Uitslagen ophalen haalt de finishtijden van alle gereden tijdsloten bij Zwift op, voor het voorlopige klassement; Zwift begrenst dat, dus bij een lange tour klik je een paar keer tot er geen slots meer volgen. De GC-code is de code van de tour in de klassementstabel van FRR (zoals FTQ.5). Die is pas na de eerste etappe bekend; staat hij er niet, dan noemt de melding bij Klassement welke codes FRR toont.",
      "Beheer → SRC-kalender haalt de Sunday Race Club van MyWhoosh op en zet alle zondagen van deze en volgende maand klaar; de races komen erbij zodra MyWhoosh ze publiceert (een week vooraf). Daarna houdt een cron dat elk uur bij. Hier maak je ook de SRC-teams aan, met de teamnaam zoals de renners die bij MyWhoosh invullen. Dit vraagt het recht Sunday Race Club beheren (standaard bestuur, community-beheerders en event-organisers; aan te passen op Beheer → Rechten). Wie dat recht heeft, teambeheerders en captains van een SRC-team kunnen op Sunday Race Club leden aan een maand toevoegen of eruit halen, ook na de eerste race.",
    ],
  },
  {
    id: "communitybeheer",
    title: "WhatsApp-groepen",
    bullets: [
      "Plak een WhatsApp-invitelink en kies Ophalen om beschikbare groepsgegevens in te vullen.",
      "Bij bulkimport staat iedere invitelink op een eigen regel; dubbele en ongeldige links worden overgeslagen.",
      "Een groep kan algemeen zijn of aan een team of event worden gekoppeld.",
    ],
  },
  {
    id: "mediabeheer",
    title: "Media en imports",
    bullets: [
      "Gebruik als publicatiedatum de oorspronkelijke datum van het bericht, document of de aflevering.",
      "Beschrijvingen ondersteunen markdown.",
      "Bij podcasts kun je per platform een link toevoegen; RSS is bedoeld voor overige podcast-apps.",
      "Een automatische import kun je opnieuw draaien; wat er al stond, wordt bijgewerkt.",
      "YouTube- en Instagram-imports werken nadat technisch beheer de bronkoppelingen heeft ingesteld.",
      "De laatste drie Instagram-posts en de stories van de afgelopen 24 uur staan als foto's op het dashboard. Instagram wordt elk uur vanzelf opgehaald; Instagram ophalen doet het meteen.",
      "Openbare posts waarin @zwb_cycling op de foto is getagd, staan er tussen, met de accountnaam erbij. Ongewenste post? Verwijder hem op Media; hij komt dan niet terug.",
    ],
  },
  {
    id: "rollenbeheer",
    title: "Rollen, rechten en notificaties",
    bullets: [
      "De rechtenmatrix (Beheer → Rechten) bepaalt per communityrol welke beheeracties zijn toegestaan. Elk beheerscherm hoort bij één recht: Kalenderbronnen (eventscan, Zwift-routes), Competities (ZRL-beheer, FRR), Sunday Race Club, Omnium, Koppelingen (Strava-sync, segmenten en storingsmeldingen), Pushberichten aan alle leden, Tips en citaten (Community beheren), Badges, ZWBgame en Rechten zelf. Wie een recht niet heeft, ziet het scherm ook niet in het beheermenu.",
      "Content modereren geeft het recht om posts, reacties, eventchat, ritverslagen, foto's en verjaardagsberichten van anderen weg te halen. Alle events beheren geeft het recht om andermans events te bewerken of te verwijderen.",
      "Ledenrollen beheren mag rollen geven, maar de rol Bestuur (alle rechten) alleen als je ook rechten beheert. Beheerdersrechten (admin) kan alleen een admin geven.",
      "Technische admins behouden altijd volledige toegang.",
      "Een bestuursmelding gaat alleen naar apparaten van leden die aankondigingen hebben ingeschakeld.",
      "De doorkliklink van een melding opent standaard het dashboard.",
    ],
  },
  {
    id: "badgebeheer",
    title: "Achievements beheren",
    bullets: [
      "Ken milestonebadges handmatig toe wanneer een prestatie niet betrouwbaar uit Strava kan worden afgeleid.",
      "De keuzelijst toont eerst de badges die alleen met de hand kunnen, daarna de automatische.",
      "Weekbadges blijven via de weekfinalisatie lopen.",
      "Intrekken verwijdert alleen de handmatige toekenning bij het gekozen lid.",
      "De beveiligde Strava-synctaak werkt gekoppelde Strava-profielen automatisch bij.",
      "Plan die taak iedere 15 tot 30 minuten. Houd segmentdetails uit de frequente run om binnen de Strava-limieten te blijven.",
      "Laat de planner een POST-verzoek sturen naar /api/strava/sync met STRAVA_SYNC_SECRET als Bearer-token.",
    ],
  },
  {
    id: "stravabeheer",
    title: "Strava-sync beheren",
    bullets: [
      "Gebruik Beheer > Strava-sync om gekoppelde leden zonder ritten in de statistieken te vinden.",
      "Sync een lid handmatig of start de volledige historie voor alle leden die nog niet zichtbaar zijn.",
      "Leden zonder activiteitenrecht moeten zelf opnieuw koppelen en het activiteitenvinkje aanzetten.",
      "Badges + cols herberekenen draait op bestaande ritten en doet geen extra Strava-calls.",
      "Opheffen maakt de plek van een lid direct vrij. Na 90 dagen zonder bezoek gebeurt dat automatisch, zolang de limiet 10 koppelingen is.",
    ],
  },
  {
    id: "ttt-beheer",
    title: "TTT Planner en exports",
    bullets: [
      "Het plan maak je op zwiftgopher.com/TTT; ZWB bewaart het daarna bij het team en het event.",
      "Kies event en team en klik op Zwift-ID's kopiëren: de ID's van de opstelling, of van het hele team als er nog geen opstelling is, één per regel. Plak ze in het vak Zwift IDs op ZwiftGopher.",
      "Maak het plan in ZwiftGopher af en kies daar Export JSON, Export Link of Export Text. Plak de JSON, de link of de tekst in het importvak, of kies het bestand, en klik op Importeren.",
      "Export JSON en Export Link nemen volgorde, kopbeurt-watts en -duur, Zwift-ID, FTP, gewicht en IF mee. Export Text heeft alleen naam, watts en duur.",
      "Heb je alleen de afbeelding uit ZwiftGopher (Create Image), bijvoorbeeld uit een groepsapp? Kies hem met Bestand of plak hem in het importvak. De app leest de tabel op je eigen toestel; de afbeelding wordt niet verstuurd. Naam, watts, duur en IF komen dan in het vak: controleer ze voor je op Importeren klikt.",
      "Renners met een ZWB-account worden herkend aan hun Zwift-ID. Teamtags zoals (ZWB) gaan uit de naam.",
      "Opnieuw importeren in een bestaand plan vervangt de renners; publicatie en botlink blijven staan.",
      "Op de pagina van een TTT-race opent de captain het plan of begint een nieuw plan, met team en event al ingevuld.",
      "Een ZRL-TTT telt maximaal 5 renners, andere TTT's 8.",
      "Een plan is een concept tot de captain het publiceert. Daarna ziet het hele team het op de racepagina.",
      "Het Spiekbriefje in de planner (alleen voor captains en beheerders) zet vuistregels, het kopvermogen van het plan tegenover het doel van 105 tot 115% van de gemiddelde FTP, en de lessen uit eerdere ZRL-ploegentijdritten bij elkaar: per race waar de ploeg tijd won of verloor op de dichtstbijzijnde ploeg, en per renner, ook als die toen bij een ander ZWB-team reed.",
      "De knop Botlink kopieert een link waarmee de TTT-bot in Discord het plan ophaalt: plak hem achter /ttt plan. Wie de link heeft, ziet namen, Zwift-ID's en kopbeurten; met Link intrekken werkt hij niet meer.",
    ],
  },
  {
    id: "teambeheer",
    title: "Teams en roosters",
    bullets: [
      "Hoofdteams kunnen onderliggende race-, ladder-, sociale en outdoorteams bevatten.",
      "Teambeheerders kunnen leden, captainrollen en opstellingen per team beheren.",
      "Zet de WhatsApp- en Discord-link van een team onder Beheer op de teampagina; het logo verschijnt daarna bovenaan bij de teamnaam.",
      "De WhatsApp-link van een team staat ook in de lijst op Community, want het is dezelfde groep.",
      "Een discord.gg-invite laat iedereen erbij; een discord.com/channels-link opent direct het kanaal maar werkt alleen voor wie al in de server zit.",
      "Vermogensdata en uitslagen haal je opnieuw op met de beheeracties bovenaan.",
    ],
  },
];

// Q&A (migr. 0254, 0258): vragen over de app zelf, met "Ik ook" en de FAQ.
export const QA_HELP = [
  "Loop je vast, mis je iets of snap je een scherm niet? Kijk eerst bij de veelgestelde vragen bovenaan Q&A; staat hij er niet bij, stel hem dan daar. Je komt er via de tegel Q&A op het dashboard of via Q&A in je persoonlijke menu. Het bestuur werkt hem uit en antwoordt.",
  "Staat jouw vraag er al? Tik dan Ik ook. Je krijgt dan ook een melding bij het antwoord, en het bestuur ziet welke vragen vaak terugkomen. Die komen in de FAQ. Anderen zien alleen hoe vaak een vraag gesteld is, niet door wie.",
  "Je vraag staat met je naam in de lijst, zodat leden met dezelfde vraag het antwoord ook zien. Zet Alleen voor het bestuur aan als alleen het bestuur hem mag lezen, bijvoorbeeld als het over jouw account of je ritten gaat.",
  "Je krijgt een melding als je vraag is beantwoord, als je die onder Profiel aan hebt staan. Een vervolgvraag stel je als nieuwe vraag. Je eigen vraag kun je altijd verwijderen; aanpassen kan niet.",
  "Je kunt vijf vragen per dag stellen. Vragen aan andere leden, bijvoorbeeld over materiaal of een route, horen in ZWBieb.",
  "Wie vragen mag beantwoorden (het recht Vragen over de app beantwoorden), ziet ook de vragen voor het bestuur, krijgt een melding bij een nieuwe vraag en kan een vraag afschermen of verwijderen. Een vraag die er al staat, voeg je met Dubbel samen met het origineel: de vrager telt dan als Ik ook. Een beantwoorde vraag voor iedereen zet je met In FAQ bij de veelgestelde vragen. De tegel Q&A op het dashboard laat zien hoeveel vragen er wachten.",
];

export const TROUBLESHOOTING = [
  "Zie je geen badges? Koppel Strava en start een sync, of importeer activities.csv, GPX of FIT op het dashboard.",
  "Strava meldt ontbrekend activiteitenrecht? Koppel opnieuw via Profiel of het dashboard en zet het activiteitenvinkje aan.",
  "Verschijn je niet live met je Garmin? Check of Samen fietsen een laatste mail toont. Staat daar niets, kijk dan in Garmin Connect bij LiveTrack → Sessiedetails of je adres als ontvanger staat, en of Automatisch starten aan staat.",
  "Verschijn je niet live met je Wahoo? Open je Wahoo-link zelf: staat je rit daar niet, dan heeft de ELEMNT-app geen verbinding. Anders verschijn je binnen een paar minuten nadat iemand Samen fietsen opent.",
  "Bolletje staat stil of viel weg? Meestal een dekkinggat. De kaart pakt het vanzelf weer op.",
  "Geen trainingen in beeld? Controleer je intervals.icu API-key.",
  "Geen fietsen onder Mijn fietsen of Mijn garage? Koppel je fiets in Strava aan je ritten en draai daarna een Strava-sync.",
  "Mis je rechten? Vraag bestuur of communitybeheer om je rol te controleren.",
  "Werkt iets niet meer zoals vlak na de installatie? Loop de welkomstrondleiding op /welkom opnieuw door.",
];
