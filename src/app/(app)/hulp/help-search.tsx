"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { helpCategory } from "@/lib/help-categories";

type HelpResult = {
  title: string;
  text: string;
  href: string;
  terms: string;
};

const HELP_INDEX: HelpResult[] = [
  {
    title: "ZWB DS",
    text: "Live raceoverzicht tijdens een Zwift-race: groepen, achterstanden en de ZWB'ers, voor je telefoon of tablet.",
    href: "/hulp/wedstrijden#zwb-ds",
    terms:
      "zwb ds directeur sportif ds live race overzicht raceoverzicht tweede scherm telefoon tablet ipad sauce groepen groep achterstand gat kop koersbalk sprint kom w/kg wkg watt zwift stand bijwerken",
  },
  { title: "ZWBgame", text: "Zwift-racegame: ladder, ZRL, FRR-tour, routes, slipstream, W′, powerups, ploegorders, deelname en sportgegevens.", href: "/hulp/wedstrijden#zwbgame", terms: "game spel wielrennen koers race zwift ladder club ladder uitdagen zrl wtrl puntenrace race of truth scratch ploegentijdrit ttt fal fts leaguepunten frr flamme rouge tour etappe tijdrit klassement egap trui groen bolletjes blauw bezemwagen punten ploeg peloton blob slipstream draft wiel w' w-prime frisheid tactiek powerup veer aerohelm draft boost supertuck sprint kom lead-out breng me terug dagvorm route ronden liggend landschap volledig scherm standen sparen meerijden naar voren aanvallen ftp gewicht wkg kwaliteiten strava intervals spelprofiel toestemming pauzeren hervatten" },
  {
    title: "FRR-tours",
    text: "Etappes en tijdsloten van Flamme Rouge Racing, klassement en renners om in de gaten te houden.",
    href: "/hulp/wedstrijden#teams",
    terms:
      "frr flamme rouge racing tour ignite erupt oblivion etappe tijdslot slot inschrijven zwift klassement gc egap klasse rivalen tegenstanders renners volgen favoriet ster zwiftpower",
  },
  {
    title: "Sunday Race Club",
    text: "De SRC van MyWhoosh: inschrijven, je team per maand en per zondag wie kan.",
    href: "/hulp/wedstrijden#teams",
    terms:
      "src sunday race club mywhoosh whoosh zondag finale kwalificatie inschrijven deadline categorie cat weigh-in teamnaam team maand beschikbaar",
  },
  {
    title: "FTP-test",
    text: "Je trainer plant de test; jij vult de uitslag in en je FTP volgt.",
    href: "/hulp/schema#ftp-test",
    terms:
      "ftp test ramptest ramp 20 minuten twintig minuten drempel vermogen watt meten uitslag testen targetwatts invullen losse test beste minuut intervals eftp corrigeren aanpassen wijzigen verwijderen verkeerd ingevuld fout",
  },
  {
    title: "Strava koppelen",
    text: "OAuth-koppeling voor clubritten, badges, cols, fietsen en trainingscontext.",
    href: "/profiel?weergave=bewerken#strava",
    terms: "strava koppelen sync oauth activiteiten ritten limiet activiteitenrecht opnieuw",
  },
  {
    title: "Strava opnieuw koppelen",
    text: "Los ontbrekend activiteitenrecht op voor ritten, badges en stats.",
    href: "/hulp/koppelen#strava-rechten",
    terms: "strava opnieuw koppelen activiteitenrecht activity read vinkje toestemming ritten badges stats",
  },
  {
    title: "Ritten via intervals.icu",
    text: "Zonder Strava: je Garmin, Wahoo of Zwift via intervals.icu koppelen.",
    href: "/hulp/koppelen#ritten-via-intervals",
    terms:
      "intervals intervals.icu zonder strava geen plek limiet garmin wahoo zwift mywhoosh rouvy hammerhead polar suunto coros ritten ophalen overstappen herinnering slapend account",
  },
  {
    title: "Strava-ritten importeren (CSV, GPX of FIT)",
    text: "Importeer je hele historie (activities.csv) of ritten met spoor (GPX of FIT, meerdere tegelijk) op het dashboard.",
    href: "/hulp/koppelen#strava-import",
    terms:
      "strava export csv activities importeren upload bestand geen koppeling limiet gpx een rit losse rit meerdere bulk archief spoor cols segmenten zwblokken taal geen fietsritten gevonden",
  },
  {
    title: "Doorklikken naar je andere profielen",
    text: "Zwift-ID, Strava en intervals.icu invullen voor knoppen naar ZwiftPower, ZwiftRacing.app, Strava en intervals.",
    href: "/hulp/koppelen#externe-profielen",
    terms:
      "zwiftpower zwiftracing zwift racing app strava intervals icu zwift-id athlete id profiel link knop grijs externe profielen",
  },
  {
    title: "ZWB in je eigen agenda",
    text: "Je aanmeldingen en trainingen in Google Agenda, Outlook of Apple Agenda.",
    href: "/hulp/koppelen#agenda",
    terms:
      "agenda kalender abonnement abonneren ics ical webcal google agenda calendar outlook apple icloud iphone mac thunderbird synchroniseren sync link trainingen aanmeldingen",
  },
  {
    title: "Badges en achievements",
    text: "Weekbadges, milestone badges en badges herberekenen.",
    href: "/hulp/club#badges",
    terms: "badges achievements weekbadges milestone herberekenen strava csv",
  },
  {
    title: "Mijn fietsen en onderhoud",
    text: "Fietsen tonen, handmatig toevoegen en slijtage bijhouden.",
    href: "/hulp/club#mijn-garage",
    terms: "fiets fietsen onderhoud ketting cassette banden remblokken slijtage strava",
  },
  {
    title: "Logboek: hoe je je voelt",
    text: "Voor vrouwelijke leden: houd per dag bij hoeveel last je hebt en waarvan. Alleen jij ziet wat erin staat.",
    href: "/hulp/kennis#logboek",
    terms: "logboek klachten menstruatie cyclus herstel belastbaarheid symptomen privacy",
  },
  {
    title: "Cols, segmenten en records",
    text: "Automatische herkenning, PR's en segmentranglijsten.",
    href: "/hulp/club#cols",
    terms: "cols segmenten records pr ranglijst kom qom zwb kom alpe ventoux stelvio",
  },
  {
    title: "ZWBieb",
    text: "Wie weet wat en wie heeft wat: kennis en uitleenspullen van leden, tips en een vraag stellen in de app.",
    href: "/hulp/club#zwbieb",
    terms: "wie weet wat kennis kenner ervaring onderwerp vraag vragen gesprek bericht berichten tip tips van leden advies hulp gravel bikefit sleutelen banden tubeless zwift racen zwbieb bieb wie heeft wat lenen uitlenen spullen fietskoffer momentsleutel fietsendrager seasucker dakdrager camper werkstandaard leeszaal kennisbank artikel artikelen lezen boeken plank",
  },
  {
    title: "Live volgen met Garmin of Wahoo",
    text: "Garmin: je LiveTrack-mail naar je clubadres. Wahoo: je vaste link koppelen.",
    href: "/hulp/live-volgen#livetrack",
    terms: "garmin wahoo edge elemnt livetrack live track live volgen kaart samen fietsen mail adres ontvangers contact deelinstellingen veiligheid tracking sessiedetails",
  },
  {
    title: "Live tracking instellen",
    text: "OwnTracks, koppellink, locatie-instellingen en controlemodus.",
    href: "/hulp/live-volgen#owntracks",
    terms: "owntracks live gps locatie tracking samen fietsen kaart",
  },
  {
    title: "ZWB als app installeren",
    text: "Zet de webapp op je beginscherm op iOS of Android.",
    href: "/hulp/beginnen#webapp-installeren",
    terms: "app installeren webapp telefoon beginscherm startscherm ios iphone ipad android chrome safari",
  },
  {
    title: "Tijd per zone",
    text: "Gemeten minuten per zone bij een gereden training.",
    href: "/hulp/schema#tijd-per-zone",
    terms: "tijd per zone zones gereden gemeten minuten zonedata geen zonedata intervals garmin wahoo strava vermogen",
  },
  {
    title: "Watt, W/kg of % FTP",
    text: "Vermogen in watt, per kilo of als percentage van je FTP tonen in de trainingsruimte.",
    href: "/hulp/training#watt-wkg",
    terms: "w/kg wkg watt per kilo gewicht vermogen eenheid schakelaar ftp doel procent percentage %ftp weergave",
  },
  {
    title: "Kleuren van de blokken",
    text: "Zonekleuren zoals in Zwift, op je FTP.",
    href: "/hulp/schema#zonekleuren",
    terms: "kleur kleuren zone zones zwift grijs blauw groen geel oranje rood blok balk ftp vermogensmeter",
  },
  {
    title: "Namen van trainingen",
    text: "Rustige en intensieve duur, tempo en sweet spot.",
    href: "/hulp/schema#trainingsvormen",
    terms: "naam namen titel trainingsvorm rustige duur intensieve duur extensieve tempo sweet spot sweetspot drempel kernwerk zwbeter worden intervals zwift",
  },
  {
    title: "Welke warming-up bij welke wedstrijd",
    text: "Vijf warming-ups, met bursts van 6 seconden.",
    href: "/hulp/schema#warming-up",
    terms: "warming-up warmup warm up inrijden opwarmen burst bursts sprint opener tijdrit tt ttt ploegentijdrit scratch puntenrace zrl race wedstrijd start",
  },
  {
    title: "Trainingsdoel en je schema",
    text: "Max. trainingsuren per week, beschikbare dagen en een dag aanpassen.",
    href: "/hulp/schema#trainingsschema",
    terms: "trainingsdoel doel schema uren per week max uren beschikbare dagen rustdag rustdagen hersteltraining herstelrit rustig fietsen aanpassen ai",
  },
  {
    title: "Jaarplan: mikpunten en periodes",
    text: "A-, B- en C-doelen, vakanties, drukke periodes en trainingskampen, en wat ze met je schema doen.",
    href: "/hulp/schema#jaarplan",
    terms:
      "jaarplan jaarplanning seizoen mikpunt mikpunten a-doel b-doel c-doel prioriteit piek rustperiode rust rustig vakantie winterstop drukke periode tijdlijn weg asfalt hek paaltje stippellijn grind finish clubevent kalender misschien event koppelen vlaggetje prioriteit wijzigen dubbel lijst mikpunt verwijderen bewerken verschuiven verplaatsen datum wijzigen trainingskamp kamp stage volume melding waarschuwing",
  },
  {
    title: "Waarom een schema hooguit twaalf weken loopt",
    text: "Blokken van twaalf weken, het volgende blok klaarzetten, en de bronnen.",
    href: "/hulp/schema#blokken",
    terms:
      "blok blokken twaalf weken 12 weken drie maanden 3 maanden schema lengte duur kort stopt eindigt einde afgelopen volgend blok klaarzetten verlengen doorgaan doel ver weg start schema nieuw schema trainer a-doel intervals intervals.icu koppelen concept opbouw periodisering bron bronnen onderzoek friel waarom",
  },
  {
    title: "Uitgangspunten: wat je schema meeweegt",
    text: "Waarop je schema is gemaakt, je persoonlijke voorkeuren en de vaste regels.",
    href: "/hulp/schema#uitgangspunten",
    terms:
      "uitgangspunten voorkeur voorkeuren persoonlijk meegewogen meewegen waarom schema prompt regels vaste regels onthoud onthouden motivatie intensief intensiever races duur trainer aanvullen coachchat herziening tsb herstel opbouw herstelweek",
  },
  {
    title: "Voor trainers: schema's vergelijken",
    text: "Blind kiezen tussen het schema van de AI en dat van de regelmotor.",
    href: "/hulp/schema#vergelijken",
    terms: "vergelijken trainer regelmotor motor ai blind a b beter gelijk oordeel schema keuze",
  },
  {
    title: "Doeltype en de laatste weken",
    text: "Waarom een gran fondo wel een taper krijgt en basisconditie of ZRL niet.",
    href: "/hulp/schema#doeltype",
    terms:
      "doeltype taper piek pieken laatste weken basisconditie base fitness ftp herstel opbouw rebuild zrl ladder gran fondo outdoor event targetdatum afbouwen volume",
  },
  {
    title: "Training en intervals.icu",
    text: "Trainingsdashboard, hersteldata, workouts en trainer-toegang.",
    href: "/hulp/training#trainingsruimte",
    terms: "training intervals icu herstel form workout trainer vermogen wahoo garmin",
  },
  {
    title: "Pacingplan bij een event",
    text: "Vermogen per stuk van het parcours, basisvoorstel, AI en neutralisatie.",
    href: "/hulp/racen#pacing",
    terms: "pacing pacingplan verdeling vermogen w/kg klim klimmen event gran fondo neutralisatie neutraal wagen verouderd doorrekenen reserve afdaling afdalen uitrollen knippen splitsen samenvoegen stukken indeling eindtijd doeltijd finishtijd tijd haalbaar",
  },
  {
    title: "Pacingplan voor een Zwift-wedstrijd",
    text: "Format, fiets, slipstream, wegdek, start, sprint en powerups.",
    href: "/hulp/racen#pacing-zwift",
    terms: "zwift wedstrijd race tijdrit ploegentijdrit ttt drafting slipstream groep alleen fiets frame wielen upgrade stage gravel onverhard wegdek powerup veer aerohelm draft boost stoomwals aambeeld sprint start zwiftinsider",
  },
  {
    title: "Krachtreeksen",
    text: "Kracht met eigen gewicht, thuis met gewicht, zwaar in de sportschool, en springen voor je botten.",
    href: "/hulp/kennis#kracht",
    terms:
      "kracht krachttraining springen sprongen botten botdichtheid squat lunge step-up benen bilspieren klimmen eenbenig rustdag spierpijn gym sportschool halter halterstang leg press kabel dumbbell kettlebell weerstandsband band zwaar herhalingen opbouw onderhoud",
  },
  {
    title: "ZWBeter racen",
    text: "Analyse van een gereden Zwift-race (ZRL, FRR of een geplakte link): tips, de ploeg of je eigen race, en je rit.",
    href: "/hulp/racen#racen",
    terms:
      "racen race analyse zrl frr flamme rouge etappe tijdslot klassement tijdrit itt link plakken zwiftpower ploegentijdrit ttt puntenrace uitslag ploegtijd tegenstander verloop tussentijd segment sprint klim kom vermogen w/kg zwiftpower los gelost eigen rit bestand np genormaliseerd intensiteit if w-balans wbal critical power hartslag cadans curve",
  },
  {
    title: "Protocollen",
    text: "Hitte, lage cadans, ademspiertraining, duurtest en supplementen: starten, afvinken en de grenzen.",
    href: "/hulp/kennis#protocollen",
    terms:
      "protocol protocollen kracht op de fiets torque duurtest duurvermogen ontkoppeling decoupling durability hitte hittetraining warmte acclimatisatie heet bad core sensor kerntemperatuur lichaamstemperatuur hemoglobine lage cadans toeren torque vo2max ademspiertraining ademtrainer supplement supplementen cafeine bicarbonaat natriumbicarbonaat nitraat bietensap ijsslush koolhydraten laden beta-alanine creatine darmtraining 150 gram per uur glycerol kersensap kersen herstel herstelshake eiwitshake eiwit vitamine d collageen gelatine pees blessure visolie omega-3 probiotica magnesium kramp bcaa cbd curcumine menthol mondspoelen zink vitamine c dosis gewicht nzvt kennisbank taper blokweek blokperiodisering 30/15 brain endurance concentratie stroop mentale vermoeidheid veelbelovend experimenteel bewijs bewijsniveau sterk bewijs matig bewijs beperkt bewijs afgeraden meta-analyse snelle start sprint onderhoud overgangsperiode bloedstroombeperking bfr occlusie",
  },
  {
    title: "Voeding",
    text: "Kennisbank met bronnen, een dagmenu met recepten op maat, een dagelijkse tip en een eetdagboek.",
    href: "/hulp/kennis#voeding",
    terms:
      "voeding eten koolhydraten eiwit recept recepten menu dagmenu naleving eetdagboek gegeten bijhouden favoriet delen gel sportdrank herstel nevo reds supplementen cafeine hydratatie drinken zout calcium ijzer vezels",
  },
  {
    title: "ZWBeter materiaal",
    text: "Kennisbank over materiaal en kleine winsten, met een rekenaar.",
    href: "/hulp/kennis#materiaal",
    terms:
      "materiaal aero aerodynamica luchtweerstand cda houding helm kleding skinsuit pak sokken aero-sokken overschoenen wielen frame banden bandenspanning tubeless rolweerstand ketting wax smeren gewicht ventilator fan vermogensmeter powermeter smart trainer kalibreren bikefit zadelhoogte schoenplaatjes cranklengte cranks neusstrips compressie inlegzolen rekenaar watt seconden marginal gains",
  },
  {
    title: "Core & mobiliteit",
    text: "Korte series naast de fiets, zelf afvinken, los van je trainingsbelasting.",
    href: "/hulp/kennis#core-mobiliteit",
    terms:
      "core mobiliteit stabiliteit rug rugpijn onderrug plank stretchen rekken heup hamstring houding zithouding oefeningen serie afvinken kennisbank bronnen onderbouwing onderzoek literatuur vandaag series",
  },
  {
    title: "Figuur en spierkaart",
    text: "Wat de kleuren in het figuur en op de spierkaart betekenen.",
    href: "/hulp/kennis#spiergroepen",
    terms:
      "spiergroep spiergroepen spieren spierkaart figuur poppetje animatie kleur getraind deze week bilspieren quadriceps hamstrings kuiten buik",
  },
  {
    title: "ZWBeter Worden-samenvatting in Strava",
    text: "Het blokje dat na een rit onderaan je Strava-omschrijving komt.",
    href: "/hulp/training#strava-samenvatting",
    terms:
      "strava omschrijving beschrijving samenvatting join ctl gereedscore workout score tss fitness status opnieuw koppelen",
  },
  {
    title: "Workout op fietscomputer",
    text: "FIT-export, Wahoo-koppeling en Garmin-import.",
    href: "/hulp/workouts#fit-export",
    terms: "fit export fietscomputer wahoo garmin elemnt bolt roam workout",
  },
  {
    title: "Rondjes voor buiten",
    text: "Routevoorstellen vanaf je eigen vertrekpunt, met de wind mee naar huis.",
    href: "/hulp/workouts#routevoorstellen",
    terms:
      "route rondje buitenrit buiten gpx vertrekpunt thuis kaart wind tegenwind meewind komoot afstand hoogtemeters voorstel",
  },
  {
    title: "Zwift-events bij je training",
    text: "Passende Zwift-events bij een geplande training, met een percentage.",
    href: "/hulp/workouts#zwift-voorstellen",
    terms:
      "zwift event voorstel suggestie passend percentage match groepsrit group ride race pacegroep wkg categorie populariteit inschrijven",
  },
  {
    title: "Workout in Zwift",
    text: "Zwift koppelen aan intervals.icu, dan staat je training vanzelf klaar.",
    href: "/hulp/workouts#zwift-workout",
    terms:
      "zwift koppelen connect indoor trainer workout training zwo custom intervals icu ftp percentage smart",
  },
  {
    title: "Events en RSVP",
    text: "Kalender, routes, GPX, liveticker en aanmelden.",
    href: "/hulp/wedstrijden#events",
    terms: "event kalender rsvp route gpx aanmelden aangemeld liveticker voor mij filter verborgen ja nee misschien",
  },
  {
    title: "Verjaardagsrondje",
    text: "Een verjaardagsrit plannen en aanmelden bij andere leden.",
    href: "/hulp/club#verjaardagsrondje",
    terms: "verjaardag verjaardagsrondje aanmelden rit jarig",
  },
  {
    title: "ZWBlokken",
    text: "De blokkenkaart: waar heb jij en waar heeft de club al gereden?",
    href: "/hulp/club#zwblokken",
    terms:
      "zwblokken blokken kaart heatmap verkennen gebied squadrats tegels ontdekken koning koningin vorst gouverneur titel provincie deelstaat zwift watopia makuri france london new york virtueel",
  },
  {
    title: "Privacy en zichtbaarheid",
    text: "Profielvelden, live tracking en trainer-data delen.",
    href: "/hulp/club#privacy",
    terms: "privacy zichtbaarheid profiel live tracking trainer toestemming",
  },
  {
    title: "Beheer",
    text: "Events, achievements, teams, rollen, media en technische koppelingen.",
    href: "/hulp/beheer#beheer",
    terms: "beheer admin rollen rechten achievements events teams media notificaties strava sync",
  },
  {
    title: "Strava-sync beheren",
    text: "Leden zonder ritten syncen en badges + cols herberekenen.",
    href: "/hulp/beheer#stravabeheer",
    terms: "beheer admin strava sync leden ritten statistieken activiteitenrecht badges cols herberekenen",
  },
  {
    title: "Problemen oplossen",
    text: "Snelle checks voor badges, live tracking, trainingen en rechten.",
    href: "/hulp/problemen#problemen",
    terms: "probleem oplossen werkt niet badges live trainingen rechten fout",
  },
];

/** De hulpcategorie waar een resultaat staat, voor onder de titel. */
function categoryLabel(href: string) {
  const match = href.match(/^\/hulp\/([a-z-]+)/);
  return match ? helpCategory(match[1])?.label ?? null : null;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function HelpSearch() {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query.trim());
  const results = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return HELP_INDEX.filter((item) =>
      normalize(`${item.title} ${item.text} ${item.terms}`).includes(
        normalizedQuery,
      ),
    ).slice(0, 8);
  }, [normalizedQuery]);

  return (
    <section className="rounded-lg border bg-card/90 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op Strava, badges, OwnTracks..."
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {normalizedQuery.length >= 2 && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen resultaten.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((result) => (
                <li key={result.href}>
                  <Link
                    href={result.href}
                    className="block rounded-md border bg-background p-3 transition hover:border-primary/40"
                  >
                    <span className="text-sm font-semibold">{result.title}</span>
                    {categoryLabel(result.href) && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {categoryLabel(result.href)}
                      </span>
                    )}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {result.text}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
