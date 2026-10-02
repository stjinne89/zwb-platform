import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bike,
  Cake,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Download,
  Dumbbell,
  ExternalLink,
  FileText,
  Gauge,
  Grid3x3,
  HeartPulse,
  Lightbulb,
  MapPinned,
  Medal,
  Monitor,
  Mountain,
  Navigation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  TrendingUp,
  Upload,
  UserCircle,
  Users,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { ConnectWithStrava } from "@/components/strava-brand";
import { HelpSearch } from "./help-search";

const START_STEPS = [
  {
    title: "Maak je profiel compleet",
    text: "Naam, foto, regio, Zwift-ID en zichtbaarheid staan onder Profiel.",
    href: "/profiel",
  },
  {
    title: "Strava-data toevoegen",
    text: "Koppel Strava met activiteitenrecht of importeer je ritten (CSV of GPX) op het dashboard.",
    href: "/dashboard#strava-sync",
  },
  {
    title: "Zet meldingen aan",
    text: "Voor events, live ritten, badges en trainingsschema's.",
    href: "/profiel#meldingen",
  },
  {
    title: "Bekijk de kalender",
    text: "RSVP met Ja of Misschien als je mee wilt rijden.",
    href: "/kalender",
  },
];

const GUIDES = [
  {
    id: "zwbgame",
    icon: Bike,
    title: "ZWBgame — Zwift-koers, jouw tactiek",
    bullets: [
      "Speel via Club → ZWBgame een Zwift-race tegen clubgenoten, op echte Zwift-routes van 15 tot 25 km: Flat Route, Hilly Route, Cobbled Climbs, Greater London Loop, Tempus Fugit, Innsbruckring en Glasgow Crit Circuit, met hun eigen ronden, sprints en KOM's. Een route staat er pas als het hoogteprofiel in de routebibliotheek zit. Een race van 30 tot 40 minuten speelt in ongeveer zes minuten: de tijd loopt versneld.",
      "Club Ladder: jouw ploeg van vijf tegen een andere clubploeg van vijf, zoals op ladder.cycleracing.club. De finishplekken 1 tot en met 10 krijgen 10, 9, 8 … 1 punt; de ploeg met de meeste punten wint. Jij bent altijd de uitdager, dus een gelijke stand is verlies. Je daagt een ploeg uit tot zeven plekken boven je. Win je, dan neem je hun plek in en schuift iedereen daartussen één plek omlaag. Rij je in een ZWB-ladderteam, dan rijden je herkenbare teamgenoten mee; open plekken gaan naar clubgenoten van jouw niveau. De tegenstanders zijn negen clubploegen rond jouw niveau, de zwakste onderaan. De ladder bewaart je browser.",
      "ZRL: jouw ploeg tegen vijf clubploegen van gelijke sterkte, volgens de WTRL-regels. Staat er een ZWB-ZRL-race met route in de clubkalender, dan staat die route bovenaan: zo oefen je de race van de week. Rij je in een ZRL-team, dan rijden je herkenbare teamgenoten mee (bij B1 of B2 dat subteam). Kies het format. Puntenrace: FAL (eerste over de streep van een sprint of KOM: evenveel punten als starters, dan één minder per plek), FTS (de tien snelste tijden over een segment: 15, 12, 10, 8, 6, 5, 4, 3, 2, 1), finish (evenveel punten als starters, aflopend) en podium (10, 8, 6, 4, 2). Race of Truth: dezelfde punten, zonder slipstream. Scratch: alleen finish en podium. Ploegentijdrit: alleen het wiel van je eigen ploeg, de tijd van je vierde renner telt, met minder dan vier binnen heeft je ploeg geen uitslag. De ploeg met de meeste punten (of de snelste tijd) krijgt evenveel leaguepunten als er ploegen zijn, dan één minder per plek.",
      "FRR-tour: vier etappes na elkaar met hetzelfde veld van 24 renners rond jouw niveau: een vlakke rit, een heuvelrit, een tijdrit en een slotrit. De tijdrit is zoals op Zwift: iedereen start tegelijk, zonder slipstream en zonder powerups. Het klassement (geel) telt je tijdverlies op de winnaar per etappe op; alleen wie elke etappe uitrijdt, staat erin. Finishpunten per etappe: 25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, daarna 1 punt; in de tijdrit dubbel. Sprints en klimmen scoren alleen op de snelste tijd over het segment (geen punten voor wie eerst boven is), met dezelfde schaal voor de beste vijftien: een klim maal zijn moeilijkheid (1 tot 5, naar de hoogtemeters), sprints in een vlakke rit maal 1,3. Groen gaat naar de meeste sprintpunten, de bolletjes naar de meeste klimpunten, blauw naar alle punten samen. Kom je meer dan 20% na de winnaar binnen, dan kost de bezemwagen je 20 punten op het totaal. Je tour blijft in je browser tot je hem stopt of uitrijdt.",
      "Vrije race: jij tegen maximaal 23 clubgenoten rond jouw niveau, zoals een Zwift-categorie. Bij een klein roster vullen fictieve gasten het veld aan.",
      "Je rijdt in een van vier standen: Sparen (1), Meerijden (2), Naar voren (3) of Aanvallen (4); ook met pijltje omhoog en omlaag. Meerijden houdt je in het wiel, volgt elke versnelling en schuift door het blok naar voren. Sparen trapt niet meer dan nodig, zakt naar achteren en laat een versnelling boven je drempel gaan. Naar voren rijdt op je drempel in de wind. Aanvallen gaat erboven en wordt in de laatste 400 meter Sprinten. Tik op een renner in het koersoverzicht om diens wiel te volgen.",
      "Zoals in Zwift: in het wiel heb je ongeveer 30% minder luchtweerstand. Op het vlak scheelt dat veel, op een steile klim bijna niets; daar telt vermogen per kilo. Een groep rijdt sneller dan een renner alleen. De start gaat hard: wie dan spaart, mist de kopgroep. Op een steile afdaling brengt Sparen je in supertuck, sneller dan zacht doortrappen en zonder moeite.",
      "W′ is je reserve boven je drempel: aanvallen, gaten dichtrijden en sprinten kosten W′. Onder je drempel vult hij weer, langzaam. Is hij leeg, dan kom je niet meer boven je drempel en zet het spel je terug op Meerijden. Frisheid daalt met elke lucifer die je afsteekt en met lang hard rijden; minder frisheid kost drempel en sprint voor de rest van de race. In het wiel sparen houdt je fris voor de finale.",
      "Powerups krijg je onder een sprint- of KOM-boog en op de rondestreep, één tegelijk. Gebruik ze met de spatiebalk, net als in Zwift. Veer maakt je 30 seconden lichter (klimmen), Aerohelm geeft 15 seconden minder luchtweerstand (sprint, aanval), Draft boost geeft 40 seconden meer slipstream (gat dichten).",
      "Ploegorders in de ladder en de ZRL (5, 6, 7, 8): Vrij rijden laat je ploeggenoten hun eigen koers rijden. Breng me terug laat een ploeggenoot met de meeste reserve op je wachten en je terugslepen naar de groep. Lead-out laat een ploeggenoot in de laatste kilometer de sprint voor je aantrekken. Pak de punten (alleen in een ZRL-puntenrace en Race of Truth) stuurt je snelste ploeggenoot op de FAL- en FTS-punten af; de tegenstanders doen dat altijd. In een ploegentijdrit zijn er geen orders: je rijdt samen, en wie in het wiel zit, neemt vanzelf een beurt over. De tussenstand van de ploegen staat bovenin, ook per groep.",
      "Iedere renner heeft per race een dagvorm tussen -6% en +6%; die van jezelf zie je onder de bediening. Bots rijden per race met een eigen karakter: hoe aanvallend ze zijn en hoe ver van de streep ze hun finale inzetten.",
      "Je kwaliteiten komen automatisch uit het platform: de Intervals-vermogenscurve als je die hebt gekoppeld, anders FTP en gewicht uit je profiel. Vlak volgt je FTP in watts, klimmen je watts per kilo en sprint je 15-secondenvermogen. In de race rekent iedereen met hetzelfde referentielichaam, dus de game laat geen echte watts zien. Zonder FTP of gewicht rijd je met een basisprofiel van 100. Rosterleden zonder account rijden altijd met een basisprofiel.",
      "Via Spelinstellingen kun je herkenbare deelname uitschakelen; dan rijd je niet mee in het peloton of de ploeg van anderen. Kloppen je platformgegevens niet, sla dan een eigen spelprofiel op. Eigen meting vraagt FTP en gewicht; sprint- en korte vermogens zijn optioneel. Met Platformgegevens gebruiken zet je dat terug.",
      "Een Intervals-spelprofiel gebruikt een 90-dagencurve, met alleen meetpunten waarvan de activiteit een bevestigde toegestane bron heeft. Vul je gewicht zelf in. Een geschikt 20-minutenpunt is nodig; de game schat FTP als 95% daarvan. Onbekende bronnen en Strava-data worden uitgesloten. Bijwerken kan maximaal drie keer per uur. Een eigen spelprofiel vervalt na 30 dagen; daarna gelden weer je platformgegevens. Herkenbare deelname wijzigen wist ook je eigen spelprofiel.",
      "Pauzeer met de pauzeknop, Esc of P. Een verborgen tabblad pauzeert automatisch. Hervatten controleert het ledenroster opnieuw; afgemelde leden worden gasten en ingetrokken of gewijzigde sportprofielen worden basisrenners. Per browser en account blijft één race maximaal zeven dagen hervatbaar. Een nieuwe race vervangt de vorige. Uitslagen en ladder zijn alleen lokaal; uitslagen wis je bij Jouw laatste koersen.",
      "Draai je telefoon liggend: tijdens de race vult het spel dan het hele scherm, met de standen onder je rechterduim en powerup en ploegorders links. Met de knop voor volledig scherm verdwijnt ook de adresbalk; op telefoons die het toestaan draait het beeld mee. 3D · zuinig verlaagt de grafische belasting. Zonder WebGL blijven koersoverzicht en bediening bruikbaar. Bij een geblokkeerde browseropslag kun je wel spelen, maar niet betrouwbaar bewaren.",
      "Beheerders kunnen ongeclaimde rosterleden uitsluiten of weer toevoegen via /zwbgame/beheer. Er is nog geen multiplayer of gedeeld klassement.",
    ],
  },
  {
    id: "profiel",
    icon: UserCircle,
    title: "Profiel en ledenlijst",
    bullets: [
      "Je profiel bepaalt wat andere leden mogen zien.",
      "Onder Interesses kies je welke eventtypes je wilt zien op de kalender, en welke afstand en hoogtemeters je grens zijn.",
      "Badges blijven zichtbaar op je profiel en in de ledenlijst.",
      "Onder Mijn fietsen tonen we je fietsen uit Strava (naam + kilometers); zonder Strava voeg je een fiets handmatig toe. Je kiest per fiets of die zichtbaar is en zet er een foto bij.",
      "Bestuur of beheerders keuren nieuwe leden goed.",
    ],
  },
  {
    id: "events",
    icon: CalendarDays,
    title: "Events en RSVP",
    bullets: [
      "Gebruik de kalender voor groepsritten, ZRL, Ladder en socials.",
      "Met Voor mij toont de kalender alleen events die bij je passen: de eventtypes die je op je profiel aanvinkt, events van je eigen teams, en ritten binnen je grens voor afstand en hoogtemeters.",
      "Events waar je Nee op hebt geantwoord verdwijnen uit Voor mij. Onder Alles blijven ze staan, dus je kunt altijd van gedachten veranderen.",
      "Heb je Ja gezegd, je beschikbaar gemeld voor je team of sta je in de opstelling, dan blijft het event onder Voor mij staan, ook als het buiten je interesses of grenzen valt. Misschien telt niet als aanmelding.",
      "Vink je geen enkel eventtype aan, dan telt alles als interessant en verbergt Voor mij niets op interesse.",
      "Vul je op je profiel geen max afstand of hoogtemeters in, dan leidt ZWB die grens af uit je langste rit van het afgelopen jaar, plus 20 procent. Zonder ritten in ZWB blijft die grens leeg en wordt er niets op omvang verborgen.",
      "Onder de knop staat wat er verborgen is en waarom; met Alles zie je de hele kalender weer.",
      "Op eventdagen kan de liveticker deelnemers tonen die live tracken.",
      "GPX, routekaart en hoogteprofiel staan op de eventpagina.",
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
    ],
  },
  {
    id: "teams",
    icon: Trophy,
    title: "Teams en wedstrijden",
    bullets: [
      "Teams tonen leden, rosterkoppelingen en bekende wedstrijdstanden.",
      "Een ZRL-raceweek staat als één event in de kalender, met de informatie die voor alle teams geldt. Daaronder heeft elk team zijn eigen race, met eigen starttijd, Zwift-link en opstelling. Plak je bij Bewerk de Zwift-eventlink en kies je Ophalen, dan komen starttijd, ronden en afstand van de Zwift-groep van dat team (A, B, C of D, uit de teamnaam).",
      "Heeft je team subteams, zoals B met B1 en B2? Dan is het hoofdteam een paraplu: je meldt je per raceweek beschikbaar bij het hoofdteam, op de teampagina of op de raceweek zelf, en de captain deelt je in bij een subteam. Het hoofdteam rijdt zelf geen races.",
      "Voor een ZRL-race meld je je niet op Zwift aan maar met de WTRL-racepass van je team. Die staat bovenaan de race van je team, en op de raceweek bij elk team. Een beheerder zet de passes per ronde op Beheer → ZRL-racekalender.",
      "Bovenaan een race staat Raceinfo: je pacingplan en links naar Zwift, ZwiftPower en ZwiftRacing, recon-video's, ZwiftInsider en de racepagina op de ZWB-site. Zwift, ZwiftPower en ZwiftRacing volgen uit de Zwift-koppeling; de andere links zet een beheerder onderaan Bewerk. De race van je team toont ook de links en de route van de raceweek, en op de raceweek wijst Pacingplan naar de race van je eigen team.",
      "Stelt de captain je op, dan sta je op ja voor de race van dat team, ook als je eerder nee zei, en komt de race in je trainingsschema. Verplaatst of haalt de captain je weg, dan vervalt die ja.",
      "Meld je je beschikbaar voor een ZRL-race, of zeg je Ja op de racepagina van je team, dan sta je meteen in het team waar die race bij hoort. Afmelden haalt je er niet weer uit; dat doet een teambeheerder.",
      "Bij ZRL-teams staan zFTP, zMAP, categorie en divisieadvies per renner, zoals WTRL ze toont. Een beheerder plakt daarvoor de teams van WTRL My Teams op Beheer → WTRL-teams. Wie daar lid is van een team, komt ook in het ZWB-team; zonder account kom je in het rooster en word je lid zodra je je naam claimt. Wie bij WTRL vertrekt en via WTRL in het team kwam, gaat er ook bij ZWB uit.",
      "Een Flamme Rouge-tour (FRR) staat als één regel in de kalender, met een knop per etappe; die regel blijft staan tot de laatste etappe is gereden. Op de tour zie je alle etappes met hun tijdsloten, op een etappe de tijdsloten waarin je die etappe kunt rijden. Je schrijft je in op Zwift. ZWB haalt de inschrijvingen daar om de paar uur op en zet je op ja voor het slot waarin je staat; kies je op Zwift een ander slot, dan verhuist je ja mee. Op de etappe zie je per slot welke ZWB'ers rijden, en links naar het klassement, de truien en het reglement op de FRR-site en naar het Discord-kanaal van de tour.",
      "Bij de tour en bij elke etappe staan ook de ZWB'ers in het algemeen klassement van FRR, per klasse, en onder Renners om in de gaten te houden de renners die in jouw klasse tot vijf plaatsen voor of achter je staan, of binnen een minuut eGAP. Bij elke renner staat in welk slot hij deze etappe rijdt; op de tour gaat dat over de eerstvolgende etappe. Met de ster volg je een renner, ook van buiten je klasse; met Volgen voeg je iemand toe met zijn Zwift-ID of ZwiftPower-link. Wie je volgt, ziet alleen jij. Het klassement wordt ververst nadat een etappe is gereden, en telt alleen renners die de laatste etappe reden. Voor de eerste etappe is er nog geen klassement; dan zie je alleen je gevolgde renners. Je Zwift-ID moet op je profiel staan.",
      "De Sunday Race Club (SRC) van MyWhoosh staat per zondag als één regel in de kalender, met daaronder de herenrace en de damesrace. De laatste zondag van de maand is de finale. Inschrijven doe je zelf op MyWhoosh, van maandag 09:00 tot donderdag 05:00 (Nederlandse zomertijd; in de winter een uur eerder): de knop staat op je race, samen met de starttijd per categorie en het weigh-in-venster. MyWhoosh deelt je categorie zelf in; die hoor je een dag voor de race.",
      "Voor een SRC-teamuitslag rijden 3 tot 5 renners uit dezelfde categorie onder dezelfde teamnaam; de beste drie tijden tellen. Je team ligt de hele maand vast, en voor de teamuitslag in de finale heb je in die maand twee afgeronde races nodig. Op een SRC-zondag in de kalender, of op Sunday Race Club (menu Club), klik je per zondag of je kunt. Deed je die maand nog niet mee, dan schrijft die klik je meteen in: heren of dames volgens je profiel, met je laatst gereden categorie. Race en categorie pas je aan op Sunday Race Club; daar kies je ook je team als er meer dan één is. Staat de race van die zondag al in de kalender, dan wordt dat meteen je antwoord op die race; anders gebeurt dat zodra MyWhoosh de race publiceert. Onder elk team zie je per zondag hoeveel renners er per categorie kunnen, en per renner hoeveel kwalificaties hij deze maand uitreed (finale ✓ vanaf twee). Van team wisselen kan tot de eerste race van de maand. Met herinneringen aan krijg je een pushbericht op de avond voordat de inschrijving sluit (tenzij je zei dat je niet kunt), en tien minuten voor het weigh-in-venster als je in een categorie met weigh-in rijdt.",
      "ZRL en Ladder-resultaten worden via bronnen gesynct waar mogelijk.",
      "Ontbrekende brondata kan handmatig worden aangevuld door beheerders.",
    ],
  },
  {
    id: "badges",
    icon: Medal,
    title: "Badges en achievements",
    bullets: [
      "Weekbadges komen uit gesyncte Strava-ritten.",
      "Krijg je een melding over activiteitenrecht? Koppel Strava opnieuw en zet het vinkje voor activiteiten aan.",
      "Geen plek voor Strava? Laat je ritten binnenkomen via intervals.icu (zie Ritten via intervals.icu), of importeer op het dashboard je historie (activities.csv) of ritten met spoor (GPX).",
      "Het aantal Strava-koppelingen is beperkt. Ben je 90 dagen niet in de app geweest, dan vervalt je koppeling; twee weken vooraf krijg je een melding.",
      "Ontkoppel je Strava op je profiel, dan kies je zelf: Ritten bewaren laat je opgehaalde ritten, segmenttijden en fietsen in ZWB staan, Ritten wissen haalt ze weg. Er komt daarna niets nieuws meer binnen. Badges en ZWBlokken blijven altijd.",
      "Milestone badges blijven permanent op je profiel staan.",
      "Klik op een badge om te zien welke drempel erbij hoort.",
    ],
  },
  {
    id: "onderhoud",
    icon: Wrench,
    title: "Mijn garage",
    bullets: [
      "Houd slijtbare onderdelen (ketting, cassette, banden, remblokken …) bij op basis van je Strava-kilometers.",
      "Kies per onderdeel een slijtage-range — enige, normale of hoge slijtage — of vul een eigen kilometerdrempel in.",
      "Je krijgt een melding zodra een onderdeel toe is aan vervanging; op het dashboard zie je wat bijna of over de drempel is.",
    ],
  },
  {
    id: "cols",
    icon: Mountain,
    title: "Cols, segmenten en records",
    bullets: [
      "ZWB herkent cols en segmenten automatisch uit je Strava-ritten.",
      "Je recordtijd komt rechtstreeks van Strava; per segment zie je de ZWB-ranglijst.",
      "Nieuw record niet zichtbaar? Klik op Achievements op 'Badges herberekenen'.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community, polls, media en ritverslagen",
    bullets: [
      "Gebruik Vraag & Aanbod voor spullen, hulpvragen en tips.",
      "Polls verzamelen snelle keuzes vanuit de community.",
      "Media bundelt nieuws, mededelingen, video's en podcasts.",
      "Schrijf na een gereden event een ritverslag met vaste kopjes: voorbereiding, verloop, uitslag en leerpunten. Je hoeft niet alles in te vullen; je eigen uitslag staat er al bij als die bekend is.",
      "Anderen kunnen op je verslag reageren; met Deel stuur je het via WhatsApp door.",
    ],
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy en zichtbaarheid",
    bullets: [
      "Live tracking is per rit opt-in en verdwijnt bij inactiviteit.",
      "Je profielvelden hebben eigen zichtbaarheidsschakelaars.",
      "Trainer-data wordt alleen gedeeld na expliciete toestemming.",
    ],
  },
];

// Volledige wegwijzer: wat doet elke pagina/sectie van de app.
const OVERVIEW: { href: string; name: string; text: string }[] = [
  { href: "/dashboard", name: "Dashboard", text: "Je startscherm: deze week, recente clubritten, ritverslagen en nieuws. Hier koppel en synchroniseer je ook je ritten, of importeer je ze (CSV/GPX)." },
  { href: "/kalender", name: "Kalender", text: "Alle events — groepsritten, ZRL, Ladder en socials. RSVP met Ja of Misschien, en filter met Voor mij op wat bij je past." },
  { href: "/samen-fietsen", name: "Samen fietsen", text: "Live kaart van wie er nu rijdt, met livechat. Tracking stel je in via je Garmin of Wahoo, of via OwnTracks." },
  { href: "/teams", name: "Teams", text: "Teams, rosters en ZRL-/Ladder-standen, inclusief de TTT-planner." },
  { href: "/src", name: "Sunday Race Club", text: "Je SRC-team per maand en per zondag wie er kan, per categorie." },
  { href: "/leden", name: "Leden", text: "Ledenlijst met categorie en badges; filter op regio of categorie." },
  { href: "/achievements", name: "Achievements", text: "Al je badges, de weekstanden en het herberekenen van badges." },
  { href: "/zwbeter-worden", name: "ZWBeter Worden", text: "Schema's, AI-coach, je ZWBeterWorden-advies, belasting en de koppelingen." },
  { href: "/zwbeter-worden/vermogen", name: "Mijn vermogen", text: "Je powercurve en de vergelijking met de club." },
  { href: "/mijn-garage", name: "Mijn garage", text: "Je fietsen en de slijtage van hun onderdelen, met een melding zodra er iets toe is aan vervanging." },
  { href: "/profiel/cols", name: "Cols & segmenten", text: "Welke cols en segmenten je deed, met je PR en de ZWB-ranglijst." },
  { href: "/ritverslagen", name: "Ritverslagen", text: "Schrijf een verslag bij een gereden event; anderen reageren." },
  { href: "/community", name: "Community", text: "Mededelingen en clubnieuws." },
  { href: "/polls", name: "Polls", text: "Snelle stemmingen vanuit de club." },
  { href: "/materiaal", name: "Vraag & Aanbod", text: "Spullen, hulpvragen en tips uitwisselen." },
  { href: "/media", name: "Media", text: "Nieuws, nieuwsbrieven, podcasts, video's en Instagram." },
  { href: "/stats", name: "Stats", text: "Clubstatistieken en ranglijsten." },
  { href: "/sponsors", name: "Sponsors", text: "Onze sponsoren en ledenvoordeel." },
  { href: "/profiel", name: "Profiel", text: "Je gegevens, zichtbaarheid, je fietsen, koppelingen (Strava/intervals) en account." },
];

const GARMIN_LIVETRACK_STEPS = [
  "Maak op Samen fietsen je persoonlijke adres en kopieer het. Het wordt één keer getoond.",
  "Zet je Edge aan, open Garmin Connect en wacht tot de Edge verbonden is.",
  "Ga naar Veiligheid en tracking → LiveTrack → Deelinstellingen → Ontvangers.",
  "Maak daar een nieuw contact aan met het adres. Een contact in je telefoon is niet nodig.",
  "Start een LiveTrack-sessie en kijk bij Sessiedetails of het adres als ontvanger staat. Je verschijnt binnen een paar minuten op de kaart.",
  "Zet Automatisch starten aan, dan start LiveTrack voortaan bij elke rit vanzelf.",
];

const WAHOO_LIVETRACK_STEPS = [
  "Open de ELEMNT-app, ga naar Live Track en kopieer je vaste link (wahooligan.com/users/live/…).",
  "Plak de link op Samen fietsen bij Wahoo en klik Koppelen.",
  "Start een rit op je ELEMNT terwijl je telefoon verbonden is. Je verschijnt op de kaart zodra iemand Samen fietsen of de eventpagina opent; dat kan een paar minuten duren.",
];

const LIVETRACK_NOTES = [
  "Je Wahoo-link blijft bij ons: andere leden zien je positie op de ZWB-kaart, niet de link.",
  "Per rit hoef je niets te doen. Na de rit verdwijn je vanzelf.",
  "Klik op Samen fietsen op een renner voor snelheid, afstand, vermogen en cadans. Hartslag zie je alleen bij wie Hartslag delen met leden aanzet.",
  "Geen bolletje op de kaart? Je fietscomputer heeft dan nog geen GPS-fix. Binnen lukt dat meestal niet.",
  "Laat Garmin Connect of de ELEMNT-app op de achtergrond draaien; zonder telefoonverbinding komt er niets door.",
  "Een nieuw adres maken vervangt het oude meteen. Koppeling stoppen of ontkoppelen werkt direct; haal het adres daarna ook weg in Garmin Connect.",
];

const OWNTRACKS_STEPS = [
  {
    title: "Installeer OwnTracks",
    text: "Download de gratis OwnTracks-app (iOS App Store of Google Play). Andere apps werken niet — wij gebruiken OwnTracks.",
  },
  {
    title: "Maak je koppellink",
    text: "Ga naar Samen fietsen → OwnTracks koppelen. Je krijgt eenmalig een persoonlijke URL te zien — kopieer die meteen (hij wordt maar één keer getoond).",
  },
  {
    title: "Zet OwnTracks op HTTP-modus",
    text: "iPhone: tik op de kaart linksboven op het i-icoon → tandwiel/Instellingen → Mode = Private HTTP. Android: instellingen (tandwiel) → Connection → Mode = Private HTTP. Plak je koppellink in het veld URL.",
  },
  {
    title: "Locatie op 'Altijd toestaan'",
    text: "Geef de app locatietoegang 'Altijd' (niet 'Bij gebruik') én zet nauwkeurige/precieze locatie aan. Zonder 'Altijd' stopt het tracken zodra je scherm uit gaat.",
  },
  {
    title: "Kies de actieve modus tijdens je rit",
    text: "De modusbalk staat bovenin het Kaart-scherm. iPhone: kies 'Actie' — hoge frequentie en nauwkeurigheid (wel meer accuverbruik) voor een strak spoor. 'Significant' (Android: 'Grootte wijzigingen') werkt ook en is aanbevolen voor lager batterijgebruik, maar geeft een minder nauwkeurig spoor. 'Handmatig' en 'Rustig'/'Stop' publiceren geen locaties en geven gaten op de kaart.",
  },
  {
    title: "Rijden en verschijnen",
    text: "Open OwnTracks aan het begin van je rit. Op Samen fietsen verschijn je vanzelf. Met RSVP Ja of Misschien op een event sta je die dag ook op de eventkaart.",
  },
  {
    title: "Stoppen",
    text: "Klaar? Zet de modus terug op iPhone 'Significant' (of 'Rustig'), Android 'Grootte wijzigingen' (of 'Stop'), of stop de koppeling op Samen fietsen. Na 15 min zonder positie verdwijn je sowieso automatisch.",
  },
];

const OWNTRACKS_QUALITY_TIPS = [
  "Zet batterijbesparing/-optimalisatie UIT voor OwnTracks — die schorst de app en veroorzaakt gaten in je spoor.",
  "Sluit OwnTracks niet af (niet 'wegvegen'); laat 'm op de achtergrond draaien tijdens de rit.",
  "iPhone: zet Achtergrond-appvernieuwing aan en 'Precieze locatie' aan voor OwnTracks.",
  "Android: sta 'onbeperkt' accugebruik toe voor OwnTracks en zet 'verwijder app bij niet-gebruik' uit.",
  "Goede mobiele dekking helpt; in tunnels/dekkinggaten kan het bolletje even stilstaan — de kaart herstelt zichzelf zodra er weer data binnenkomt.",
  "Eén nieuwe koppellink maken vervangt de oude meteen; gebruik dat als je tracker gestolen/kwijt is.",
];

const WAHOO_STEPS = [
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

const ZWIFT_STEPS = [
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

const ZWIFT_NOTES = [
  "Zet je FTP in Zwift gelijk aan die in ZWB: de blokken gaan als percentage van je FTP mee, dus een afwijkende FTP geeft andere watts.",
  "Alleen vermogen en cadans gaan mee, geen hartslagdoelen.",
  "Alleen de komende week wordt vooruitgestuurd, niet je hele schema.",
  "Je Zwift-ritten komen vanzelf terug in intervals.icu, dus je belasting in ZWB blijft kloppen.",
  "Dag aangepast? Publiceer opnieuw, dan gaat de nieuwe versie bij de volgende sync mee.",
];

const ZWIFT_MATCH_FACTORS = [
  {
    title: "Duur —",
    text: "hoe dicht het event bij de geplande tijd zit. Weegt het zwaarst.",
  },
  {
    title: "Intensiteit —",
    text: "de W/kg van de pacegroep omgerekend naar een percentage van jóúw FTP. Dezelfde groepsrit is voor een lichtere of sterkere renner een andere training.",
  },
  {
    title: "Belasting —",
    text: "de geschatte TSS van het event naast die van je geplande training.",
  },
  {
    title: "Terrein —",
    text: "klimwerk bij tempo, drempel en VO2max; vlak bij duur en herstel.",
  },
  {
    title: "Starttijd —",
    text: "hoe ver de start afligt van het moment waarop je training staat.",
  },
  {
    title: "Populariteit —",
    text: "weegt het lichtst, en telt hoe druk een event is vergeleken met andere events op hetzelfde uur van de dag. Rijden er ZWB'ers mee, dan zie je dat erbij.",
  },
];

const ZWIFT_MATCH_NOTES = [
  "Voorstellen gaan over ongeveer de komende elf uur: verder vooruit geeft Zwift zijn kalender niet vrij. Voor de training van vandaag of vanavond staat er dus iets, voor die van overmorgen niet.",
  "Vul je FTP en gewicht in op je profiel. Zonder die twee kunnen we de W/kg van een pacegroep niet naar jouw intensiteit omrekenen en blijft er weinig te vergelijken over.",
  "Bij een groepsrit wijzen we de pacegroep aan die het tempo van je training rijdt — niet de snelste groep waar je in mag.",
  "Bij een race telt de categorie wél als toelatingseis: valt je W/kg buiten elke categorie, dan stellen we de race niet voor.",
  "Races en tijdritten verschijnen alleen bij een geplande race of een harde sessie, nooit bij een duur- of hersteltraining.",
  "Een event kiezen is een notitie bij je training: je duur, je blokken en wat er naar intervals.icu ging blijven ongewijzigd. Wil je de training even lang maken als het event, pas dan zelf de duur aan.",
  "Inschrijven doe je in Zwift zelf; de knop brengt je naar de eventpagina.",
  "Staat er niets? Dan was er niets dat goed genoeg paste. Liever geen voorstel dan een verkeerd voorstel.",
];

const OUTDOOR_ROUTE_NOTES = [
  "Zet eerst een vertrekpunt op je profiel: je prikt een punt op de kaart, je vult geen adres in. ZWB bewaart die plek afgerond op ongeveer honderd meter en geen ander lid kan erbij.",
  "De afstand volgt uit de geplande duur en intensiteit, met je FTP en gewicht erbij. Staan die niet op je profiel, dan doet ZWB geen voorstel — elke afstand zou dan een gok zijn.",
  "Bij wind legt het eerste rondje het láátste stuk met de wind mee — het stuk waar je moe bent. Over een heel rondje kun je de wind niet ontlopen: je komt terug waar je begon, dus je krijgt altijd een deel tegen. Bij windstilte zijn het gewoon drie kanten op.",
  "Een drempel- of tempotraining krijgt een rondje met meer hoogtemeters, een duur- of hersteltraining een vlakker rondje.",
  "De rondjes komen van een routeplanner op OpenStreetMap-data, niet van ZWB: ze houden rekening met fietspad, ondergrond en drukte, maar ze zijn niet door een mens gereden. Kijk hem na voordat je vertrekt.",
  "De drie rondjes staan samen op één kaart, elk in een eigen kleur. Klik een lijn aan (of de regel eronder) om de gegevens te zien en dat rondje te kiezen.",
  "Met GPX zet je het rondje op je fietscomputer. Op een telefoon open je het bestand met Delen in de Wahoo-app (ELEMNT ACE, BOLT 3 en ROAM 3 lezen FIT, GPX en TCX), of je importeert het in Garmin Connect onder Training & Planning \u2192 Banen.",
  "Rechtstreeks naar je fietscomputer sturen kan nog niet. Garmin heeft zijn ontwikkelaarsprogramma in 2026 op pauze gezet, dus er is voor nieuwe partijen geen weg naar Garmin Connect. Voor Wahoo bestaat die weg wel; of we die bouwen is nog niet besloten.",
  "Een rondje blijft staan tot je opnieuw om een voorstel vraagt.",
];

const DATA_FRESHNESS_HELP = [
  "Onder Training → Belasting staat per bron wanneer er voor het laatst iets binnenkwam.",
  "Strava-ritten haal je zelf op met Strava syncen op het dashboard; nieuwe ritten kunnen tot een half uur duren.",
  "Hersteldata (slaap, HRV, rust-hartslag) komt van je horloge of ring via intervals.icu. ZWB haalt op wat daar staat, maar levert je apparaat niets aan, dan blijft het leeg.",
  "De herstelwaarden zijn gemiddelden over de laatste 7 dagen. Staat je bron langer stil, dan zie je streepjes.",
  "Controleer bij lege hersteldata eerst op intervals.icu of je wellness-koppeling (Garmin, Polar, Oura, Whoop) nog actief is.",
];

const INTERVALS_CONNECT_STEPS = [
  "Open in intervals.icu Settings en daarna Developer Settings.",
  "Kopieer je persoonlijke API-key.",
  "Plak de sleutel in ZWB bij Training en kies Koppelen.",
];

const INTERVALS_RIDE_STEPS = [
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

const INTERVALS_RIDE_NOTES = [
  "Je ritten komen elk uur binnen, of meteen met Ritten ophalen op het dashboard. De eerste keer halen we een jaar op.",
  "Zwift apart koppelen in intervals.icu: Garmin stuurt Zwift-ritten niet door.",
  "Oudere ritten: importeer het archief dat Strava je mailt (Settings → Download or delete your account) in intervals.icu, of upload activities.csv hieronder.",
  "Wat via intervals.icu niet kan: kudos en de kilometers per fiets in Mijn garage. Badges, weekstanden, ZWBlokken, cols en je trainingsschema werken wel. Segment- en coltijden meet ZWB zelf uit het spoor; die staan met GPS in het klassement.",
  "Heb je nu Strava gekoppeld? Op je profiel kun je overstappen. Je Strava-ritten verdwijnen dan en komen terug via intervals.icu, voor zover ze daar staan. Zo komt er een Strava-plek vrij voor een ander lid.",
];

const ADMIN_GUIDES = [
  {
    id: "eventbeheer",
    title: "Events, routes en uitslagen",
    bullets: [
      "Een cover verschijnt op de eventpagina, kalender en bij ritverslagen.",
      "De externe link kan verwijzen naar een route op Strava, Komoot, RideWithGPS of Garmin.",
      "De live timing-link is voor een actuele timingfeed; ZWB toont daaruit alleen herkende leden.",
      "De uitslagenlink wordt gebruikt om klasseringen en tijden van ZWB-leden op te halen.",
      "Een GPX-bestand levert route, afstand, hoogtemeters en startpunt. Een nieuwe upload vervangt de bestaande route.",
      "Clubevents op kalender (Eventscan) zet alle aankomende events van de ZWB-club op Zwift in één keer op de kalender, met ingeschreven leden als deelnemer. Wat al op de kalender staat, blijft staan.",
      "Beheer → FRR-kalender zet een hele FRR-tour in de kalender vanuit de Zwift-tag van de tour (bijvoorbeeld frrignite): een event voor de tour, daaronder een event per etappe en daaronder een event per tijdslot. Opnieuw opslaan of Nu verversen vult alleen aan. De GC-code is de code van de tour in de klassementstabel van FRR (zoals FTQ.5). Die is pas na de eerste etappe bekend; staat hij er niet, dan noemt de melding bij Klassement welke codes FRR toont.",
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
      "Automatische imports kunnen opnieuw worden uitgevoerd: bestaande items worden bijgewerkt.",
      "YouTube- en Instagram-imports werken nadat technisch beheer de bronkoppelingen heeft ingesteld.",
      "De laatste drie Instagram-posts staan als foto's op het dashboard. Instagram-afbeeldingen verlopen na een tijd; importeer Instagram opnieuw als ze daar verdwenen zijn.",
    ],
  },
  {
    id: "rollenbeheer",
    title: "Rollen, rechten en notificaties",
    bullets: [
      "De rechtenmatrix (Beheer → Rechten) bepaalt per communityrol welke beheeracties zijn toegestaan. Elk beheerscherm hoort bij één recht: Kalenderbronnen (eventscan, Zwift-routes), Competities (ZRL-kalender, WTRL-teams, FRR), Sunday Race Club, Omnium, Koppelingen (Strava-sync, segmenten en storingsmeldingen), Pushberichten aan alle leden, Tips en citaten (Community beheren), Badges, ZWBgame en Rechten zelf. Wie een recht niet heeft, ziet het scherm ook niet in het beheermenu.",
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
      "Gekoppelde Strava-profielen kunnen automatisch worden bijgewerkt via de beveiligde Strava-synchronisatietaak.",
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
      "Renners zonder Zwift-ID worden als aangepaste renner in het plan opgenomen.",
      "De JSON-export bewaart ook velden die ZWB niet zelf bewerkt.",
      "De tekstexport is bedoeld als leesbare racesheet; de afbeelding als deelbare opstelling.",
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
      "Vermogensdata en wedstrijdresultaten kunnen opnieuw worden opgehaald via de beheeracties bovenaan.",
    ],
  },
];

const TROUBLESHOOTING = [
  "Zie je geen badges? Koppel Strava en start een sync, of importeer activities.csv of een GPX op het dashboard.",
  "Strava meldt ontbrekend activiteitenrecht? Koppel opnieuw via Profiel of het dashboard en zet het activiteitenvinkje aan.",
  "Verschijn je niet live met je Garmin? Check of Samen fietsen een laatste mail toont. Staat daar niets, kijk dan in Garmin Connect bij LiveTrack → Sessiedetails of je adres als ontvanger staat, en of Automatisch starten aan staat.",
  "Verschijn je niet live met je Wahoo? Open je Wahoo-link zelf: staat je rit daar niet, dan heeft de ELEMNT-app geen verbinding. Anders verschijn je binnen een paar minuten nadat iemand Samen fietsen opent.",
  "Verschijn je niet live? Check: OwnTracks op Private HTTP, juiste koppellink, locatie 'Altijd', en de modus actief (iPhone 'Actie', Android 'Beweging').",
  "Bolletje staat stil of viel weg? Meestal een dekkinggat of de app werd geschorst — de kaart pakt het automatisch weer op; controleer batterijoptimalisatie.",
  "Geen trainingen in beeld? Controleer je intervals.icu API-key.",
  "Geen fietsen onder Mijn fietsen of Mijn garage? Koppel je fiets in Strava aan je ritten en draai daarna een Strava-sync.",
  "Mis je rechten? Vraag bestuur of communitybeheer om je rol te controleren.",
  "Werkt iets niet meer zoals vlak na de installatie? Loop de welkomstrondleiding op /welkom opnieuw door.",
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ZWB gids"
        title="Hulp voor leden"
        description="Wat elke pagina doet, hoe je koppelt en live tracking instelt, en wat te doen als iets niet werkt."
      />

      <HelpSearch />

      <section className="rounded-lg border bg-card/90 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Net begonnen of werkt iets niet meer?</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Loop de welkomstrondleiding opnieuw door — die loodst je stap voor
              stap door je profiel, de Strava-/intervals-koppeling en meldingen.
              Handig als iets niet meer werkt zoals vlak na de eerste installatie.
            </p>
            <Link
              href="/welkom"
              className="mt-3 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Navigation className="size-4 text-primary" />
              Open de welkomstrondleiding
            </Link>
          </div>
        </div>
      </section>

      <section
        id="webapp-installeren"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWB als app op je telefoon</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Zet de webapp op je beginscherm voor snelle toegang zonder App
              Store of Play Store.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">iPhone of iPad</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open ZWB in Safari.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Tik op Delen.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Kies Zet op beginscherm en daarna Voeg toe.</span>
              </li>
            </ol>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Android</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open ZWB in Chrome.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Tik op het menu met drie puntjes.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Kies Toevoegen aan startscherm of Installeren.</span>
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {START_STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="jersey-panel rounded-lg border bg-card/90 p-4 transition hover:border-primary/40"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <h2 className="mt-3 font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Wat vind je waar?</h2>
        <p className="text-sm text-muted-foreground">
          Een korte wegwijzer door de app. Tik op een onderdeel om er meteen
          naartoe te gaan.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border bg-card/90 p-3 transition hover:border-primary/40"
            >
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <article
              key={guide.id}
              id={guide.id}
              className="rounded-lg border bg-card/90 p-4 scroll-mt-20"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <Icon className="size-5 text-primary" />
                {guide.title}
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {guide.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section
        id="externe-profielen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ExternalLink className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Doorklikken naar je andere profielen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Vul je ID&apos;s in op Profiel en er verschijnen knoppen naar
              ZwiftPower, ZwiftRacing.app, Strava en intervals.icu — op jouw
              profiel en op je ledenprofiel. Per ID kies je zelf of het zichtbaar
              is.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article
            id="zwift-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Zwift-ID</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in op my.zwift.com en open je profiel: het nummer in de
              adresbalk is je Zwift-ID. Staat ook in je ZwiftPower-adres, achter
              z=. Dit ene nummer verzorgt zowel ZwiftPower als
              ZwiftRacing.app.
            </p>
          </article>

          <article
            id="strava-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Strava</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Open je Strava-profiel in een browser. Het laatste stuk van het
              adres — strava.com/athletes/… — is wat je invult. Zowel het nummer
              als je gebruikersnaam werkt.
            </p>
          </article>

          <article
            id="intervals-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">intervals.icu</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Open in intervals.icu <strong className="text-foreground">Settings</strong>
              {" "}en daarna <strong className="text-foreground">Developer Settings</strong>.
              Daar staat je Athlete ID: een i gevolgd door cijfers. Vul dat
              i-nummer in. In de adresbalk staat het bij je eigen account niet
              altijd. Je gegevens daar zijn standaard privé, dus anderen zien
              alleen wat je vrijgeeft.
            </p>
          </article>
        </div>

        <Link
          href="/profiel"
          className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
        >
          <UserCircle className="size-4 text-primary" />
          Naar je profiel
        </Link>
      </section>

      <section
        id="ritten-via-intervals"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Bike className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Ritten via intervals.icu</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Het aantal Strava-koppelingen is beperkt. Zonder Strava komen je
              ritten automatisch binnen via intervals.icu, gratis en voor bijna
              elk merk fietscomputer of trainingsapp.
            </p>
          </div>
        </header>

        <ol className="mt-4 space-y-3">
          {INTERVALS_RIDE_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {INTERVALS_RIDE_NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        <a
          href="https://intervals.icu/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          intervals.icu Settings
          <ExternalLink className="size-3.5" />
        </a>
      </section>

      <section
        id="strava-import"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava-ritten importeren zonder koppeling</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Geen plek voor een Strava-koppeling of wil je die niet gebruiken?
              Laat je ritten dan binnenkomen via intervals.icu (hierboven), of
              upload ze zelf op het dashboard: je hele historie in één keer via
              activities.csv, of ritten met hun spoor via GPX.
            </p>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              De koppeling haalt eerst de laatste vijf jaar op en daarna, beetje
              bij beetje, je oudere ritten. Records, badges, ZWBlokken en
              segmenten gaan pas over je hele historie als die helemaal binnen
              is.
            </p>
          </div>
        </header>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hele historie (activities.csv)</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>
                  Vraag op{" "}
                  <a
                    href="https://www.strava.com/athlete/download_my_account"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Strava.com je accountdownload
                  </a>{" "}
                  aan (Instellingen → Mijn account → Download of verwijder je
                  account → Verzoek je archief).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Strava mailt je (soms pas na een paar uur) een link naar een
                  ZIP-archief.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Pak de ZIP uit. Het bestand activities.csv staat in de
                  hoofdmap van het archief.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>
                  Upload activities.csv op het dashboard met Importeer CSV of
                  GPX.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              De taal van je Strava-account maakt niet uit — Nederlandse,
              Engelse en andere kolomnamen worden herkend. Alleen fietsritten
              (ook virtueel, gravel, MTB en e-bike) worden geïmporteerd; de
              rest wordt automatisch overgeslagen. Opnieuw importeren kan
              altijd, ritten worden niet dubbel geteld.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Ritten met spoor (GPX)</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open je rit op Strava.com (website, niet de app).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Klik op het moersleutel-icoon (⋯) links en kies Exporteer
                  GPX.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Upload de GPX-bestanden op het dashboard met Importeer CSV of
                  GPX. Je kunt er meerdere tegelijk kiezen.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Gebruik de GPX van een gereden rit (met tijden), geen route-GPX.
              Afstand, hoogtemeters en rijtijd worden uit het bestand berekend.
              Met het spoor tellen cols, ZWB Segments en ZWBlokken mee, en meet
              ZWB je tijd op cols en uitgekozen segmenten. Die staat met GPS in
              de ranglijst.
              Staat de rit al binnen via activities.csv, dan krijgt die het
              spoor erbij. Dezelfde rit twee keer uploaden is geen probleem.
            </p>
          </article>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://www.strava.com/athlete/download_my_account"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Download className="size-4 text-primary" />
            Strava-data downloaden
          </a>
          <Link
            href="/dashboard#strava-sync"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Upload className="size-4 text-primary" />
            Naar het dashboard
          </Link>
        </div>
      </section>

      <section
        id="strava-rechten"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava opnieuw koppelen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              ZWB heeft activiteitenrecht nodig om je ritten, badges, cols,
              fietsen en statistieken bij te werken.
            </p>
          </div>
        </header>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <span>Ga naar Profiel of het dashboard en kies Opnieuw koppelen.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <span>Zet bij Strava het vinkje voor activiteiten aan.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <span>Start daarna op het dashboard een Strava-sync.</span>
          </li>
        </ol>
        <ConnectWithStrava reconnect className="mt-4" />
      </section>

      <section
        id="trainingsschema"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Trainingsdoel en je schema</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een schema begint bij een doel. Daarin leg je vast waar je naartoe
              werkt en hoeveel ruimte je hebt.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article
            id="doeltype"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Doeltype en de laatste weken</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Het doeltype bepaalt hoe je schema eindigt, dus kies het type dat
              bij je plan hoort — niet alleen de naam die het dichtst in de buurt
              komt.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Outdoor event of gran fondo:</strong>{" "}
                één piekdag. De laatste een tot twee weken gaat het volume omlaag
                terwijl de scherpte blijft, zodat je fris aan de start staat.
              </li>
              <li>
                <strong className="text-foreground">Basisconditie, FTP of herstel/opbouw:</strong>{" "}
                doorlopende doelen. Er komt geen taper: je bouwt door tot het
                eind, want die laatste weken zijn juist de weken waar je conditie
                van omhoog gaat. De targetdatum is dan het einde van de
                planperiode, geen wedstrijddag. Zet je in je jaarplan wél een
                A-doel in die periode, dan wint dat: daar wordt naartoe
                afgebouwd.
              </li>
              <li>
                <strong className="text-foreground">ZRL of Ladder:</strong> een
                reeks races over meerdere weken. Je traint er doorheen; alleen de
                dag vóór een racedag blijft licht.
              </li>
            </ul>
          </article>
          <article
            id="jaarplan"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Jaarplan: mikpunten en rustperiodes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Je schema werkt naar één datum toe. Het jaarplan is de laag
              daarboven: het jaar eromheen. Wat je erin zet stuurt het schema.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">A-doel:</strong> je piekdag.
                De laatste een tot twee weken gaat het volume omlaag en de
                scherpte blijft. Eén A-doel tegelijk: naar twee pieken binnen
                drie weken toewerken kan niet.
              </li>
              <li>
                <strong className="text-foreground">B-doel:</strong> belangrijk,
                maar je bouwt er gewoon doorheen. Alleen de dag ervóór blijft
                licht.
              </li>
              <li>
                <strong className="text-foreground">C-doel:</strong> je doet mee,
                je opbouw verandert er niet van.
              </li>
              <li>
                <strong className="text-foreground">Rust:</strong> vakantie of
                winterstop. Er wordt niets ingepland, en er begint geen
                opbouwblok dat er doorheen loopt. Duurde het langer dan tien
                dagen, dan begint het schema erna lager en bouwt het in twee
                weken terug op.
              </li>
              <li>
                <strong className="text-foreground">Rustig:</strong> een drukke
                periode. Ongeveer de helft van je normale weekvolume en geen
                zware sleutelsessies.
              </li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Clubevents waar je ja of misschien op hebt gezegd staan
              automatisch op de tijdlijn. Alleen een ja wordt een blok in je
              schema; misschien blijft een aantekening. Je trainer kan je
              jaarplan bekijken maar niet wijzigen.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Wil je zo&apos;n clubevent als mikpunt, kies het dan bij Mikpunt
              toevoegen onder Event; titel en datum komen van het event. In de
              lijst eronder staat zo&apos;n event dan als één regel met je
              prioriteit erbij. Daar wijzig je de prioriteit, en de prullenbak
              haalt alleen het mikpunt weg: het event en je aanmelding blijven.
              Dat geldt alleen voor jouw jaarplan, niet voor dat van andere leden.
            </p>
          </article>

          <article
            id="zonekleuren"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Kleuren van de blokken</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              De blokken kleuren zoals in Zwift, op je FTP: grijs onder 60%,
              blauw tot 76%, groen tot 90%, geel tot 105%, oranje tot 119% en
              rood daarboven. Een blok krijgt de kleur van het midden van zijn
              doel. Een training in de kalender krijgt de kleur van zijn
              kernwerk: het zwaarste niveau waarop je samen minstens vijf minuten
              rijdt, zonder warming-up en cooling-down. Lichtgrijs is rust; een
              gestippeld blokje zonder kleur is een rit zonder vermogensmeter.
            </p>
          </article>

          <article
            id="trainingsvormen"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Namen van trainingen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Binnen een zone onderscheiden we trainingsvormen: rustige duur
              (61-70% van je FTP), intensieve duur (71-80%), tempo (81-86%) en
              sweet spot (87-89%). Daarboven heet het drempel, VO2max en
              anaeroob. Een training heet naar zijn kernwerk. Intensieve duur loopt
              tot 80% en kleurt daardoor boven 76% al groen, zoals in Zwift. In
              intervals.icu, en zo ook in Zwift en op je fietscomputer, staat
              ZWBeter Worden voor de naam van elke training.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Max. trainingsuren per week</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dit is het plafond waarbinnen de AI je week vult, samen met de
              dagen die je beschikbaar hebt gemaakt. Zet je 6 uur, dan blijft de
              totale geplande tijd daaronder — ook in een zware blokweek. Het is
              geen streefwaarde: minder plannen mag altijd.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Het zegt niets over wat je aankunt. Reed je vorige week 7,5 uur
              terwijl je plafond op 6 staat, dan wordt de week erna{" "}
              <strong className="text-foreground">niet</strong> afgeremd om dat te
              compenseren. Het schema gaat pas voorzichtiger plannen bij echte
              signalen: een sterk negatieve form, een te snelle opbouw, slechte
              herstelwaarden, of trainingen die je zwaar reed én zwaar vond.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">FTP en gewicht uit intervals.icu</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Zet je onder Profiel &rarr; Fysiek{" "}
              <strong className="text-foreground">Bijhouden vanuit intervals.icu</strong>{" "}
              aan, dan nemen we bij elke sync je eFTP en gewicht over en vervalt
              de handmatige invoer. Die FTP bepaalt ook de targetwatts in je
              workouts.
            </p>
          </article>
          <article id="ftp-test" className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">FTP-test</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Je trainer zet een ramptest (40 minuten, oplopend tot je stukgaat)
              of een 20-minutentest (65 minuten, met opener) in je schema. De test
              ligt daarna vast: er wordt omheen gepland en de dag ervoor blijft
              licht. Na afloop vul je op je schemapagina onder{" "}
              <strong className="text-foreground">FTP-test</strong> je resultaat
              in — het hoogste minuutvermogen bij een ramptest, het gemiddelde bij
              een 20-minutentest. Met een intervals.icu-koppeling staat daar al
              het vermogen dat intervals die dag heeft gemeten; klopt het niet,
              typ dan je eigen waarde. ZWB rekent daar je FTP uit (75%
              respectievelijk 95%), zet die in je profiel en werkt de targetwatts
              van de rest van je schema bij. Typte je het verkeerde vermogen in,
              dan pas je de uitslag aan of verwijder je hem bij{" "}
              <strong className="text-foreground">Mijn vermogen</strong> onder
              FTP-tests; je FTP en de targetwatts volgen die correctie.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Een test die niet in je schema stond, vul je in via{" "}
              <strong className="text-foreground">Test invullen</strong>. Voor je
              FTP geldt deze volgorde: je laatste test, dan intervals.icu, dan wat
              je zelf in je profiel invulde. Heb je een test gedaan, dan houdt je
              profiel die uitslag vast, ook als het intervals.icu volgt; de
              volgende test werkt hem weer bij.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Een training verwijderen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met <strong className="text-foreground">Verwijder</strong> bij een
              geplande training haal je die uit je schema en uit intervals.icu.
              Een voorgestelde training komt daarna niet terug: de planner laat
              die dag vrij. Een eigen rit verdwijnt helemaal en je schema wordt
              eromheen bijgewerkt. Een clubevent zeg je af bij de events.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Rustdagen in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Een dag zonder training in je schema is een rustdag. Je mag dan
              helemaal niets doen, of tot 1,5 uur rustig fietsen zonder
              intensiteit: zone 1 tot lage zone 2, praten moet makkelijk gaan.
              De planner rekent die rit niet mee in je weekvolume en remt er de
              dagen erna niet om af. Losse hersteltrainingen korter dan 1,5 uur
              plant de AI niet meer: die leveren weinig op, en een echte rustdag
              herstelt beter.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Een dag aanpassen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met <strong className="text-foreground">Aanpassen</strong> op de
              trainingspagina geef je door hoeveel tijd je vandaag hebt en hoe je
              je voelt; de AI herschrijft de sessie van vandaag. Die gaat direct
              naar intervals.icu — de oude training van die dag verdwijnt daar —
              en je kunt meteen doorklikken. Je trainer krijgt bericht en kijkt
              achteraf of de rest van de week nog past. Heb je helemaal geen
              tijd, kies dan <strong className="text-foreground">Rustdag</strong>:
              de training van vandaag vervalt en verdwijnt ook uit intervals.icu.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Readiness en je apparaat</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Whoop, Oura en Polar sturen een eigen readiness of herstelscore naar
              intervals.icu; die nemen we één op één over. Garmin doet dat niet —
              Body Battery en Training Readiness blijven in Garmin Connect en
              komen niet mee. Voor die horloges rekent ZWB zelf een readiness uit
              je HRV en je rust-hartslag, afgezet tegen je eigen gemiddelde van de
              afgelopen 30 dagen, en je slaapscore. Korte nachten tellen daarna
              apart mee, net als bij de andere apparaten. Zo&apos;n waarde staat in
              de app met <em>berekend door ZWB</em> erbij.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Meet je horloge geen HRV, of is je laatste meting ouder dan een
              week, dan blijft het bewust een streepje. Een herstelscore op alleen
              je rust-hartslag zou vooral meetruis zijn, en dat wil je niet terug
              zien in je trainingsadvies.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Beschikbaarheid per week</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij je schema zet je per weekdag met een schuifbalk hoeveel tijd je
              hebt. Zet een dag op <em>geen</em> en er wordt niets gepland; zet je
              dinsdag op een uur, dan blijft de training van die dag daarbinnen.
              Je vult dat in voor{" "}
              <strong className="text-foreground">deze week</strong> of{" "}
              <strong className="text-foreground">volgende week</strong>; wat je
              onder <strong className="text-foreground">Standaard</strong> zet
              geldt voor elke week die je niet apart invult. Een week met een
              eigen invulling heeft een stip op het tabblad en gaat voor de
              standaard; met <strong className="text-foreground">Terug naar
              standaard</strong> volgt hij weer je standaardweek.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij het opslaan gaat een training op een dag zonder tijd er meteen
              af, en wordt een te lange training ingekort. Daarna werkt het schema
              zichzelf bij op de dagen die nog komen. Dat geldt ook als je een rit
              inplant of je voor een clubevent aan- of afmeldt. Lukt dat niet
              meteen, dan gebeurt het de volgende keer dat je je schema opent, of
              uiterlijk de volgende ochtend.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Beschikbaarheid is een plafond: meer tijd maakt een training niet
              vanzelf langer. Wil je een training langer of korter, gebruik dan{" "}
              <strong className="text-foreground">Duur aanpassen</strong> bij die
              training. De intervallen blijven gelijk; in- en uitrijden en
              duurblokken schuiven mee. Daarna ligt die training vast.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Feedback na een training</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Je RPE, gevoel en opmerking zijn voor je trainer én voor volgende
              bijstellingen van je schema. Een losse zware training verandert
              niet meteen alles; terugkerende signalen en een concrete opmerking
              wegen mee bij de eerstvolgende aanpassing.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Klik je in de maandkalender op een training die al geweest is, dan
              zie je de geplande opbouw naast wat je gereden hebt. Ook bij een
              gemiste training blijft zichtbaar wat er stond.
            </p>
            <p
              id="rit-koppelen"
              className="mt-2 scroll-mt-20 text-sm text-muted-foreground"
            >
              ZWB koppelt een rit vanzelf aan de training van die dag. Zit dat
              ernaast, kies dan zelf bij{" "}
              <strong className="text-foreground">Hoort bij</strong> welke training
              het was. Dat kan bij een gereden training en bij een rit die als niet
              gepland in de kalender staat, ook nadat je al bevestigd hebt. Je kunt
              kiezen uit trainingen die nog open staan in de week tot en met de
              ritdag; een training die later gepland staat niet, want die blijft in
              je schema staan. Je RPE, gevoel en opmerking verhuizen mee, de
              training waar de rit eerst aan hing telt weer als niet gereden. Kies
              je <strong className="text-foreground">Geen training</strong>, dan
              blijft de rit los staan en koppelt ZWB hem niet opnieuw; wat je bij
              die training had ingevuld vervalt dan. Verwijder je een rit in
              Strava, dan komt de training vanzelf weer vrij en blijft wat je
              invulde staan, zodat je er een andere rit aan kunt hangen.
            </p>
            <p
              id="tijd-per-zone"
              className="mt-2 scroll-mt-20 text-sm text-muted-foreground"
            >
              Onder de cijfers staat ook hoeveel minuten je per zone reed, in de
              kleuren van Zwift en op je FTP, met de geplande minuten erachter. Die
              tijden komen uit de vermogensmeting in intervals.icu. Dat werkt alleen
              als je rit rechtstreeks van je Garmin, Wahoo of Zwift in intervals.icu
              staat: een rit die via Strava binnenkomt heeft daar geen meting. Dan
              staat er Geen zonedata. Het kan na een rit even duren voordat de
              tijden verschijnen.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Clubevents in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij je schema staan de clubevents die binnen de looptijd vallen. Ze
              komen er pas in als je <strong className="text-foreground">Ik doe mee</strong>{" "}
              kiest: dan wordt het event een vast blok, met een duur uit de
              eindtijd of de afstand, en werkt het schema de week eromheen bij —
              geen zware sessie vlak ervoor of erna. Kies je{" "}
              <strong className="text-foreground">Nee</strong>, dan verdwijnt het
              uit de lijst en blijft je schema ongemoeid. &apos;Misschien&apos;
              telt als nog niet beslist, dus dat blijft gewoon staan.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Zelf een rit inplannen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Weet je dat je zaterdag met de club rijdt? Zet hem met{" "}
              <strong className="text-foreground">Rit inplannen</strong> in je
              schema: soort, datum, duur en zwaarte. Die rit ligt daarna vast — de
              planner verplaatst of vervangt hem niet, maar zet de rest van de week
              eromheen en telt de belasting mee. Zo&apos;n rit heeft geen
              blokkenstructuur en dus geen FIT-bestand; hij staat alleen in ZWB.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Voorstellen in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Op basis van je laatste ritten kan er iedere ochtend een{" "}
              <strong className="text-foreground">voorstel</strong> in je schema
              verschijnen, bijvoorbeeld om woensdag korter te maken. Het is een
              regel bovenin je schema, geen nieuw programma:{" "}
              <strong className="text-foreground">Toepassen</strong> zet het door
              naar intervals.icu, <strong className="text-foreground">Negeren</strong>{" "}
              laat je schema zoals het was. Doe je niets, dan verdwijnt het voorstel
              vanzelf zodra het over een voorbije dag gaat.
            </p>
          </article>
        </div>
      </section>

      <section
        id="logboek"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <h2 className="text-lg font-semibold">Logboek: hoe je je voelt</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Onder ZWBeter Worden staat een logboek waarin je per dag bijhoudt
          hoeveel last je hebt en waarvan — buikpijn, slecht geslapen, stemming,
          darmen. Je kunt er ook de eerste dag van je menstruatie markeren; de
          cycluslengte volgt dan vanzelf. De vragen zijn daarop geschreven, dus
          het logboek staat alleen bij leden met{" "}
          <strong className="text-foreground">Vrouw</strong> bij geslacht in hun
          profiel. Een versie voor mannen kan later volgen.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Het logboek staat standaard uit en doet niets tot je het zelf aanzet.
          Alleen jij ziet wat erin staat: je trainer niet en het bestuur niet.
          Het schema krijgt hooguit een samengevat signaal mee, nooit losse
          klachten.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Waarom klachten en geen cyclusfase? Onderzoek naar trainen per
          cyclusfase levert wisselende en zwakke uitkomsten op, terwijl klachten
          wél samenhangen met wat je die week aankunt. Bovendien heeft niet
          iedereen een natuurlijke cyclus. Zo werkt het ook zonder.
        </p>
      </section>

      <section
        id="trainingsruimte"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <HeartPulse className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              Form, herstel en je ZWBeterWorden-advies
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Deze waarden beantwoorden verschillende vragen. Daarom kunnen ze
              van elkaar afwijken zonder dat de data fout is. ZWB voegt ze samen
              in één praktisch advies:{" "}
              <strong className="text-foreground">ZWBeterWorden</strong>, met vijf
              niveaus van &ldquo;doe niks&rdquo; tot topvorm.
            </p>
          </div>
        </header>

        <div className="mt-5 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">intervals.icu koppelen</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {INTERVALS_CONNECT_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-foreground">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href="https://intervals.icu/settings#api"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open intervals.icu API-instellingen
          </a>
        </div>

        <div className="mt-5 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Data blijft achter of komt niet binnen</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {DATA_FRESHNESS_HELP.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/zwbeter-worden/belasting"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Bekijk wanneer je data voor het laatst is opgehaald
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" />
              Form
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Form is de trainingsbalans uit intervals.icu:
              <strong className="text-foreground"> CTL min ATL</strong>. CTL is
              je belasting over langere tijd en ATL je recente belasting.
              Negatief betekent dus dat je recent relatief veel hebt getraind.
              Het zegt niet rechtstreeks hoe je hebt geslapen of hoe je lichaam
              vandaag reageert.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HeartPulse className="size-4 text-primary" />
              Hersteltrend en readiness
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              De hersteltrend vergelijkt je HRV en rusthartslag met je eigen
              baseline en neemt slaap en de readiness van vandaag mee.
              Readiness is een dagsignaal uit intervals.icu; HRV, rusthartslag
              en slaap worden als zevendaagse trend bekeken. Een gunstige HRV
              kan daardoor naast een middelmatige readiness staan.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Is de readiness van vandaag nog niet binnen, dan zie je de laatste
              meting met de datum erbij, maar die telt niet mee in je advies. Pas
              je je training van vandaag aan, dan haalt ZWB eerst je nieuwste
              hersteldata op. Heb je vandaag al gereden, dan komt er geen tweede
              training op die dag bij.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Als je hersteldata deelt, gebruikt ZWB slaap, HRV en rusthartslag
              uit intervals.icu voor trainingsplanning. Alleen jij en je trainer
              zien deze data.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4 text-primary" />
              ZWBeterWorden
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              ZWB combineert belasting en herstel tot één advies in vijf
              niveaus. Een sterk negatieve Form of readiness van 50 of lager duwt
              je naar een laag niveau (rust/herstel). Readiness 51-69 telt als
              matig. Pas wanneer belasting én herstel gunstig zijn, klim je naar
              de hoogste niveaus met ruimte voor kwaliteit.
            </p>
          </article>
        </div>

        <div className="mt-4 space-y-2">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm font-semibold">DOE NIKS</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Je bent aan het overtrainen, geef je partner even wat aandacht
              ofzo.
            </p>
          </div>
          <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3">
            <p className="text-sm font-semibold">RICHT OP HERSTEL</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ga maar lekker vogeltjes kijken.
            </p>
          </div>
          <div className="rounded-md border border-zwb-petrol/50 bg-zwb-petrol/10 p-3">
            <p className="text-sm font-semibold">ALLEEN DUUR</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Je mag wel gaan fietsen, maar geen heftige intervallen.
            </p>
          </div>
          <div className="rounded-md border border-zwb-teal/50 bg-zwb-teal/10 p-3">
            <p className="text-sm font-semibold">FRIS GENOEG</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ga er maar lekker op uit en blokjes mogen ook, vergeet de chocomelk
              niet na afloop.
            </p>
          </div>
          <div className="rounded-md border border-zwb-gold/50 bg-zwb-gold/10 p-3">
            <p className="text-sm font-semibold">BETER WORDT HET NIET</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Alles mag, probeer die andere ZWB&apos;ers er vandaag maar vanaf te
              rijden.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Voorbeeld:</strong> Form -14,
          readiness 66 en een goede HRV-trend betekent niet dat je volledig fris
          bent. De HRV is positief, maar recente trainingsbelasting en
          middelmatige readiness houden je in het middensegment. Je
          ZWBeterWorden-advies wordt dan niveau 3 &ldquo;ALLEEN DUUR&rdquo;.
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Coachchat</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Snap je niet waarom er vandaag negentig minuten staat terwijl je twee
            uur hebt? Vraag het in de coachchat. De coach kent je schema, je doel
            en de &ldquo;Let op&rdquo;-regels die bij je schema horen, en legt uit
            waarom er staat wat er staat. Hij verandert zelf niets.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hij kent ook je trainingsdata: je laatste ritten met hun belasting, je
            belasting per week, je FTP, FTP-tests en vermogenscurve, wat je van je
            schema werkelijk reed, en je CTL, ATL en TSB als je intervals.icu hebt
            gekoppeld. Vragen als &ldquo;hoeveel reed ik de afgelopen maand?&rdquo;
            of &ldquo;was zaterdag zwaar genoeg?&rdquo; kunnen dus ook. Wat nog niet
            uit Strava binnen is, ziet hij niet, en belasting (TSS) en intensiteit
            (IF) rekenen we alleen uit bij een echte vermogensmeter. Elke rit rekent
            met de FTP die op die dag gold, dus een nieuwe FTP verandert de
            belasting van eerdere ritten niet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Vink je <strong className="text-foreground">Dit raakt mijn schema</strong>{" "}
            aan, dan vraagt je bericht een herziening aan en gaat de tekst mee naar
            de volgende versie van je schema. Handig voor dingen die de app niet
            kan zien: een week ziek geweest, een doel dat verschuift.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Het gesprek blijft staan en de trainers die jij hebt aangewezen lezen
            het terug en kunnen erin reageren. Het bestuur niet. Over pijn,
            blessures of ziekte geeft de coach geen advies — daarvoor ga je naar je
            trainer of een arts.
          </p>
          <Link
            href="/zwbeter-worden/coach"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open de coachchat
          </Link>
        </div>

      </section>

      <section
        id="strava-samenvatting"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              ZWBeter Worden-samenvatting in je Strava-omschrijving
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Na een rit zet ZWB automatisch een blokje onderaan de omschrijving
              van die rit op Strava. Je ziet in één oogopslag wat er gepland
              stond, wat je er werkelijk van maakte en hoe je ervoor staat.
            </p>
          </div>
        </header>

        <div className="mt-5 rounded-md border bg-background p-4">
          <pre className="overflow-x-auto whitespace-pre text-xs text-muted-foreground">
{`📊 ZWBeter Worden
Gepland: 3x10 min drempel
Geplande duur: 75 min
Gedetecteerd type: Drempel
Workout score: +8% (82 vs 76 TSS)
📈 Progressie
CTL: 49,9
Gereedscore: 72 (niveau 4 – FRIS GENOEG)
Fitness-status: Verbeterend`}
          </pre>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Wat je ervoor moet doen</h3>
            <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                1. Koppel Strava opnieuw via{" "}
                <Link href="/profiel" className="underline">
                  je profiel
                </Link>{" "}
                en laat het vinkje staan waarmee ZWB je activiteiten mag
                bijwerken. Zonder dat recht blijft de omschrijving leeg.
              </li>
              <li>
                2. Koppel intervals.icu op de{" "}
                <Link href="/zwbeter-worden/doelen" className="underline">
                  Doelen-pagina
                </Link>
                . Daar komen de belasting, CTL en gereedscore vandaan.
              </li>
              <li>
                3. Zet een schema klaar. Zonder geplande workout blijven
                &ldquo;Gepland&rdquo; en &ldquo;Workout score&rdquo; op
                &ldquo;-&rdquo;.
              </li>
            </ol>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Goed om te weten</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                Je eigen tekst blijft staan; de samenvatting komt eronder.
              </li>
              <li>
                Haal je de samenvatting weg, dan zetten we hem niet terug.
              </li>
              <li>
                Het blokje verschijnt pas als intervals.icu je rit heeft
                verwerkt — meestal binnen een uur.
              </li>
              <li>
                Wie jouw Strava-rit kan zien, ziet ook deze samenvatting. Je
                slaap- en HRV-data komen er nooit in, alleen de score die daaruit
                volgt.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section
        id="vermogen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Zap className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Mijn vermogen en de powercurve</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              De powercurve toont je beste gemiddelde vermogen voor iedere duur
              binnen de gekozen periode. De eigen curve wordt live uit
              intervals.icu geladen.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article
            id="watt-wkg"
            className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Watt of W/kg</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met de knop Watt / W/kg bovenaan ZWBeter Worden kies je hoe
              vermogen overal in de trainingsruimte staat: je FTP, de
              testuitslagen, de doelen in de blokken en het vermogen van gereden
              trainingen. De keuze geldt op dit apparaat. W/kg rekent met het
              gewicht uit je profiel; staat daar niets, dan blijft het watt. Een
              training die je vanaf september 2026 afrondt, onthoudt je gewicht
              van die dag; oudere trainingen en testuitslagen rekenen met je
              huidige gewicht. Een doel in procenten van je FTP blijft een
              percentage. Bekijkt je trainer jouw schema, dan rekent die met
              jouw gewicht.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">De grafiek gebruiken</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Kies 6 weken of 90 dagen voor je recente vorm, of all-time voor
                  je beste vermogens uit je volledige Intervals-historie.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Beweeg over de lijn voor de exacte duur en waarde. Watt toont
                  je beste absolute vermogen. Voor je eigen W/kg-lijn gebruikt
                  ZWB het historische W/kg-record dat Intervals voor die duur
                  heeft opgeslagen, dus met het gewicht rond die prestatie.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Korte duren zeggen meer over sprint en punch; 5-20 minuten
                  over VO2max, klimmen en tijdritvermogen.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Vergelijken met ZWB</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              De ZWB-mediaan en ledenkeuze gebruiken de volledige
              gesynchroniseerde 90-daagse powercurve van leden met een
              voltooide intervals.icu-koppeling. Daardoor vergelijk je niet
              alleen 15s, 30s, 1m, 2m, 5m, 10m en 20m, maar de hele lijn.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Profielen die nog niet opnieuw zijn gesynchroniseerd na deze
              uitbreiding vallen tijdelijk terug op die zeven vaste waarden.
              Na een nieuwe sync wordt hun volledige curve opgeslagen. Alleen
              ingelogde ZWB-leden kunnen deze vergelijking zien.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Volledig gesynchroniseerde W/kg-curves gebruiken de historische
              W/kg-records van Intervals per duur. Oude fallback-profielen
              gebruiken tot hun volgende sync het laatst gesynchroniseerde
              gewicht.
            </p>
          </article>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Vermogen na arbeid (kJ)</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Onder de curve staat een schuifje. Links staat je verse curve,
            rechts je vermogen nadat je in een rit een bepaalde hoeveelheid
            arbeid hebt geleverd. Zo zie je hoeveel vermogen je overhoudt als je
            moe wordt.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            De standen komen uit je eigen intervals.icu-instellingen. Zet ze op
            1000 en 2000 kJ: open intervals.icu, ga naar Power, klik boven de
            powercurve op de knoppen met &quot;? kJ&quot; en vul 1000 en 2000
            in. Intervals rekent de curves daarna door; dat duurt een paar
            minuten.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Iedereen die 1000 en 2000 kJ gebruikt, vergelijkt in dezelfde stand
            met de ZWB-mediaan en met andere leden. Wie andere waarden of niets
            heeft ingesteld, doet in die stand niet mee aan de vergelijking.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Klik na het instellen op Mijn vermogen op &quot;Mijn waarden
            ophalen&quot;, zodat je vermoeide curves ook in de clubvergelijking
            terechtkomen.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">
            Waarom Watt en W/kg niet altijd dezelfde rit tonen
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Intervals houdt per duur twee records bij: het hoogste absolute
            vermogen en het hoogste vermogen per kilogram. Een iets lager
            Watt-record bij een lager lichaamsgewicht kan dus je beste W/kg
            zijn. Daarom kunnen de Watt- en W/kg-lijn voor dezelfde duur naar
            verschillende activiteiten verwijzen.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Waarom de lijn altijd daalt</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Een maximaal gemiddeld vermogen kan bij een langere duur nooit hoger
            zijn dan bij een kortere duur. ZWB verwijdert daarom ongeldige losse
            punten uit de API-respons en maakt minieme afrondingssprongen vlak.
            Een echte prestatie blijft zichtbaar, maar een technische piek of
            dip hoort niet in de curve.
          </p>
          <Link
            href="/zwbeter-worden/vermogen"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Mijn vermogen
          </Link>
        </div>
      </section>

      <section
        id="core-mobiliteit"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Dumbbell className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Core &amp; mobiliteit</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Korte series van 6 tot 30 minuten die je naast het fietsen doet.
              Je vinkt ze zelf af; ze tellen niet mee in je trainingsbelasting,
              CTL of naleving.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Wat je ervan mag verwachten</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Meer rompuithoudingsvermogen en houdingscontrole. Dat is wat
                  je nodig hebt om urenlang voorovergebogen te zitten zonder in
                  je onderrug te zakken.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Minder kans op lage rugklachten. Rugpijn komt bij wielrenners
                  veel voor, en renners mét klachten zitten tijdens het rijden
                  meetbaar meer geflecteerd in hun lage rug.
                </span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Geen extra watt.</strong>{" "}
                  Onderzoek naar core-training laat wel duidelijke winst zien op
                  romp-uithoudingsvermogen en balans, maar nauwelijks op kracht
                  en snelheid. Dit is houdings- en belastbaarheidswerk, geen
                  prestatietraining.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hoe je het inplant</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Twee tot drie keer per week, en houd het minstens vier weken
                  vol. Korter meten heeft weinig zin; daarom telt het overzicht
                  in blokken van 28 dagen en niet per dag.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Voor de rit</strong> is
                  bewust volledig dynamisch. Lang statisch rekken vlak voor een
                  inspanning kost meetbaar vermogen, dus lange rekhoudingen doe
                  je ná de rit of op een rustdag.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De AI-trainer plant dit niet in. Off-bike werk hoort niet in
                  je fietsschema, want het heeft geen wattages en zou je
                  belastingcijfers vervuilen.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div
          id="kracht"
          className="mt-4 scroll-mt-20 rounded-md border bg-background p-4"
        >
          <h3 className="text-sm font-semibold">Krachtreeksen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Naast core en mobiliteit staan er series met je eigen gewicht voor
            beenkracht, klimmen en eenbenige stabiliteit. Ze zijn bedoeld voor een
            rustdag: je krijgt ze alleen voorgesteld op een dag zonder training of
            rit, minstens drie dagen na je vorige krachtsessie en hooguit twee keer
            per week. Zo zit de spierpijn niet in je volgende sleutelsessie. Ook
            deze series tellen niet mee in je trainingsbelasting.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Verwacht er geen extra watt van. Dat zwaar krachtwerk renners sneller
            maakt, gaat over halters en weinig herhalingen, met begeleiding. Deze
            series maken je benen en romp belastbaarder en je trapbeweging per
            been stabieler.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Klachten en grenzen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Deze series zijn algemeen onderhoudswerk, geen behandeling. Stop bij
            pijn. Heb je aanhoudende rug-, knie- of heupklachten, of een
            blessure, ga dan naar een fysiotherapeut of huisarts — ZWB geeft
            daar bewust geen advies over, en de AI-trainer ook niet.
          </p>
          <Link
            href="/zwbeter-worden/core"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Core &amp; mobiliteit
          </Link>
        </div>
      </section>

      <section
        id="voeding"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Utensils className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Voeding</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een kennisbank met bronnen, recepten op maat en elke dag een tip op
              Vandaag. Alles volgt de consensus- en positiestukken over
              sportvoeding, met het UCI-positiestandpunt over wielervoeding
              (2026) als basis.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hoe je doelen tot stand komen</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Je schema en je ritten van vandaag en morgen bepalen het
                  dagtype: rust, licht, matig, zwaar, lang of wedstrijd. Duur en
                  intensiteit tellen, net als in de richtlijnen.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Koolhydraten gaan per kilo lichaamsgewicht mee met dat dagtype,
                  van 3–5 g/kg op een rustdag tot 8–12 g/kg op een lange dag.
                  Eiwit blijft 1,6–2,1 g/kg. Onderweg reken we per uur, naar de
                  duur van je rit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Er staat nergens een caloriedoel. ZWB geeft bewust geen
                  afvaladvies: te weinig eten bij veel trainen schaadt je
                  gezondheid en je vorm.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Recepten op maat</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Elk ingrediënt heeft een rol. De koolhydraatbron schaalt naar je
                  koolhydraatdoel voor dat moment, de eiwitbron naar je eiwitdoel,
                  en de rest schaalt mee met je lengte, gewicht en leeftijd. Geen
                  onderdeel wordt kleiner dan de helft of groter dan het dubbele.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Zonder gewicht zie je de standaardportie. Je lengte vul je in op
                  je profiel; alleen jij kunt die zien.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De voedingswaarden komen uit het Nederlands
                  Voedingsstoffenbestand (NEVO-online 2025/9.0) van het RIVM.
                  Ontbreekt er een waarde, dan staat er ≥ voor het totaal.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Grenzen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Dit is algemene sportvoedingsinformatie, geen medisch of
            diëtistisch advies. Heb je aanhoudende vermoeidheid, vaak blessures,
            een onregelmatige menstruatie, maag- of darmklachten, of wil je
            supplementen gebruiken? Ga dan naar een sportarts of
            sportdiëtist.
          </p>
          <Link
            href="/zwbeter-worden/voeding"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Voeding
          </Link>
        </div>
      </section>

      <section
        id="pacing"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Mountain className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Pacingplan bij een event</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een verdeling van je vermogen over het parcours, per stuk in w/kg,
              doorgerekend op je CP, je anaerobe reserve en je gewicht.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hoe het plan ontstaat</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Open je de pacingpagina, dan staat er een basisvoorstel: elke klim
                  apart, lange klimmen in begin, midden en slot, en het vlakke deel
                  in stukken van hoogstens 8 km. Met Nieuw voorstel vraag je de AI
                  om het te verbeteren; ook dat voorstel wordt doorgerekend en
                  teruggeschaald als je reserve het niet houdt.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Wil je ergens anders een versnelling leggen, knip een stuk dan op
                  een kilometerpunt (minstens een halve kilometer van de randen) of
                  voeg twee stukken samen; het doel wordt dan het gemiddelde naar
                  afstand. Hoogstens 30 stukken. Verandert de route, dan deelt
                  opnieuw doorrekenen de route opnieuw in en vervallen je eigen
                  knippen.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Verandert je CP, je gewicht of de indeling van de route, dan heet
                  het plan verouderd. Opnieuw doorrekenen kost niets en verandert je
                  plan pas als jij erop drukt.
                </span>
              </li>
            </ul>
          </article>

          <article
            id="pacing-eindtijd"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Gewenste eindtijd</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vul een tijd in als u:mm en kies Plan voor deze tijd. De verdeling van
              je plan blijft hetzelfde; alle doelen gaan samen omhoog of omlaag tot
              de verwachte tijd binnen een halve minuut van je doel ligt.
              Neutralisaties en afdalingen schuiven niet mee. Is je doel sneller dan
              je reserve en je drempel toelaten, dan krijg je het snelste plan dat
              de finish haalt en zie je welke tijd dat is. Het doel blijft bij je
              plan staan, zodat je na een aanpassing ziet hoe ver je ervan af zit.
              Vraag je daarna een nieuw voorstel, dan krijgt de AI je doeltijd mee:
              die kiest waar je harder en zachter rijdt, en het platform zet die
              verdeling daarna weer op je tijd. Wind zit niet in de berekening;
              slipstream alleen bij een Zwift-event (zie Zwift-wedstrijden).
            </p>
          </article>

          <article
            id="pacing-neutralisatie"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Neutralisatie</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Zet de organisatie een neutralisatie op het event, dan is dat in je
              plan een vast stuk zonder schuifregelaar. Het plan rekent daar met
              ongeveer 30 km/u achter de wagen, en nooit met meer dan 70% van je
              CP. Dat kost je dus geen reserve, maar het werk telt wel mee voor hoe
              vermoeid je later in de rit bent. Komt er een neutralisatie bij of
              verschuift hij, dan wordt je plan verouderd.
            </p>
          </article>

          <article
            id="pacing-afdalingen"
            className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Afdalingen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Een afdaling van minstens een kilometer die gemiddeld 4% of meer daalt,
              is een eigen stuk. Het doel staat standaard op 0: uitrollen. Waar het
              steiler dan 3% daalt rekent het plan dan zonder trappen; op een vlakker
              stukje in de afdaling trap je toch licht door (40% van je CP). Uitrollen
              vult je reserve sneller aan en kost geen werk. Het plan gaat uit van
              hoogstens 79 km/u en houdt geen rekening met bochten of remmen, dus de
              verwachte tijd op een technische afdaling is optimistisch. Wil je toch
              doortrappen, schuif het doel dan omhoog; dat blijft staan zolang de
              afdaling dezelfde is.
            </p>
          </article>

          <article
            id="pacing-zwift"
            className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Zwift-wedstrijden</h3>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>
                Bij een Zwift-event rekent het plan met de fysica van Zwift in plaats
                van die van de weg. Onder Opzet kies je het format, je frame met
                upgradeniveau en je wielen; het plan wordt daarna meteen
                opnieuw doorgerekend. Het format staat vooraf op wat het event zegt:
                een event zonder drafting is een tijdrit. Regels van het event tellen
                mee: geen tijdritfiets waar die verboden is, geen powerups als ze uit
                staan, opgelegde wielen en uitgeschakelde upgrades.
              </p>
              <p>
                Fietsen komen uit de snelheidstests van ZwiftInsider: per frame en
                wielset hoeveel sneller of trager je bent op het vlak en op een klim.
                Het plan rekent ook met het wegdek. Op onverhard is een racefiets
                veel trager dan een gravelbike, op asfalt is het omgekeerd; die
                stukken staan als band onder het hoogteprofiel. De wegdekkaart komt
                van ZwiftMap. Je lengte uit je profiel telt mee voor de
                luchtweerstand; zonder lengte rekent het plan met 175 cm, zoals Zwift.
              </p>
              <p>
                In een wedstrijd kies je per stuk In de groep of Alleen. In de groep
                kost hetzelfde tempo ongeveer een derde minder luchtweerstand; op een
                steile klim scheelt dat weinig. Een wedstrijd krijgt een vaste start
                (de eerste 700 m gaat het veld hard weg) en een sprint over de laatste
                300 m, behalve als de finish op een klim ligt. Tot de sprint houdt het
                plan minstens 15% van je reserve over voor een aanval. Bij een
                ploegentijdrit rekent het plan met je kopbeurten naar ploeggrootte.
              </p>
              <p>
                Per stuk kun je een powerup inzetten die het event uitdeelt. Het plan
                rekent de werking mee vanaf het begin van dat stuk: veer 10% lichter
                30 s, aerohelm 25% minder luchtweerstand 15 s, draft boost meer
                slipstream 40 s (alleen in de groep), stoomwals minder rolweerstand
                30 s, aambeeld zwaarder op een afdaling 15 s. Je weet vooraf niet
                welke powerup je krijgt; zorg dat je plan ook zonder werkt. Hoe groot
                de slipstream en de draft boost precies zijn, maakt Zwift niet bekend:
                dat zijn schattingen.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section
        id="livetrack"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <MapPinned className="mt-0.5 size-5 shrink-0 text-primary" />
          <h2 className="font-semibold">Live volgen met je Garmin of Wahoo</h2>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { title: "Garmin Edge", steps: GARMIN_LIVETRACK_STEPS },
            { title: "Wahoo ELEMNT", steps: WAHOO_LIVETRACK_STEPS },
          ].map((device) => (
            <div key={device.title} className="rounded-md border bg-background p-4">
              <h3 className="text-sm font-semibold">{device.title}</h3>
              <ol className="mt-3 space-y-3">
                {device.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {LIVETRACK_NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="owntracks"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <MapPinned className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Live tracking instellen (OwnTracks)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Volg deze stappen één keer goed, dan zie je elkaar betrouwbaar op
              de kaart tijdens een rit.
            </p>
          </div>
        </header>

        <ol className="mt-4 space-y-3">
          {OWNTRACKS_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Voor een strak spoor zonder gaten
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {OWNTRACKS_QUALITY_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Smartphone className="size-4 text-primary" />
                Belangrijkste instellingen
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Mode:</strong> Private HTTP
                </li>
                <li>
                  <strong className="text-foreground">URL:</strong> je
                  persoonlijke koppellink van Samen fietsen
                </li>
                <li>
                  <strong className="text-foreground">Locatie:</strong> Altijd +
                  precies/nauwkeurig
                </li>
                <li>
                  <strong className="text-foreground">Modus tijdens rit:</strong>{" "}
                  iPhone Actie · Android Beweging (strak spoor). Significant /
                  Grootte wijzigingen mag ook: zuiniger, iets minder nauwkeurig.
                </li>
              </ul>
            </div>
            <Link
              href="/live"
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Navigation className="size-4 text-primary" />
              Naar Samen fietsen
            </Link>
          </div>
        </div>
      </section>

      <section
        id="verjaardagsrondje"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Cake className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Verjaardagsrondje en aanmelden</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deel je je verjaardag, dan kun je een verjaardagsrondje plannen met
              datum, tijd, startplek en een GPX-route. Andere leden melden zich
              daar aan.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Aanmelden doe je onder <strong className="text-foreground">Rijd
              je mee?</strong> — tik op het vak{" "}
              <strong className="text-foreground">Rijdt mee</strong>,{" "}
              <strong className="text-foreground">Misschien</strong> of{" "}
              <strong className="text-foreground">Niet</strong>. Je keuze is
              meteen zichtbaar en je kunt later wisselen.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Op de dag van het rondje verschijnen de aangemelde renners
              (Rijdt mee of Misschien) live op de kaart en het hoogteprofiel,
              net als bij events — mits ze outdoor delen op Samen fietsen.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Alleen de jarige beheert het rondje zelf; aanmelden kan elk
              goedgekeurd lid.
            </span>
          </li>
        </ul>
      </section>

      <section
        id="zwblokken"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Grid3x3 className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWBlokken</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              De kaart is verdeeld in blokken van ongeveer anderhalve kilometer.
              Rijd je door een blok, dan kleurt het in — voor jou én voor de
              club. Zo zie je in één oogopslag welke hoeken je nog nooit gehad
              hebt.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              De blokken komen uit je Strava-ritten. Zonder Strava-koppeling
              blijft je eigen laag leeg; de clubkaart zie je wel.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Zwift-ritten staan onder
              Zwift, los van de kaart buiten.</strong> Per Zwift-wereld kleuren
              blokken van ongeveer 600 meter in, en wie de meeste blokken in een
              wereld heeft, draagt daar de titel. Staan leden gelijk, bijvoorbeeld
              omdat meerdere leden een wereld helemaal gereden hebben, dan wint
              wie daar de meeste kilometers reed. Het percentage gaat over de
              wegen die we van die wereld kennen: rijdt iemand een nieuwe weg,
              dan kan het iets zakken. Andere indoorplatforms, zoals MyWhoosh,
              Rouvy en FulGaz, tellen niet mee.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Uit privacy-overweging telt het blok waar een rit begint of
              eindigt nooit mee, en laten we ook de eerste en laatste kilometer
              van elke rit buiten beschouwing. Je woonadres komt dus niet als
              opgelicht blok op de kaart.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Hoe donkerder een clubblok, hoe meer verschillende leden er
              geweest zijn. De goudkleurige blokken zijn die van het lid dat je
              in de kiezer hebt staan.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Tik op een blok om te zien welke leden er geweest zijn, met de
              datum waarop ze er voor het eerst reden.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Onder de kaart staat per Europees land hoeveel procent van de
              blokken je gehad hebt, en per provincie in Nederland, België,
              Luxemburg, Duitsland (deelstaten) en Frankrijk (regio&apos;s).
              Ritten buiten Europa kleuren wel op de kaart, maar hebben geen
              gebied in die tabel.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Wie in een land de meeste
              blokken heeft, is er Koning of Koningin; in een provincie
              Gouverneur.</strong> Het gaat om verschillende blokken, niet om
              kilometers: steeds hetzelfde rondje levert niets op. Bij een gelijk
              aantal houdt wie dat aantal het eerst had de titel. Koning of
              Koningin volgt het geslacht in je profiel; staat dat niet ingevuld,
              dan word je Vorst.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Nieuwe ritten komen erbij zodra de Strava-sync gedraaid heeft,
              meestal binnen een half uur.
            </span>
          </li>
        </ul>

        <div className="mt-4">
          <Link
            href="/zwblokken"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Grid3x3 className="size-4 text-primary" />
            Naar ZWBlokken
          </Link>
        </div>
      </section>

      <section
        id="mijn-garage"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Wrench className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Mijn fietsen en onderhoud</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Zodra je Strava gekoppeld en gesynchroniseerd hebt, kent ZWB je
              fietsen met hun totale kilometerstand. Daarmee toon je je fietsen
              op je profiel en houd je de slijtage van onderdelen bij.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="size-4 text-primary" />
              Fietsen op je profiel
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Naam en kilometers komen rechtstreeks uit Strava (
                  <em>Mijn uitrusting</em>). Koppel daar je fiets aan je ritten,
                  anders blijft de lijst leeg.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Geen fietsen na een sync? Klik op je profiel bij Strava op{" "}
                  <strong className="text-foreground">Opnieuw koppelen</strong> —
                  voor je uitrusting hebben we eenmalig extra toestemming nodig.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Geen Strava? Voeg met{" "}
                  <strong className="text-foreground">Fiets handmatig
                  toevoegen</strong> zelf een fiets toe met naam, merk/model en
                  eventueel afstand. Handmatige fietsen tonen we wel op je
                  profiel, maar doen niet mee in de onderhoudsfunctie.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Onder <strong className="text-foreground">Mijn fietsen</strong>{" "}
                  op je profiel kies je per fiets of die zichtbaar is en zet je
                  er een eigen foto bij. Virtuele fietsen staan standaard aan;
                  gearchiveerde fietsen standaard uit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Zichtbare fietsen verschijnen ook op je ledenprofiel, zodat
                  clubgenoten zien waarop je rijdt.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="size-4 text-primary" />
              Slijtage bijhouden
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Voeg in <strong className="text-foreground">Mijn garage</strong>{" "}
                  een onderdeel toe (ketting, cassette, banden, remblokken …) en
                  kies een slijtage-range: <em>enige</em>, <em>normale</em> of{" "}
                  <em>hoge</em> slijtage. Elke range heeft een richt-aantal
                  kilometers dat je mag overschrijven met een eigen drempel.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De gereden kilometers van een onderdeel = de stand van de fiets
                  nu min de stand bij montage. Monteer je een al gebruikt
                  onderdeel, vul dan &ldquo;al gereden km&rdquo; in.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De balk kleurt groen, oranje (bijna) en rood (toe aan
                  vervanging). Onderdelen die opvallen verschijnen ook op je
                  dashboard.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Vervangen? Klik op <strong className="text-foreground">Vervangen</strong>{" "}
                  — de teller begint opnieuw vanaf de huidige stand.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/mijn-garage"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Wrench className="size-4 text-primary" />
            Naar Mijn garage
          </Link>
          <Link
            href="/profiel#fietsen"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Bike className="size-4 text-primary" />
            Mijn fietsen
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Zet onder Profiel → Meldingen de optie{" "}
          <strong className="text-foreground">Mijn garage: onderdeel toe aan
          vervanging</strong> aan om hierover een pushmelding te krijgen.
        </p>
      </section>

      <section
        id="fit-export"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              Workout op je fietscomputer (Wahoo / Garmin)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Een gepubliceerd schema staat automatisch in intervals.icu. Hoe je
              het op je fietscomputer krijgt, verschilt per merk.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="size-4 text-primary" />
              Wahoo ELEMNT / BOLT / ROAM
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Wahoo importeert geplande workouts <strong>niet</strong> uit een
              los bestand — dan krijg je de melding &ldquo;geen geldige
              GPX&rdquo;, omdat de app het als route probeert te lezen. Geplande
              workouts komen binnen via een koppeling. Koppel intervals.icu één
              keer aan Wahoo, daarna synct het schema vanzelf:
            </p>
            <ol className="mt-3 space-y-3">
              {WAHOO_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Download className="size-4 text-primary" />
                Garmin
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Klik bij de workout op <strong>Download FIT</strong> en
                    importeer het bestand in Garmin Connect (of zet het in de
                    map NewFiles op het toestel).
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Of koppel intervals.icu aan Garmin Connect in de
                    intervals-instellingen, dan synct het schema ook automatisch.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CircleHelp className="size-4 text-primary" />
                Goed om te weten
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                De <strong>Download FIT</strong>-knop is bedoeld voor Garmin en
                andere apparaten die losse workout-bestanden accepteren. Voor
                Wahoo gebruik je de cloudkoppeling hierboven. Pas je een schema
                aan? Publiceer opnieuw, dan staat de nieuwste versie klaar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="zwift-workout"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Monitor className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Workout in Zwift</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Koppel Zwift één keer aan intervals.icu, daarna staat de training
              van de dag vanzelf in Zwift klaar.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Zwift koppelen
            </h3>
            <ol className="mt-3 space-y-3">
              {ZWIFT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4 text-primary" />
              Goed om te weten
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_NOTES.map((note) => (
                <li key={note} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="zwift-voorstellen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Zwift-events bij je training</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bij een geplande training kunnen maximaal drie Zwift-events staan
              die erbij passen, met een percentage erachter.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Waar het percentage op slaat
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_MATCH_FACTORS.map((factor) => (
                <li key={factor.title} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <strong className="text-foreground">{factor.title}</strong>{" "}
                    {factor.text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Weten we iets niet, dan telt dat punt niet mee in plaats van dat
              het aftrek geeft. Een event scoort dus nooit lager omdat Zwift een
              veld niet meestuurt — het is dan alleen op minder punten
              vergeleken.
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4 text-primary" />
              Goed om te weten
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_MATCH_NOTES.map((note) => (
                <li key={note} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="routevoorstellen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Navigation className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Rondjes voor buiten</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bij een geplande training kun je drie rondjes laten voorstellen
              vanaf je eigen vertrekpunt, afgestemd op de duur, de intensiteit en
              de wind van die dag.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2">
          {OUTDOOR_ROUTE_NOTES.map((note) => (
            <li key={note} className="flex gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="beheer"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Beheer en technische koppelingen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Naslag voor bestuur, communitybeheerders, trainers en teamcaptains.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {ADMIN_GUIDES.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="scroll-mt-20 rounded-md border bg-background p-4"
            >
              <h3 className="text-sm font-semibold">{guide.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {guide.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border bg-card/90 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell className="size-5 text-primary" />
            Meldingen
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pushmeldingen werken als je browser toestemming geeft en je voorkeuren
            onder Profiel aanstaan.
          </p>
          <Link
            href="/profiel#meldingen"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Meldingen instellen
          </Link>
        </article>

        <article className="rounded-lg border bg-card/90 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-primary" />
            Problemen oplossen
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {TROUBLESHOOTING.map((item) => (
              <li key={item} className="flex gap-2">
                <CircleHelp className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
