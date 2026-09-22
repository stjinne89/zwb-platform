import Link from "next/link";
import { BackLink } from "@/components/app-ui";
export default function SegmentHelp() {
  return <article className="mx-auto max-w-3xl space-y-5">
    <BackLink href="/profiel/segments" label="ZWB Segments" />
    <h1 className="text-3xl font-semibold">ZWB Segments</h1>
    <p>De kaart toont buiten gereden racefietssegmenten uit de ingelezen Strava-ritten van goedgekeurde ZWB-leden met een actieve koppeling. Privéritten, privésegmenten, gemarkeerde ritten, e-bikes en indoorritten tellen niet mee. Een segment verschijnt pas als minstens drie ZWB’ers het reden. Zwift en de eerdere collecties staan in een aparte lijst.</p>
    <h2 className="text-xl font-semibold">Record en podium</h2>
    <p>Per lid telt de snelste verstreken tijd. Gelijke tijden delen een positie. De recorddoeltijd is één seconde sneller dan de snelste andere ZWB’er; voor een podium is dat één seconde sneller dan de derde andere ZWB’er. Is er geen clubdoeltijd, bijvoorbeeld omdat je zelf het record hebt of er minder dan drie tegenstanders zijn voor een podium, dan is het doel je eigen record met één seconde te verbeteren. In de details heet dat dan “Doel: eigen record”. Het hoogteprofiel van een segment wordt opgehaald zodra je het opent, als het er nog niet was. De stand is gebaseerd op ingelezen ritten en kan veranderen wanneer oudere ritten worden toegevoegd.</p>
    <h2 className="text-xl font-semibold">ZWB KOM</h2>
    <p>De snelste ZWB’er op een segment met minstens drie ZWB’ers krijgt de titel ZWB KOM, ongeacht geslacht. De snelste vrouw op zo’n segment krijgt daarnaast de titel ZWB QOM, ook als zij daar de enige vrouw is. Daarvoor telt het geslacht op je profiel; kies je “zeg ik liever niet” of laat je het leeg, dan ding je alleen mee naar de KOM. Een vrouw kan dus beide titels hebben. Bij een gelijke snelste tijd delen leden de titel.</p>
    <p>De titels staan op je profiel en op de ledenpagina, onder dezelfde zichtbaarheidsinstelling als je badges. Het dashboard toont titels met een rit uit de afgelopen zeven dagen. Een nieuwe rit of wijziging in het klassement werkt binnen enkele minuten door; een record uit een ouder ingelezen rit komt wel op je profiel, maar niet als nieuw op het dashboard.</p>
    <p>Win je een titel of neemt iemand hem met een snellere rit van je over, dan krijg je een pushmelding. Zet die uit bij meldingen op je profiel. Er komt geen melding voor records uit oudere ritten, en ook niet als je een titel kwijtraakt doordat je rit privé wordt of je koppeling vervalt.</p>
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
