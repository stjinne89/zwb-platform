// De kennisbank materiaal en kleine winsten (2026-10-18).
//
// Zelfde opzet als de kennisbanken trainen, voeding en kracht: in code, zodat
// elke bewering en elke bron via een commit gaat. Het onderzoek staat in
// docs/materiaal-onderzoek-2026-10-17.md, het niveau per artikel in
// docs/beoordelingsbeleid-bewijsniveau.md; een test houdt code en tabel gelijk.
// Teksten zijn eigen samenvattingen; we citeren de bronnen niet letterlijk. Van
// de meeste bronnen is de samenvatting gelezen, van een deel (via de
// onderzoeksagent van Consensus) ook de volle tekst.
//
// Anders dan bij de andere kennisbanken:
// - Veel bronnen zijn metingen (windtunnel, testbank, veld): bronsoort "meting".
//   Alleen een pop, testbank of computermodel is hooguit Onderbouwd.
// - De kennisbank noemt geen merken en geeft geen koopadvies. Een merknaam staat
//   alleen in een bronvermelding; merken met testcijfers staan in de rekenaar
//   (producttests.ts).

import type { ArticleConclusion, ArticleEvidence } from "@/lib/knowledge/evidence";
import { doi, type KnowledgeSource } from "@/lib/knowledge/source";

export const MATERIAAL_CATEGORIES = ["lucht", "rollen", "binnen", "lichaam", "klein"] as const;
export type MateriaalCategory = (typeof MATERIAAL_CATEGORIES)[number];

export const MATERIAAL_CATEGORY_LABELS: Record<MateriaalCategory, string> = {
  lucht: "Lucht",
  rollen: "Rollen en aandrijving",
  binnen: "Binnen fietsen",
  lichaam: "Lichaam en fiets",
  klein: "Kleine middelen",
};

export type MateriaalArticle = {
  slug: string;
  category: MateriaalCategory;
  /** Hoe gegrond de conclusie is; zie src/lib/knowledge/evidence.ts. */
  evidence: ArticleEvidence;
  /** "geen-effect" of "nadelig" als de conclusie is dat iets niet helpt; staat in de badge. */
  conclusion?: ArticleConclusion;
  title: string;
  summary: string;
  points: string[];
  /** Wat de bronnen níét laten zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  sources: KnowledgeSource[];
};

// Rekenmodel
const MARTIN_1998: KnowledgeSource = {
  citation:
    "Martin JC, Milliken DL, Cobb JE, McFadden KL, Coggan AR. Validation of a mathematical model for road cycling power. J Appl Biomech 14(3):276-291.",
  year: 1998,
  url: doi("10.1123/jab.14.3.276"),
  kind: "studie",
};
const OLDS_1995: KnowledgeSource = {
  citation: "Olds TS, Norton KI, Lowe EL, et al. Modeling road-cycling performance. J Appl Physiol 78(4):1596-1611.",
  year: 1995,
  url: doi("10.1152/jappl.1995.78.4.1596"),
  kind: "studie",
};
const DAHMEN_2011: KnowledgeSource = {
  citation:
    "Dahmen T, Byshko R, Saupe D, Röder M, Mantler S. Validation of a model and a simulator for road cycling on real tracks. Sports Eng 14:95-110.",
  year: 2011,
  url: doi("10.1007/s12283-011-0076-1"),
  kind: "meting",
};
const DEBRAUX_2011: KnowledgeSource = {
  citation:
    "Debraux P, Grappe F, Manolova AV, Bertucci W. Aerodynamic drag in cycling: methods of assessment. Sports Biomech 10(3):197-218.",
  year: 2011,
  url: doi("10.1080/14763141.2011.592209"),
  kind: "review",
};
const JEUKENDRUP_MARTIN_2001: KnowledgeSource = {
  citation:
    "Jeukendrup AE, Martin J. Improving cycling performance: how should we spend our time and money. Sports Med 31(7):559-569.",
  year: 2001,
  url: doi("10.2165/00007256-200131070-00009"),
  kind: "review",
};

// Lucht
const GARCIA_LOPEZ_2008: KnowledgeSource = {
  citation:
    "García-López J, Rodríguez-Marroyo JA, Juneau CE, et al. Reference values and improvement of aerodynamic drag in professional cyclists. J Sports Sci 26(3):277-286.",
  year: 2008,
  url: doi("10.1080/02640410701501697"),
  kind: "meting",
};
const BARRY_2015: KnowledgeSource = {
  citation:
    "Barry N, Burton D, Sheridan J, Thompson M, Brown NAT. Aerodynamic performance and riding posture in road cycling and triathlon. Proc Inst Mech Eng P J Sports Eng Technol.",
  year: 2015,
  url: doi("10.1177/1754337114549876"),
  kind: "meting",
};
const MERKES_2019: KnowledgeSource = {
  citation:
    "Merkes PFJ, Menaspà P, Abbiss CR. Reducing aerodynamic drag by adopting a novel road-cycling sprint position. Int J Sports Physiol Perform.",
  year: 2019,
  url: doi("10.1123/ijspp.2018-0560"),
  kind: "meting",
};
const LIM_2011: KnowledgeSource = {
  citation:
    "Lim AC, et al. Measuring changes in aerodynamic/rolling resistances by cycle-mounted power meters. Med Sci Sports Exerc 43(5):853-860.",
  year: 2011,
  url: doi("10.1249/MSS.0b013e3181fcb140"),
  kind: "meting",
};
const UNDERWOOD_2015: KnowledgeSource = {
  citation:
    "Underwood L, Eloi P, Cornillon G. Helmet position, ventilation holes and drag in cycling. Sports Eng 18:241-248.",
  year: 2015,
  url: doi("10.1007/s12283-015-0181-7"),
  kind: "meting",
};
const NOVAK_2019: KnowledgeSource = {
  citation:
    "Novak JI, Burton D, Crouch T. Aerodynamic test results of bicycle helmets in different configurations: towards a responsive design. Proc Inst Mech Eng P J Sports Eng Technol.",
  year: 2019,
  url: doi("10.1177/1754337118822613"),
  kind: "meting",
};
const BEAUMONT_2018: KnowledgeSource = {
  citation: "Beaumont F, et al. Aerodynamic study of time-trial helmets in cycling racing using CFD analysis. J Biomech.",
  year: 2018,
  url: doi("10.1016/j.jbiomech.2017.10.042"),
  kind: "studie",
};
const BROWNLIE_2009: KnowledgeSource = {
  citation:
    "Brownlie L, et al. Streamlining the time trial apparel of cyclists: the Nike Swift Spin project. Sports Technol.",
  year: 2009,
  url: doi("10.1080/19346182.2009.9648499"),
  kind: "meting",
};
const OGGIANO_2009: KnowledgeSource = {
  citation:
    "Oggiano L, et al. Aerodynamic behaviour of single sport jersey fabrics with different roughness and cover factors. Sports Eng.",
  year: 2009,
  url: doi("10.1007/s12283-009-0029-0"),
  kind: "meting",
};
const MIAU_2021: KnowledgeSource = {
  citation: "Miau J, et al. A study of drag reduction with textile roughness on a cyclist model. J Text Inst 113:1206-1230.",
  year: 2021,
  url: doi("10.1080/00405000.2021.1950978"),
  kind: "meting",
};
const BROWN_2023: KnowledgeSource = {
  citation: "Brown C, et al. The influence of turbulence on cycling aerodynamics. J Wind Eng Ind Aerodyn.",
  year: 2023,
  url: doi("10.1016/j.jweia.2023.105575"),
  kind: "meting",
};
const GIBERTINI_2010: KnowledgeSource = {
  citation: "Gibertini G, Grassi D, Macchi C, De Bortoli G. Cycling shoe aerodynamics. Sports Eng 12:155-161.",
  year: 2010,
  url: doi("10.1007/s12283-010-0037-0"),
  kind: "meting",
};
const GREENWELL_1995: KnowledgeSource = {
  citation:
    "Greenwell DI, Wood NJ, Bridge EKL, Addy RJ. Aerodynamic characteristics of low-drag bicycle wheels. Aeronaut J 99:109-120.",
  year: 1995,
  url: doi("10.1017/s0001924000028281"),
  kind: "meting",
};
const MALIZIA_2021_WIEL: KnowledgeSource = {
  citation:
    "Malizia F, Blocken B. Impact of wheel rotation on the aerodynamic drag of a time trial cyclist. Sports Eng 24:1-14.",
  year: 2021,
  url: doi("10.1007/s12283-021-00341-6"),
  kind: "meting",
};
const MALIZIA_2020: KnowledgeSource = {
  citation:
    "Malizia F, Blocken B. Bicycle aerodynamics: history, state-of-the-art and future perspectives. J Wind Eng Ind Aerodyn 200:104134.",
  year: 2020,
  url: doi("10.1016/j.jweia.2020.104134"),
  kind: "review",
};
const MAO_2025: KnowledgeSource = {
  citation: "Mao J, Zhou P, Yi W, Zhang X. Aerodynamic characterisation of isolated cycling wheels. Exp Therm Fluid Sci.",
  year: 2025,
  url: doi("10.1016/j.expthermflusci.2025.111423"),
  kind: "meting",
};

// Rollen en aandrijving
const GRAPPE_1999: KnowledgeSource = {
  citation:
    "Grappe F, et al. Influence of tyre pressure and vertical load on coefficient of rolling resistance and simulated cycling performance. Ergonomics.",
  year: 1999,
  url: doi("10.1080/001401399185009"),
  kind: "meting",
};
const HENCHOZ_2010: KnowledgeSource = {
  citation: "Henchoz Y, et al. A new method to measure rolling resistance in treadmill cycling. J Sports Sci.",
  year: 2010,
  url: doi("10.1080/02640414.2010.498483"),
  kind: "meting",
};
const BERTUCCI_2013: KnowledgeSource = {
  citation:
    "Bertucci WM, Rogier S, Reiser RF. Evaluation of aerodynamic and rolling resistances in mountain-bike field conditions. J Sports Sci 31:1606-1613.",
  year: 2013,
  url: doi("10.1080/02640414.2013.792945"),
  kind: "meting",
};
const MAIER_2019: KnowledgeSource = {
  citation:
    "Maier T, Müller B, Allemann R, Steiner T, Wehrlin JP. Influence of wheel rim width on rolling resistance and off-road speed in cross-country mountain biking. J Sports Sci 37:833-838.",
  year: 2019,
  url: doi("10.1080/02640414.2018.1530057"),
  kind: "meting",
};
const TURNER_2024: KnowledgeSource = {
  citation: "Turner M. Cycling on rough roads: a model for resistance and vibration. Veh Syst Dyn 62:2729-2749.",
  year: 2024,
  url: doi("10.1080/00423114.2024.2304031"),
  kind: "studie",
};
const CRENNA_2025: KnowledgeSource = {
  citation:
    "Crenna F, Belotti V, Colò A, Morettini S, Tenerini L. A measurement system to characterize the effects of tires on bicycle vibrations. Eng.",
  year: 2025,
  url: doi("10.3390/eng6090245"),
  kind: "meting",
};
const SPICER_2001: KnowledgeSource = {
  citation:
    "Spicer JB, Richardson CJK, Ehrlich MJ, Bernstein JR, Fukuda M, Terada M. Effects of frictional loss on bicycle chain drive efficiency. J Mech Des 123(4):598-605.",
  year: 2001,
  url: doi("10.1115/1.1412848"),
  kind: "meting",
};
const SMIT_2023: KnowledgeSource = {
  citation:
    "Smit A, van der Zwaard S, Janssen I, Janssen TWJ. Power loss of the chain drive in a race tandem bicycle. Sports Eng 26:1-8.",
  year: 2023,
  url: doi("10.1007/s12283-023-00439-z"),
  kind: "meting",
};
const DOWD_2026: KnowledgeSource = {
  citation: "Dowd T, Cavanaugh P, Mansson J. Lubricant performance in bicycle roller chains. Sports Eng 29.",
  year: 2026,
  url: doi("10.1007/s12283-025-00529-0"),
  kind: "meting",
};
const LANASPEZE_2025: KnowledgeSource = {
  citation:
    "Lanaspeze G, et al. Identification of key parameter influence on efficiency of chain drive for track cycling: preliminary results. Mech Ind.",
  year: 2025,
  url: doi("10.1051/meca/2025013"),
  kind: "meting",
};
const AUBERT_2023: KnowledgeSource = {
  citation:
    "Aubert R, Roizard X, Grappe F, Lallemand F. Tribological devices in cycling: a review. Proc Inst Mech Eng P J Sports Eng Technol.",
  year: 2023,
  url: doi("10.1177/17543371231202562"),
  kind: "review",
};

// Binnen
const OTANI_2018: KnowledgeSource = {
  citation:
    "Otani H, et al. Air velocity influences thermoregulation and endurance exercise capacity in the heat. Appl Physiol Nutr Metab.",
  year: 2018,
  url: doi("10.1139/apnm-2017-0448"),
  kind: "studie",
};
const BRIGHT_2023: KnowledgeSource = {
  citation:
    "Bright FM, et al. Influence of air velocity on self-paced exercise performance in hot conditions. Med Sci Sports Exerc.",
  year: 2023,
  url: doi("10.1249/MSS.0000000000003168"),
  kind: "studie",
};
const MORRISON_2014: KnowledgeSource = {
  citation:
    "Morrison SA, Cheung SS, Cotter JD. Importance of airflow for physiologic and ergogenic effects of precooling. J Athl Train 49(5):632-639.",
  year: 2014,
  url: doi("10.4085/1062-6050-49.3.27"),
  kind: "studie",
};
const FERNANDEZ_2022: KnowledgeSource = {
  citation:
    "Fernández A, et al. Fan cooling improves submaximal exercise capacity in an indoor thermoneutral environment. Res Q Exerc Sport.",
  year: 2022,
  url: doi("10.1080/02701367.2021.1946467"),
  kind: "studie",
};
const BOUILLOD_2022: KnowledgeSource = {
  citation:
    "Bouillod A, Soto-Romero G, Grappe F, Bertucci W, Brunet E, Cassirame J. Caveats and recommendations to assess the validity and reliability of cycling power meters: a systematic scoping review. Sensors 22(1):386.",
  year: 2022,
  url: doi("10.3390/s22010386"),
  kind: "review",
};
const MAIER_2017: KnowledgeSource = {
  citation:
    "Maier T, et al. Accuracy of cycling power meters against a mathematical model of treadmill cycling. Int J Sports Med.",
  year: 2017,
  url: doi("10.1055/s-0043-102945"),
  kind: "meting",
};
const GARDNER_2004: KnowledgeSource = {
  citation:
    "Gardner AS, Stephens S, Martin DT, Lawton E, Lee H, Jenkins D. Accuracy of SRM and Power Tap power monitoring systems for bicycling. Med Sci Sports Exerc 36(7):1252-1258.",
  year: 2004,
  url: doi("10.1249/01.MSS.0000132380.21785.03"),
  kind: "meting",
};
const BOUILLOD_2017: KnowledgeSource = {
  citation:
    "Bouillod A, Pinot J, Soto-Romero G, Bertucci W, Grappe F. Validity, sensitivity, reproducibility, and robustness of the PowerTap, Stages, and Garmin Vector power meters in comparison with the SRM device. Int J Sports Physiol Perform.",
  year: 2017,
  url: doi("10.1123/ijspp.2016-0436"),
  kind: "meting",
};
const HOON_2016: KnowledgeSource = {
  citation: "Hoon MW, et al. A comparison of the accuracy and reliability of the Wahoo KICKR and SRM power meter. J Sci Cycling 5(3).",
  year: 2016,
  url: doi("10.28985/jsc.v5i3.240"),
  kind: "meting",
};
const LILLO_BEVIA_2017: KnowledgeSource = {
  citation: "Lillo-Beviá JR, Pallarés JG. Validity and reliability of the Cycleops Hammer cycle ergometer. Int J Sports Physiol Perform.",
  year: 2017,
  url: doi("10.1123/ijspp.2017-0403"),
  kind: "meting",
};
const COSTA_2026: KnowledgeSource = {
  citation:
    "Costa V, Johann PM, Reche PM, Rodrigues AI. Reliability of Cyclotronics smart trainer power output in trained cyclists. J Sci Cycling.",
  year: 2026,
  url: doi("10.28985/1526.jsc.02"),
  kind: "meting",
};

// Lichaam en fiets
const BINI_2021: KnowledgeSource = {
  citation:
    "Bini RR, Priego-Quesada JI. Methods to determine saddle height in cycling and implications of changes in saddle height in performance and injury risk: a systematic review. J Sports Sci 40:386-400.",
  year: 2021,
  url: doi("10.1080/02640414.2021.1994727"),
  kind: "review",
};
const VISENTINI_2022: KnowledgeSource = {
  citation: "Visentini P, et al. Factors associated with overuse injury in cyclists: a systematic review. J Sci Med Sport.",
  year: 2022,
  url: doi("10.1016/j.jsams.2021.12.008"),
  kind: "review",
};
const HUSBAND_2024: KnowledgeSource = {
  citation:
    "Husband SP, Wainwright B, Wilson F, et al. Cycling position optimisation – a systematic review of the impact of positional changes on biomechanical and physiological factors in cycling. J Sports Sci 42:1477-1490.",
  year: 2024,
  url: doi("10.1080/02640414.2024.2394752"),
  kind: "review",
};
const PRIEGO_QUESADA_2019: KnowledgeSource = {
  citation:
    "Priego Quesada JI, et al. The association of bike fitting with injury, comfort, and pain during cycling: an international retrospective survey. Eur J Sport Sci.",
  year: 2019,
  url: doi("10.1080/17461391.2018.1556738"),
  kind: "studie",
};
const SCOZ_2021: KnowledgeSource = {
  citation:
    "Scoz RD, et al. Discomfort, pain and fatigue levels of 160 cyclists after a kinematic bike-fitting method: an experimental study. BMJ Open Sport Exerc Med 7.",
  year: 2021,
  url: doi("10.1136/bmjsem-2021-001096"),
  kind: "studie",
};
const HOYT_2025: KnowledgeSource = {
  citation:
    "Hoyt ET, Ruegsegger GN. Idmatch bike fitting enhances power output in recreational cyclists: a pilot study. Int J Exerc Sci 18:864-880.",
  year: 2025,
  url: doi("10.70252/cmdy5909"),
  kind: "studie",
};
const CHARTOGNE_2016: KnowledgeSource = {
  citation:
    "Chartogne M, Duc S, Bertucci W. Effect of shoes cleat position on physiological and biomechanical variables of cycling performance. J Sci Cycling 5(2).",
  year: 2016,
  url: doi("10.28985/jsc.v5i2.255"),
  kind: "studie",
};
const INBAR_1983: KnowledgeSource = {
  citation: "Inbar O, Dotan R, Trousil T, Dvir Z. The effect of bicycle crank-length variation upon power performance. Ergonomics 26.",
  year: 1983,
  url: doi("10.1080/00140138308963449"),
  kind: "studie",
};
const MARTIN_2001: KnowledgeSource = {
  citation:
    "Martin JC, Spirduso WW. Determinants of maximal cycling power: crank length, pedaling rate and pedal speed. Eur J Appl Physiol.",
  year: 2001,
  url: doi("10.1007/s004210100400"),
  kind: "studie",
};
const BARRATT_2011: KnowledgeSource = {
  citation:
    "Barratt PR, Korff T, Elmer SJ, Martin JC. Effect of crank length on joint-specific power during maximal cycling. Med Sci Sports Exerc.",
  year: 2011,
  url: doi("10.1249/MSS.0b013e3182125e96"),
  kind: "studie",
};
const FERRER_ROCA_2017: KnowledgeSource = {
  citation:
    "Ferrer-Roca V, et al. Acute effects of small changes in crank length on gross efficiency and pedalling technique during submaximal cycling. J Sports Sci.",
  year: 2017,
  url: doi("10.1080/02640414.2016.1215490"),
  kind: "studie",
};
const LI_2025: KnowledgeSource = {
  citation:
    "Li JS, et al. Effects of crank length on cycling efficiency, sprint performance, and perceived fatigue in high-level amateur road cyclists. J Exerc Sci Fit.",
  year: 2025,
  url: doi("10.1016/j.jesf.2025.100384"),
  kind: "studie",
};

// Kleine middelen
const DINARDI_2020: KnowledgeSource = {
  citation:
    "Dinardi RR, et al. Does the external nasal dilator strip help in sports activity? A systematic review and meta-analysis. Eur Arch Otorhinolaryngol.",
  year: 2020,
  url: doi("10.1007/s00405-020-06202-5"),
  kind: "review",
};
const ADAMS_2017: KnowledgeSource = {
  citation:
    "Adams C, et al. Neither internal nor external nasal dilation improves cycling 20-km time trial performance. J Sci Med Sport.",
  year: 2017,
  url: doi("10.1016/j.jsams.2016.08.018"),
  kind: "studie",
};
const GOMES_2022: KnowledgeSource = {
  citation:
    "Gomes SKSP, et al. Nasal dilator and physiological parameters associated to running performance: a systematic review and meta-analysis. J Sports Sci.",
  year: 2022,
  url: doi("10.1080/02640414.2022.2151752"),
  kind: "review",
};
const VALSAMIDIS_2023: KnowledgeSource = {
  citation:
    "Valsamidis K, et al. Improvement of the aerobic performance in endurance athletes presenting nasal valve compromise with the application of an internal nasal dilator. Am J Otolaryngol.",
  year: 2023,
  url: doi("10.1016/j.amjoto.2023.104059"),
  kind: "studie",
};
const JIN_2026: KnowledgeSource = {
  citation:
    "Jin Y, et al. Physical recovery modalities in competitive and elite endurance athletes: a systematic review and network meta-analysis finding limited evidence of benefit over passive recovery. Front Sports Act Living.",
  year: 2026,
  url: doi("10.3389/fspor.2026.1876924"),
  kind: "review",
};
const WANG_2025: KnowledgeSource = {
  citation:
    "Wang W, et al. Do compression garments enhance running performance? An updated systematic review and meta-analysis. J Sport Health Sci.",
  year: 2025,
  url: doi("10.1016/j.jshs.2025.101028"),
  kind: "review",
};
const DA_SILVA_2018: KnowledgeSource = {
  citation:
    "da Silva CA, et al. Association of lower limb compression garments during high-intensity exercise with performance and physiological responses: a systematic review and meta-analysis. Sports Med.",
  year: 2018,
  url: doi("10.1007/s40279-018-0927-z"),
  kind: "review",
};
const BROWN_2017: KnowledgeSource = {
  citation: "Brown F, et al. Compression garments and recovery from exercise: a meta-analysis. Sports Med.",
  year: 2017,
  url: doi("10.1007/s40279-017-0728-9"),
  kind: "review",
};
const NEGYESI_2022: KnowledgeSource = {
  citation:
    "Négyesi J, et al. Can compression garments reduce the deleterious effects of physical exercise on muscle strength? A systematic review and meta-analyses. Sports Med.",
  year: 2022,
  url: doi("10.1007/s40279-022-01681-4"),
  kind: "review",
};
const YEO_2014: KnowledgeSource = {
  citation: "Yeo BK, Bonanno DR. The effect of foot orthoses and in-shoe wedges during cycling: a systematic review. J Foot Ankle Res 7:31.",
  year: 2014,
  url: doi("10.1186/1757-1146-7-31"),
  kind: "review",
};
const YEO_2016: KnowledgeSource = {
  citation: "Yeo BK, et al. Foot orthoses do not affect crank power output during maximal exercise on a cycle-ergometer. J Sci Med Sport.",
  year: 2016,
  url: doi("10.1016/j.jsams.2015.04.015"),
  kind: "studie",
};
const KOCH_2013: KnowledgeSource = {
  citation: "Koch M, et al. The impact of carbon insoles in cycling on performance in the Wingate Anaerobic Test. J Sci Cycling 2(2).",
  year: 2013,
  url: doi("10.28985/jsc.v2i2.67"),
  kind: "studie",
};

export const MATERIAAL_ARTICLES: MateriaalArticle[] = [
  {
    slug: "waar-je-watt-heen-gaan",
    category: "lucht",
    evidence: "sterk",
    title: "Waar je watt heen gaan",
    summary:
      "Buiten gaat je vermogen naar lucht, rollen, de aandrijving en klimmen. Op het vlak wint de lucht het ruim, en dat aandeel groeit met je snelheid.",
    points: [
      "De luchtweerstand groeit met de derde macht van je snelheid. Boven ongeveer 50 km/h gaat zo'n 90 % van je vermogen naar lucht.",
      "Een rekenmodel met lucht, rolweerstand, de aandrijving en de helling voorspelde het gemeten vermogen op de weg met R² = 0,97 en een standaardfout van 2,7 W.",
      "Hetzelfde model klopte op echte routes, ook in de bergen, met correlaties van 0,96 tot 0,99. Een vergelijkbaar model voorspelde de tijd op een tijdrit van 26 km bij 41 renners met gemiddeld 1,7 % afwijking.",
      "Een rekenvoorbeeld voor een renner van 80 kg met fiets, alleen op het vlak: 5 % minder luchtweerstand scheelt bij 30 km/h ongeveer 5 W, bij 45 km/h ongeveer 19 W. Een rolweerstand van 0,004 in plaats van 0,005 scheelt bij 30 km/h ongeveer 6 W.",
      "Bergop draait het om: dan gaat het meeste vermogen naar het optillen van jou en je fiets, en telt gewicht.",
      "Binnen op Zwift rekent het spel met de luchtweerstand van je virtuele fiets. Je echte helm, pak of banden doen daar niets.",
      "Met de rekenaar reken je dit uit voor je eigen route en vermogen.",
    ],
    limits: [
      "Het model rekent windstil. Wind, bochten en remmen zitten er niet in.",
      "In een groep is je luchtweerstand veel lager, en daarmee ook de winst van alles wat aero is.",
    ],
    sources: [MARTIN_1998, DAHMEN_2011, OLDS_1995, DEBRAUX_2011],
  },
  {
    slug: "houding",
    category: "lucht",
    evidence: "sterk",
    title: "Houding: de grootste winst",
    summary:
      "Hoe je op de fiets zit, bepaalt het grootste deel van je luchtweerstand. Lager en smaller levert meer op dan welk onderdeel ook.",
    points: [
      "Bij profs in de windtunnel verlaagde alleen een andere houding de luchtweerstand met 14 %.",
      "Een wegrenner die de remgrepen vasthield met de onderarmen horizontaal, had 13,9 % minder luchtweerstand dan met gewone handen op de remgrepen. Het benodigde vermogen daalde bijna evenveel, omdat lucht op snelheid bijna alle weerstand is.",
      "Op de weg meten gewone vermogensmeters het verschil tussen handen op de remgrepen en in de beugel.",
      "Bij recreatieve renners gaf een lage sprinthouding 23 tot 26 % minder luchtweerstand dan zittend of gewoon staand.",
      "Je hoofd en je romp tellen het meest: daar vang je de meeste wind.",
      "Een lagere houding kost soms vermogen of comfort. Oefen hem op training voordat je hem in een wedstrijd gebruikt.",
    ],
    limits: [
      "De sprinthouding was tussen twee testdagen slecht herhaalbaar te meten.",
      "Hoeveel vermogen je in een lage houding verliest, verschilt per renner en is bij recreanten weinig gemeten.",
      "Binnen op Zwift telt je echte houding niet voor je snelheid.",
    ],
    sources: [GARCIA_LOPEZ_2008, BARRY_2015, LIM_2011, MERKES_2019],
  },
  {
    slug: "helm",
    category: "lucht",
    evidence: "matig",
    title: "Helm",
    summary:
      "Een aerohelm kan helpen, maar niet bij iedereen. Hoe je je hoofd houdt en hoe de helm aansluit, telt meer dan de vorm of de gaten.",
    points: [
      "Bij profs in de windtunnel was een aerohelm niet voor iedereen gunstiger: de helmen waren niet per renner gekozen.",
      "Op een testhoofd telden de hoek van het hoofd en de afstand tussen neus en helm meer dan het aantal of de plek van de ventilatiegaten.",
      "Gaten open of dicht scheelde op een pop 3,7 tot 4,1 % luchtweerstand.",
      "In een computermodel scheelde de vorm van de helm minder dan 1,5 %, de stand van het hoofd 6,4 %.",
      "Bij een tijdrithelm telt vooral hoe je je hoofd houdt: daarmee bepaal je waar de staart zit.",
    ],
    limits: [
      "Er is één studie met echte renners; de rest gebruikt een pop, een testhoofd of een computermodel.",
      "Een helm met minder gaten is warmer. Dat telt in de zomer en bij lange ritten.",
    ],
    sources: [GARCIA_LOPEZ_2008, UNDERWOOD_2015, NOVAK_2019, BEAUMONT_2018],
  },
  {
    slug: "kleding",
    category: "lucht",
    evidence: "matig",
    title: "Kleding en pak",
    summary:
      "Strak zittende kleding met de juiste stof scheelt enkele procenten luchtweerstand. Wapperende kleding kost het meest.",
    points: [
      "Strak zitten, naden in de richting van de wind en de juiste textuur per lichaamsdeel verlaagden in de windtunnel de luchtweerstand met enkele procenten. Het beste tijdritpak van één ontwikkeling zat bij 53 km/h 3,9 % onder pakken van een paar jaar eerder.",
      "Stof met een ruwere structuur kan de lucht langer langs een arm of been laten stromen. Op een pop gaf het beste pak 7,5 % minder luchtweerstand dan zonder pak.",
      "Het effect van stof hangt af van de snelheid: wat bij 50 km/h werkt, doet bij 30 km/h minder.",
      "Buiten en in een groep is de lucht onrustiger. Dat verandert het effect van een stof.",
    ],
    limits: [
      "Het meeste onderzoek is gedaan op cilinders en poppen, niet op renners op de weg.",
      "Hoeveel een los shirt tegenover een strak shirt kost bij een clubrenner op 30 km/h, is niet gemeten.",
    ],
    sources: [BROWNLIE_2009, OGGIANO_2009, MIAU_2021, BROWN_2023],
  },
  {
    slug: "sokken-en-overschoenen",
    category: "lucht",
    evidence: "beperkt",
    title: "Sokken en overschoenen",
    summary:
      "Je voeten bewegen snel door de lucht. Overschoenen kunnen iets schelen; voor aero-sokken zelf is geen gepubliceerd onderzoek.",
    points: [
      "In één windtunnelstudie naar tijdritschoenen kostte de luchtweerstand van de schoenen bijna een tiende van het totale vermogen, en maakten overschoenen verschil.",
      "Ruwere stof op een cilinder kan de luchtweerstand verlagen. Dat aero-sokken daarom werken, is een afleiding.",
      "De winst telt alleen buiten, alleen op snelheid, en vooral als je alleen rijdt.",
    ],
    limits: [
      "Eén studie, met schoenen voor tijdritten; geen metingen met renners op de weg.",
      "Naar aero-sokken en kuitkousen is geen gepubliceerd onderzoek gevonden. Wat erover rondgaat, komt van fabrikanten.",
    ],
    sources: [GIBERTINI_2010, OGGIANO_2009],
  },
  {
    slug: "wielen-en-frame",
    category: "lucht",
    evidence: "matig",
    title: "Wielen en frame",
    summary:
      "Aerowielen en een aeroframe schelen in een solotijdrit minuten. In een groep is het veel minder, en bij zijwind telt ook de besturing.",
    points: [
      "Aerowielen gaven in de windtunnel ongeveer 25 % minder luchtweerstand dan een gewoon spaakwiel, gemeten aan het wiel alleen.",
      "In een fiets is het anders: het frame en de vork verlagen de luchtweerstand van het voorwiel met 9 tot 13 %. De winst van een los gemeten wiel is dus niet de winst op de weg.",
      "In een rekenmodel voor een tijdrit van 40 km scheelde een aeroframe 1:17 tot 1:44 minuut en scheelden aerowielen 60 tot 82 seconden. Dat is solo, op tijdrittempo.",
      "Bij zijwind gaf een dicht wiel in de windtunnel dertig keer zoveel stuurmoment als een wiel met vijf spaken. Op een winderige dag is dat een kwestie van veiligheid.",
      "In een groep scheelt het veel minder, omdat je dan al veel minder lucht vangt.",
    ],
    limits: [
      "Metingen aan losse wielen, een computermodel en een rekenmodel; geen metingen met renners.",
      "Het effect hangt sterk af van de windhoek, en die verschilt per rit.",
    ],
    sources: [GREENWELL_1995, MALIZIA_2021_WIEL, JEUKENDRUP_MARTIN_2001, MAO_2025, MALIZIA_2020],
  },
  {
    slug: "banden-en-bandenspanning",
    category: "rollen",
    evidence: "sterk",
    title: "Banden en bandenspanning",
    summary:
      "Je band en je bandenspanning bepalen je rolweerstand. Op een gladde weg rolt harder sneller, op een ruwe weg kost te hard pompen juist snelheid.",
    points: [
      "Op een gladde ondergrond daalt de rolweerstand met een hogere spanning. Op de weg maten gewone vermogensmeters het verschil tussen ongeveer 4 en 8 bar.",
      "Op een ruwe weg verlies je energie aan schudden. Op een matig ruwe weg is dat meer dan de rolweerstand van de band, op een heel ruwe weg zelfs meer dan de lucht.",
      "Een lagere spanning en een bredere band geven minder trillingen.",
      "Off-road had een gladde band 21 % minder rolweerstand dan een band met noppen, en verschilden wegdek en spanning sterk.",
      "Een bredere velg maakte bij een mountainbike bijna niets uit; de spanning wel.",
      "Pomp dus naar wegdek en gewicht, niet zo hard mogelijk.",
    ],
    limits: [
      "Bij welke spanning een band op een ruwe weg omslaat van sneller naar trager, is niet vastgesteld.",
      "Brede banden, tubeless en latex binnenbanden zijn in gepubliceerd onderzoek nauwelijks vergeleken. Wat daarover rondgaat, komt vooral van testsites.",
      "Het model voor ruwe wegen is een berekening, geen meting op de weg.",
    ],
    sources: [GRAPPE_1999, LIM_2011, BERTUCCI_2013, MAIER_2019, HENCHOZ_2010, TURNER_2024, CRENNA_2025],
  },
  {
    slug: "ketting-en-smering",
    category: "rollen",
    evidence: "matig",
    title: "Ketting en smering",
    summary:
      "Een schone, gesmeerde ketting en een groter tandwiel achter schelen een paar watt. Welk smeermiddel het best is, hangt af van hoe je rijdt.",
    points: [
      "Op een testbank bepaalden de kettingspanning en de grootte van de tandwielen het rendement meer dan de smering.",
      "Een groter tandwiel achter scheelde op een tandem: 2,9 % verlies met 53-13 tegen 4,0 % met 53-11.",
      "Wax waarin je de ketting onderdompelt, bleef ruim 60 uur goed en was het meest herhaalbaar. Een druppelsmeermiddel deed het op hoge snelheid het best.",
      "Vuil maakt een ketting trager en slijt hem sneller. Schoonhouden is de goedkoopste winst.",
      "Hoe dichter een test bij echt fietsen zit, hoe groter de spreiding in de metingen.",
    ],
    limits: [
      "Alle metingen zijn op een testbank gedaan, niet in een wedstrijd.",
      "Het verschil tussen goede smeermiddelen is een paar watt; precieze getallen per merk staan bewust niet in de app.",
    ],
    sources: [SPICER_2001, SMIT_2023, DOWD_2026, LANASPEZE_2025, AUBERT_2023],
  },
  {
    slug: "ventilator",
    category: "binnen",
    evidence: "sterk",
    title: "Ventilator bij binnen fietsen",
    summary:
      "Binnen mis je de rijwind. Een stevige ventilator houdt je koel, en daarmee je vermogen hoog.",
    points: [
      "Bij 30 °C hielden fietsers het zonder luchtstroom gemiddeld 41 minuten vol, met luchtstroom van 30 km/h 90 minuten.",
      "In een tijdrit in de hitte was het vermogen zonder luchtstroom lager. Meer dan 16 km/h luchtstroom hielp niet meer.",
      "Met luchtstroom hielden renners het in de hitte ongeveer twee keer zo lang vol. Voorkoelen, bijvoorbeeld met koud water, voegde dan weinig meer toe.",
      "Ook bij kamertemperatuur leverden mensen bij dezelfde hartslag 15 % meer vermogen met een ventilator, en verloren ze minder vocht.",
      "Hoe warmer de kamer, hoe meer een ventilator uitmaakt.",
    ],
    limits: [
      "Het meeste onderzoek is in de hitte gedaan. Bij kamertemperatuur zijn er minder proeven.",
      "De studies zijn klein, meestal tien tot zestien deelnemers.",
      "Hoeveel luchtstroom het best is voor een Zwift-race van een uur bij gewone kamertemperatuur, is niet onderzocht.",
    ],
    sources: [OTANI_2018, BRIGHT_2023, MORRISON_2014, FERNANDEZ_2022],
  },
  {
    slug: "vermogensmeter",
    category: "binnen",
    evidence: "sterk",
    title: "Klopt je vermogensmeter?",
    summary:
      "Vermogensmeters en smart trainers zitten er vaak een paar procent naast, en meer bij kou, staan of sprinten. Dat raakt je FTP, je schema en eerlijk racen.",
    points: [
      "Van 54 vermogensmeters die renners gebruikten, zaten er zes meer dan 5 % naast. Gemiddeld scheelde het weinig, maar per meter liep het sterk uiteen.",
      "Temperatuur verschuift de meting: in één onderzoek tot 5 à 8 %. Doe een nulkalibratie als de meter op buitentemperatuur is.",
      "Een meter aan één kant gaf staand 4,4 % minder dan zittend, en week af bij trillingen. Pedalen gaven bij een hogere cadans iets minder.",
      "Directe-aandrijving-trainers kwamen in proeven binnen een paar procent van een referentiemeter. Bij één smart trainer was de spreiding 5,5 % bij 100 W en 1,6 % bij 300 W.",
      "Rij je met twee meters, bijvoorbeeld trainer en pedalen, vergelijk ze dan af en toe. Een verschil van een paar procent is normaal; houd één meter aan voor je FTP.",
      "Een overzicht van 74 validatiestudies wijst erop dat een meter onder alle omstandigheden getest moet zijn voordat je hem blind vertrouwt.",
    ],
    limits: [
      "Elke studie gaat over bepaalde modellen. Wat voor het ene merk geldt, geldt niet vanzelf voor een ander.",
      "Welk verschil tussen meters een ZRL-uitslag oneerlijk maakt, is nergens vastgesteld.",
    ],
    sources: [BOUILLOD_2022, MAIER_2017, GARDNER_2004, BOUILLOD_2017, HOON_2016, LILLO_BEVIA_2017, COSTA_2026],
  },
  {
    slug: "zadelhoogte-en-bikefit",
    category: "lichaam",
    evidence: "matig",
    title: "Zadelhoogte, bikefit en schoenplaatjes",
    summary:
      "De zadelhoogte stel je het best in op je kniehoek tijdens het fietsen. Een bikefit geeft vooral comfort; dat hij blessures voorkomt of je sneller maakt, is niet aangetoond.",
    points: [
      "Er is sterk bewijs om de zadelhoogte in te stellen met de kniehoek gemeten tijdens het fietsen, niet met een formule uit je binnenbeenlengte.",
      "Kleine verschillen, minder dan 4 % van je beenlengte, veranderden zuurstofverbruik en rendement niet.",
      "Voor een verband tussen fietsmaten en overbelastingsklachten is geen sterk bewijs gevonden. Met de trainingsbelasting is er wel een matig verband.",
      "Bij 160 mountainbikers daalden ongemak, vermoeidheid en kniepijn een maand na een bikefit sterk. In een enquête onder 849 renners hing een bikefit samen met meer comfort en minder pijn, niet met minder blessures.",
      "Na een bikefit met 3D-meting hadden twaalf recreanten 8,6 % meer piekvermogen en iets meer vermogen in de FTP-test. Dat is een kleine eerste proef.",
      "De schoenplaatjes 15 mm naar voren of achteren zetten veranderde de stand van heup en enkel, maar niet het rendement of het sprintvermogen.",
      "Heb je klachten, ga dan naar een bikefitter of fysiotherapeut. ZWB rekent bewust geen zadelhoogte uit.",
    ],
    limits: [
      "Van de studies naar de andere instellingen werd er geen enkele als goed beoordeeld.",
      "Het onderzoek naar een bikefit als geheel heeft geen controlegroep of is heel klein.",
      "Voor stuurhoogte, Q-factor en plaatjes zijn er geen duidelijke aanbevelingen.",
    ],
    sources: [BINI_2021, VISENTINI_2022, HUSBAND_2024, SCOZ_2021, PRIEGO_QUESADA_2019, HOYT_2025, CHARTOGNE_2016],
  },
  {
    slug: "cranklengte",
    category: "lichaam",
    evidence: "sterk",
    title: "Cranklengte",
    summary:
      "Binnen de gangbare maten maakt de lengte van je cranks voor je vermogen en rendement weinig uit. Kies op comfort en heup- en kniehoek.",
    points: [
      "Over een groot bereik van cranklengtes verschilde het maximale vermogen weinig; de gebruikelijke 170 mm kost de meeste volwassenen nauwelijks iets.",
      "Ook de verdeling van het vermogen over heup, knie en enkel veranderde niet, zolang de cadans meeging met de lengte.",
      "Vijf millimeter langer of korter veranderde het rendement niet. Langere cranks gaven wel meer buiging in heup en knie.",
      "Bij goed getrainde amateurs gaven 165 en 170 mm minder vermoeidheid dan 175 mm, zonder verschil in rendement of sprint.",
      "Kortere cranks geven je heup meer ruimte. Dat kan helpen bij een lagere houding of bij klachten.",
    ],
    limits: [
      "Dat kortere cranks via een lagere houding sneller maken, komt uit een studie die nog niet door vakgenoten is beoordeeld; die staat hier daarom niet als bron.",
      "Bijna alle proeven duurden kort; wat langdurig wennen doet, is niet onderzocht.",
    ],
    sources: [INBAR_1983, MARTIN_2001, BARRATT_2011, FERRER_ROCA_2017, LI_2025, HUSBAND_2024],
  },
  {
    slug: "gewicht",
    category: "lichaam",
    evidence: "sterk",
    title: "Gewicht van fiets en uitrusting",
    summary:
      "Gewicht telt bergop en nauwelijks op het vlak. Wat een kilo scheelt, hangt af van de route en je vermogen.",
    points: [
      "Bergop gaat het meeste vermogen naar het optillen van jou en je fiets. Een lichtere fiets maakt dan verschil.",
      "Op het vlak telt gewicht alleen via de rolweerstand en bij het optrekken. Daar wint aero bijna altijd van gewicht.",
      "Een vaste regel als \"zoveel seconden per kilo\" bestaat niet: het hangt af van de helling, de lengte van de klim en je vermogen.",
      "Met de rekenaar zie je wat een kilo minder oplevert op je eigen route.",
    ],
    limits: [
      "Dit is een berekening met het getoetste rekenmodel, geen meting met renners.",
      "Lichter materiaal kan stijfheid of duurzaamheid kosten. Dat zit niet in de berekening.",
    ],
    sources: [MARTIN_1998, JEUKENDRUP_MARTIN_2001, OLDS_1995],
  },
  {
    slug: "neusstrips",
    category: "klein",
    evidence: "matig",
    conclusion: "geen-effect",
    title: "Neusstrips",
    summary:
      "Neusstrips maken ademen door je neus makkelijker, maar je fietst er niet harder door. Alleen bij een vernauwde neus kan een spreider helpen.",
    points: [
      "Een meta-analyse vond geen effect van een neusstrip op VO2max, hartslag of hoe zwaar inspanning voelde.",
      "Bij vijftien getrainde fietsers maakten een neusstrip en een neusspreider een tijdrit van 20 km niet sneller.",
      "Een meta-analyse bij lopers zag wel een klein voordeel, maar met zeer lage zekerheid.",
      "Bij sporters met een vernauwde neusklep verbeterde een spreider in de neus het uithoudingsvermogen; bij sporters zonder die vernauwing niet.",
      "Heb je last van een verstopte neus bij inspanning, laat het dan nakijken door een huisarts.",
    ],
    limits: [
      "De studies zijn klein en spreken elkaar deels tegen.",
      "Een strip voelt vaak lichter aan, ook zonder meetbaar effect. Dat is lastig blind te testen.",
    ],
    sources: [DINARDI_2020, ADAMS_2017, GOMES_2022, VALSAMIDIS_2023],
  },
  {
    slug: "compressiekleding",
    category: "klein",
    evidence: "sterk",
    conclusion: "geen-effect",
    title: "Compressiekleding",
    summary:
      "Compressiekleding maakt je niet sneller, niet tijdens het sporten en niet als herstelmiddel voor de volgende prestatie. Of je er minder spierpijn van hebt, is onzeker.",
    points: [
      "Twee meta-analyses vonden tijdens het sporten geen winst op prestatie.",
      "Als herstelmiddel gaf compressie bij duursporters daarna geen betere prestatie. Een netwerk-meta-analyse zei dat met matige zekerheid.",
      "Voor het herstel van kracht spreken de analyses elkaar tegen: een oudere vond sneller herstel, een latere geen.",
      "Bij herstelproeven weten de deelnemers bijna altijd wat ze dragen. Een verwachtingseffect valt dus niet uit te sluiten.",
      "Vind je het prettig na een zware rit, dan kan het geen kwaad. Verwacht er geen watt van.",
    ],
    limits: [
      "Veel proeven zijn bij lopers gedaan, niet bij fietsers.",
      "Blind testen kan nauwelijks, en dat maakt elk gevonden herstelvoordeel onzeker.",
    ],
    sources: [JIN_2026, DA_SILVA_2018, WANG_2025, BROWN_2017, NEGYESI_2022],
  },
  {
    slug: "inlegzolen",
    category: "klein",
    evidence: "matig",
    conclusion: "geen-effect",
    title: "Inlegzolen",
    summary:
      "Speciale of op maat gemaakte inlegzolen geven geen extra vermogen. Ze kunnen wel helpen tegen drukklachten onder je voet.",
    points: [
      "Een systematische review vond geen effect van inlegzolen of wiggen op vermogen.",
      "In een proef met een nepzool als vergelijking gaven zolen op maat geen hoger maximaal vermogen, en ook niet meer comfort.",
      "Carbon zolen gaven in een sprinttest evenveel vermogen als gewone.",
      "Een zool met steun vergroot wel het contactvlak onder je voet. Dat kan helpen bij branderige of pijnlijke voeten; ga daarvoor naar een podotherapeut.",
    ],
    limits: [
      "De studies zijn klein en wisselend van kwaliteit.",
      "Wat zolen op lange termijn doen voor klachten, is bij fietsers nauwelijks onderzocht.",
    ],
    sources: [YEO_2014, YEO_2016, KOCH_2013],
  },
];

export function materiaalArticleBySlug(slug: string): MateriaalArticle | null {
  return MATERIAAL_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function materiaalArticlesByCategory(): {
  category: MateriaalCategory;
  articles: MateriaalArticle[];
}[] {
  return MATERIAAL_CATEGORIES.map((category) => ({
    category,
    articles: MATERIAAL_ARTICLES.filter((article) => article.category === category),
  })).filter((group) => group.articles.length > 0);
}
