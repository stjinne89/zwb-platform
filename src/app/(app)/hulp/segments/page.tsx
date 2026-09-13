import Link from "next/link";
export default function SegmentHelp() {
  return <article className="mx-auto max-w-3xl space-y-5">
    <Link href="/profiel/segments" className="text-sm underline">Terug naar ZWB Segments</Link>
    <h1 className="text-3xl font-semibold">ZWB Segments</h1>
    <p>De kaart toont buiten gereden racefietssegmenten uit de ingelezen Strava-ritten van goedgekeurde ZWB-leden met een actieve koppeling. Privéritten, verborgen pogingen, gemarkeerde ritten, e-bikes en indoorritten tellen niet mee. Zwift en de eerdere collecties staan in een aparte lijst.</p>
    <h2 className="text-xl font-semibold">Record en podium</h2>
    <p>Per lid telt de snelste verstreken tijd. Gelijke tijden delen een positie. De recorddoeltijd is één seconde sneller dan de snelste andere ZWB’er; voor een podium is dat één seconde sneller dan de derde andere ZWB’er. Bij minder dan drie tegenstanders ontbreekt een podiumdoeltijd. De stand is gebaseerd op ingelezen ritten en kan veranderen wanneer oudere ritten worden toegevoegd.</p>
    <h2 className="text-xl font-semibold">Persoonlijke inschatting</h2>
    <p>De berekening gebruikt je intervals.icu-vermogenscurve over 90 dagen, je profielgewicht, het hoogteprofiel en de wind bij het gekozen vertrekuur. Werk je gewicht bij op je profiel. Bij ontbrekende gegevens wordt geen haalbaarheid berekend.</p>
    <p>We rekenen met solo rijden op een racefiets, 9 kg fiets en uitrusting, CdA 0,32 m², rolweerstandscoëfficiënt 0,005 en 97% aandrijvingsefficiëntie. Het vermogen past bij de berekende inspanningsduur. Er wordt niet buiten je beschikbare curve geëxtrapoleerd.</p>
    <p>De tijdband varieert luchtweerstand en windsterkte elk met 20%. Dit is een gevoeligheidsanalyse, geen statistische kans. Bochten, verkeer, wegdek, beschutting, vermoeidheid en stayeren zijn niet gemodelleerd. Een poging kan daardoor buiten de getoonde band vallen. Gevaarlijke segmenten en berekeningen buiten het modelbereik krijgen geen bekerinschatting.</p>
    <ul className="list-disc space-y-2 pl-5"><li>Goud: ook de langzame modelvariant haalt het doel.</li><li>Teal: het doel valt binnen de modelband.</li><li>Gedempt petrol: de snelle modelvariant haalt het doel niet.</li><li>Neutraal: er zijn onvoldoende gegevens.</li></ul>
    <h2 className="text-xl font-semibold">Kaart en filters</h2>
    <p>Kaart en lijst gebruiken hetzelfde gebied en dezelfde filters. De lijst toont maximaal 40 segmenten per pagina. Met een kansenfilter worden de passende segmenten binnen die batch getoond; gebruik Volgende om verder te zoeken. Clusters tonen aantallen en zoomen in bij aanklikken. De start heeft een grotere stip dan de finish. Zonder segmentlijn is alleen de start zichtbaar.</p>
    <p>De weerverwachting geldt voor het startgebied van het segment, afgerond op 0,1 graad, en het gekozen uur. De wind wordt voor elke rijrichting langs het segment doorgerekend. Er is geen automatische terugval op windstil weer.</p>
    <h2 className="text-xl font-semibold">Gegevens bijwerken</h2>
    <p>Nieuwe Strava-ritten leveren segmentpogingen via de bestaande synchronisatie. Beheer kan ontbrekende historische ritdetails en segmentprofielen in kleine batches aanvullen. Intrekken van de koppeling of verwijderen van een rit werkt door in het clubklassement.</p>
    <Link href="/privacy" className="inline-block underline">Privacyverklaring</Link>
  </article>;
}
