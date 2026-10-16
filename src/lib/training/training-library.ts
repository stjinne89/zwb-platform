// De kennisbank trainen.
//
// Zelfde opzet als de kennisbanken voeding en kracht: in code, zodat elke
// bewering en elke bron via een commit gaat, en tests/unit/training-library.test.ts
// bewaakt dat er bij elk artikel een bron en een beperking staat. Deze eerste
// ronde dekt de onderwerpen van de protocollen; de rest van de trainingskennis
// (docs/lange-ritten-variatie.md, warming-up, FTP-test) volgt in een eigen ronde.
//
// De onderbouwing staat uitgebreider in docs/protocollen-onderzoek.md. Teksten
// zijn eigen samenvattingen; we citeren de bronnen niet letterlijk.

import { doi, type KnowledgeSource } from "@/lib/knowledge/source";
import {
  DE_PABLOS_2025,
  HAJGHANBARI_2013,
  HANSEN_RONNESTAD_2017,
  CUBEL_2024,
  ROTHSCHILD_2025,
  HEBISZ_2024,
  ILLI_2012,
  LUNDBY_2021,
  LUNDBY_2023,
  MCDONALD_2025,
  OBERHOLZER_2019,
  RACINAIS_2015,
  ROMER_2002,
  RICHARD_2025,
  RONNESTAD_HEAT_2022,
  RONNESTAD_HEAT_2024,
  VERDEL_2021,
  ZURAWLEW_2016,
} from "@/lib/protocols/training";

export const TRAINING_CATEGORIES = [
  "intensiteit",
  "testen",
  "piek",
  "herstel",
  "omstandigheden",
  "naast-de-fiets",
] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  intensiteit: "Intensiteit",
  testen: "Testen",
  piek: "Opbouw en piek",
  herstel: "Herstel",
  omstandigheden: "Hitte",
  "naast-de-fiets": "Naast de fiets",
};

export type TrainingArticle = {
  slug: string;
  category: TrainingCategory;
  title: string;
  summary: string;
  points: string[];
  /** Wat de bronnen níét laten zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  sources: KnowledgeSource[];
};

const RONNESTAD_2015: KnowledgeSource = {
  citation:
    "Rønnestad BR, Hansen J, Vegge G, Tønnessen E, Slettaløkken G. Short intervals induce superior training adaptations compared with long intervals in cyclists - an effort-matched approach. Scand J Med Sci Sports 25(2):143-151.",
  year: 2015,
  url: doi("10.1111/sms.12165"),
  kind: "studie",
};

const RONNESTAD_2020: KnowledgeSource = {
  citation:
    "Rønnestad BR, Hansen J, Nygaard H, Lundby C. Superior performance improvements in elite cyclists following short-interval vs effort-matched long-interval training. Scand J Med Sci Sports 30(5):849-857.",
  year: 2020,
  url: doi("10.1111/sms.13627"),
  kind: "studie",
};

const OLIVEIRA_2024: KnowledgeSource = {
  citation:
    "Silva Oliveira P, Boppre G, Fonseca H. Comparison of polarized versus other types of endurance training intensity distribution on athletes' endurance performance: a systematic review with meta-analysis. Sports Med 54(8):2071-2095.",
  year: 2024,
  url: doi("10.1007/s40279-024-02034-z"),
  kind: "review",
};

const SEILER_2010: KnowledgeSource = {
  citation:
    "Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 5(3):276-291.",
  year: 2010,
  url: doi("10.1123/ijspp.5.3.276"),
  kind: "review",
};

const ESTEVE_LANAO_2007: KnowledgeSource = {
  citation:
    "Esteve-Lanao J, Foster C, Seiler S, Lucia A. Impact of training intensity distribution on performance in endurance athletes. J Strength Cond Res 21(3):943-949.",
  year: 2007,
  url: doi("10.1519/R-19725.1"),
  kind: "studie",
};

const BOSQUET_2007: KnowledgeSource = {
  citation:
    "Bosquet L, Montpetit J, Arvisais D, Mujika I. Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 39(8):1358-1365.",
  year: 2007,
  url: doi("10.1249/mss.0b013e31806010e0"),
  kind: "review",
};

const WANG_2023: KnowledgeSource = {
  citation:
    "Wang Z, Wang YT, Gao W, Zhong Y. Effects of tapering on performance in endurance athletes: a systematic review and meta-analysis. PLoS One 18(5):e0282838.",
  year: 2023,
  url: doi("10.1371/journal.pone.0282838"),
  kind: "review",
};

const BROATCH_2018: KnowledgeSource = {
  citation:
    "Broatch JR, Petersen A, Bishop DJ. The influence of post-exercise cold-water immersion on adaptive responses to exercise: a review of the literature. Sports Med 48(6):1369-1387.",
  year: 2018,
  url: doi("10.1007/s40279-018-0910-8"),
  kind: "review",
};

// Herstel meten (wetenschappelijke toets 1C, 2026-10-16). DOI's via PubMed bevestigd.
const PLEWS_2013: KnowledgeSource = {
  citation:
    "Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring. Sports Med 43(9):773-781.",
  year: 2013,
  url: doi("10.1007/s40279-013-0071-8"),
  kind: "review",
};

const BUCHHEIT_2014: KnowledgeSource = {
  citation:
    "Buchheit M. Monitoring training status with HR measures: do all roads lead to Rome? Front Physiol 5:73.",
  year: 2014,
  url: doi("10.3389/fphys.2014.00073"),
  kind: "review",
};

const VESTERINEN_2016: KnowledgeSource = {
  citation:
    "Vesterinen V, Nummela A, Heikura I, Laine T, Hynynen E, Botella J, Häkkinen K. Individual endurance training prescription with heart rate variability. Med Sci Sports Exerc 48(7):1347-1354.",
  year: 2016,
  url: doi("10.1249/MSS.0000000000000910"),
  kind: "studie",
};

const JAVALOYES_2019: KnowledgeSource = {
  citation:
    "Javaloyes A, Sarabia JM, Lamberts RP, Moya-Ramon M. Training prescription guided by heart-rate variability in cycling. Int J Sports Physiol Perform 14(1):23-32.",
  year: 2019,
  url: doi("10.1123/ijspp.2018-0122"),
  kind: "studie",
};

const LE_MEUR_2013: KnowledgeSource = {
  citation:
    "Le Meur Y, Pichon A, Schaal K, Schmitt L, Louis J, Gueneron J, Vidal PP, Hausswirth C. Evidence of parasympathetic hyperactivity in functionally overreached athletes. Med Sci Sports Exerc 45(11):2061-2071.",
  year: 2013,
  url: doi("10.1249/MSS.0b013e3182980125"),
  kind: "studie",
};

const MANRESA_ROCAMORA_2021: KnowledgeSource = {
  citation:
    "Manresa-Rocamora A, Flatt AA, Casanova-Lizón A, et al. Heart rate-based indices to detect parasympathetic hyperactivity in functionally overreached athletes. A meta-analysis. Scand J Med Sci Sports 31(6):1164-1182.",
  year: 2021,
  url: doi("10.1111/sms.13932"),
  kind: "review",
};

const ALFONSO_2025: KnowledgeSource = {
  citation:
    "Alfonso C, Clarke DC, Capdevila L. Individual training prescribed by heart rate variability, heart rate and well-being scores in experienced cyclists. Sci Rep 15:34023.",
  year: 2025,
  url: doi("10.1038/s41598-025-13540-z"),
  kind: "studie",
};

const CRAVEN_2022: KnowledgeSource = {
  citation:
    "Craven J, McCartney D, Desbrow B, et al. Effects of acute sleep loss on physical performance: a systematic and meta-analytical review. Sports Med 52(11):2669-2690.",
  year: 2022,
  url: doi("10.1007/s40279-022-01706-y"),
  kind: "review",
};

// FTP-test (wetenschappelijke toets 1B, 2026-10-16). DOI's via PubMed bevestigd.
const BORSZCZ_2018: KnowledgeSource = {
  citation:
    "Borszcz FK, Tramontin AF, Bossi AH, Carminatti LJ, Costa VP. Functional threshold power in cyclists: validity of the concept and physiological responses. Int J Sports Med 39(10):737-742.",
  year: 2018,
  url: doi("10.1055/s-0044-101546"),
  kind: "studie",
};

const BORSZCZ_2019: KnowledgeSource = {
  citation:
    "Borszcz FK, Tramontin AF, Costa VP. Is the functional threshold power interchangeable with the maximal lactate steady state in trained cyclists? Int J Sports Physiol Perform 14(8):1029-1035.",
  year: 2019,
  url: doi("10.1123/ijspp.2018-0572"),
  kind: "studie",
};

const MCGRATH_2019: KnowledgeSource = {
  citation:
    "McGrath E, Mahony N, Fleming N, Donne B. Is the FTP test a reliable, reproducible and functional assessment tool in highly-trained athletes? Int J Exerc Sci 12(4):1334-1345.",
  year: 2019,
  url: doi("10.70252/RQOO7391"),
  kind: "studie",
};

const INGLIS_2020: KnowledgeSource = {
  citation:
    "Inglis EC, Iannetta D, Passfield L, Murias JM. Maximal lactate steady state versus the 20-minute functional threshold power test in well-trained individuals: \"watts\" the big deal? Int J Sports Physiol Perform 15(4):541-547.",
  year: 2020,
  url: doi("10.1123/ijspp.2019-0214"),
  kind: "studie",
};

const VALENZUELA_2018: KnowledgeSource = {
  citation:
    "Valenzuela PL, Morales JS, Foster C, Lucia A, de la Villa P. Is the functional threshold power a valid surrogate of the lactate threshold? Int J Sports Physiol Perform 13(10):1293-1298.",
  year: 2018,
  url: doi("10.1123/ijspp.2018-0008"),
  kind: "studie",
};

const WONG_2023: KnowledgeSource = {
  citation:
    "Wong S, Burnley M, Mauger AR, Fenghua S, Hopker J. Functional threshold power is not a valid marker of the maximal metabolic steady state. J Sports Sci 40(23):2578-2584.",
  year: 2023,
  url: doi("10.1080/02640414.2023.2176045"),
  kind: "studie",
};

const TRAMONTIN_2021: KnowledgeSource = {
  citation:
    "Tramontin AF, Borszcz FK, Costa V. Functional threshold power estimated from a 20-minute time-trial test is warm-up-dependent. Int J Sports Med 43(5):411-417.",
  year: 2021,
  url: doi("10.1055/a-1524-2312"),
  kind: "studie",
};

const AZEVEDO_2023: KnowledgeSource = {
  citation:
    "Azevedo RA, Fleitas-Paniagua PR, Trpcic M, Iannetta D, Millet GY, Murias JM. Different ramp-incremental slopes elicit similar VO2max and fatigability profiles in females and males despite differences in peak power output. J Appl Physiol 135(1):109-120.",
  year: 2023,
  url: doi("10.1152/japplphysiol.00090.2023"),
  kind: "studie",
};

const KARSTEN_2021: KnowledgeSource = {
  citation:
    "Karsten B, Petrigna L, Klose A, Bianco A, Townsend N, Triska C. Relationship between the critical power test and a 20-min functional threshold power test in cycling. Front Physiol 11:613151.",
  year: 2021,
  url: doi("10.3389/fphys.2020.613151"),
  kind: "studie",
};

// Opbouwen (wetenschappelijke toets 1A, 2026-10-16). DOI's via PubMed bevestigd;
// Damsted 2018 heeft in PubMed geen DOI en linkt naar PMC.
const BUIST_2008: KnowledgeSource = {
  citation:
    "Buist I, Bredeweg SW, van Mechelen W, Lemmink KA, Pepping GJ, Diercks RL. No effect of a graded training program on the number of running-related injuries in novice runners: a randomized controlled trial. Am J Sports Med 36(1):33-39.",
  year: 2008,
  url: doi("10.1177/0363546507307505"),
  kind: "studie",
};

const NIELSEN_2014: KnowledgeSource = {
  citation:
    "Nielsen RØ, Parner ET, Nohr EA, Sørensen H, Lind M, Rasmussen S. Excessive progression in weekly running distance and risk of running-related injuries: an association which varies according to type of injury. J Orthop Sports Phys Ther 44(10):739-747.",
  year: 2014,
  url: doi("10.2519/jospt.2014.5164"),
  kind: "studie",
};

const DAMSTED_2018: KnowledgeSource = {
  citation:
    "Damsted C, Glad S, Nielsen RO, Sørensen H, Malisoux L. Is there evidence for an association between changes in training load and running-related injuries? A systematic review. Int J Sports Phys Ther 13(6):931-942.",
  year: 2018,
  url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6253751/",
  kind: "review",
};

const GABBETT_2020: KnowledgeSource = {
  citation:
    "Gabbett TJ. Debunking the myths about training load, injury and performance: empirical evidence, hot topics and recommendations for practitioners. Br J Sports Med 54(1):58-66.",
  year: 2020,
  url: doi("10.1136/bjsports-2018-099784"),
  kind: "review",
};

const JOHNSTON_2019: KnowledgeSource = {
  citation:
    "Johnston R, Cahalan R, Bonnett L, et al. Training load and baseline characteristics associated with new injury/pain within an endurance sporting population: a prospective study. Int J Sports Physiol Perform 14(5):590-597.",
  year: 2019,
  url: doi("10.1123/ijspp.2018-0644"),
  kind: "studie",
};

const IMPELLIZZERI_2020: KnowledgeSource = {
  citation:
    "Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ. Acute:chronic workload ratio: conceptual issues and fundamental pitfalls. Int J Sports Physiol Perform 15(6):907-913.",
  year: 2020,
  url: doi("10.1123/ijspp.2019-0864"),
  kind: "review",
};

const HELLARD_2006: KnowledgeSource = {
  citation:
    "Hellard P, Avalos M, Lacoste L, Barale F, Chatard JC, Millet GP. Assessing the limitations of the Banister model in monitoring training. J Sports Sci 24(5):509-520.",
  year: 2006,
  url: doi("10.1080/02640410500244697"),
  kind: "studie",
};

const MUJIKA_PADILLA_2001: KnowledgeSource = {
  citation:
    "Mujika I, Padilla S. Cardiorespiratory and metabolic characteristics of detraining in humans. Med Sci Sports Exerc 33(3):413-421.",
  year: 2001,
  url: doi("10.1097/00005768-200103000-00013"),
  kind: "review",
};

// Zones (wetenschappelijke toets 1D, 2026-10-16). DOI's via PubMed bevestigd.
const IANNETTA_2020: KnowledgeSource = {
  citation:
    "Iannetta D, Inglis EC, Mattu AT, et al. A critical evaluation of current methods for exercise prescription in women and men. Med Sci Sports Exerc 52(2):466-473.",
  year: 2020,
  url: doi("10.1249/MSS.0000000000002147"),
  kind: "studie",
};

const JAMNICK_2018: KnowledgeSource = {
  citation:
    "Jamnick NA, Botella J, Pyne DB, Bishop DJ. Manipulating graded exercise test variables affects the validity of the lactate threshold and VO2peak. PLoS One 13(7):e0199794.",
  year: 2018,
  url: doi("10.1371/journal.pone.0199794"),
  kind: "studie",
};

const DENHAM_2026: KnowledgeSource = {
  citation:
    "Denham J, Scott-Hamilton J, Mills D. Physiological and subjective measures of exercise intensity cycling at 55% and 85% of functional threshold power: findings from a randomised crossover trial. J Sports Sci 44(13):1672-1682.",
  year: 2026,
  url: doi("10.1080/02640414.2026.2673477"),
  kind: "studie",
};

const SANDERS_2017: KnowledgeSource = {
  citation:
    "Sanders D, Myers T, Akubat I. Training-intensity distribution in road cyclists: objective versus subjective measures. Int J Sports Physiol Perform 12(9):1232-1237.",
  year: 2017,
  url: doi("10.1123/ijspp.2016-0523"),
  kind: "studie",
};

// Fase 2 van de wetenschappelijke toets (2026-10-16). Alle DOI's via PubMed bevestigd.
const URIANSTAD_2024: KnowledgeSource = {
  citation:
    "Urianstad T, Hamarsland H, Odden I, et al. The higher oxygen consumption during multiple short intervals is sex-independent and not influenced by skeletal muscle characteristics in well-trained cyclists. Eur J Sport Sci 24(11):1614-1626.",
  year: 2024,
  url: doi("10.1002/ejsc.12214"),
  kind: "studie",
};

const APPELHANS_2025: KnowledgeSource = {
  citation:
    "Appelhans D, Rønnestad B, Skovereng K. Multiple short intervals induce longer time above 90% of maximal oxygen consumption than long intervals when matched by similar fixed intensity, but not during self-paced cycling ergometry. Int J Sports Physiol Perform 20(6):848-855.",
  year: 2025,
  url: doi("10.1123/ijspp.2024-0115"),
  kind: "studie",
};

const ROSENBLAT_2025: KnowledgeSource = {
  citation:
    "Rosenblat MA, Watt JA, Arnold JI, et al. Which training intensity distribution intervention will produce the greatest improvements in maximal oxygen uptake and time-trial performance in endurance athletes? A systematic review and network meta-analysis of individual participant data. Sports Med 55(3):655-673.",
  year: 2025,
  url: doi("10.1007/s40279-024-02149-3"),
  kind: "review",
};

const MORAN_MACDONALD_2026: KnowledgeSource = {
  citation:
    "Moran-MacDonald A, Wilson S, Wu Z, et al. The effectiveness of polarized versus high-intensity training in moderately trained cyclists: a randomized parallel-design study. Eur J Appl Physiol.",
  year: 2026,
  url: doi("10.1007/s00421-026-06380-w"),
  kind: "studie",
};

const RONNESTAD_BLOCK_2025: KnowledgeSource = {
  citation:
    "Rønnestad BR, Odden IU, Solum KS, et al. Block training with moderate- or high-intensity intervals both improve endurance performance in well-trained cyclists. Eur J Sport Sci 25(11):e70067.",
  year: 2025,
  url: doi("10.1002/ejsc.70067"),
  kind: "studie",
};

const BARRANCO_GIL_2024: KnowledgeSource = {
  citation:
    "Barranco-Gil D, Alejo LB, Revuelta C, et al. Intensity matters: effect of different work-matched efforts on subsequent performance in cyclists. Int J Sports Physiol Perform 19(10):1006-1011.",
  year: 2024,
  url: doi("10.1123/ijspp.2023-0287"),
  kind: "studie",
};

const CHRISTENSEN_2023: KnowledgeSource = {
  citation:
    "Christensen PM, Andreasen JJ, Lyngholm J, et al. Importance of training volume during intensified training in elite cyclists: maintained vs. reduced volume at moderate intensity. Scand J Med Sci Sports 34(1):e14362.",
  year: 2023,
  url: doi("10.1111/sms.14362"),
  kind: "studie",
};

const RONNESTAD_VIKMOEN_2019: KnowledgeSource = {
  citation:
    "Rønnestad BR, Vikmoen O. A 11-day compressed overload and taper induces larger physiological improvements than a normal taper in elite cyclists. Scand J Med Sci Sports 29(12):1856-1865.",
  year: 2019,
  url: doi("10.1111/sms.13536"),
  kind: "studie",
};

const KARSTEN_IMT_2018: KnowledgeSource = {
  citation:
    "Karsten M, Ribeiro GS, Esquivel MS, Matte DL. The effects of inspiratory muscle training with linear workload devices on the sports performance and cardiopulmonary function of athletes: a systematic review and meta-analysis. Phys Ther Sport 34:92-104.",
  year: 2018,
  url: doi("10.1016/j.ptsp.2018.09.004"),
  kind: "review",
};

const NOTTER_2023: KnowledgeSource = {
  citation:
    "Notter DA, Verges S, Renggli AS, Beltrami FG, Spengler CM. Similar effects on exercise performance following different respiratory muscle training programs in healthy young men. Sci Rep 13(1):16135.",
  year: 2023,
  url: doi("10.1038/s41598-023-41580-w"),
  kind: "studie",
};

const JOHNSON_2007: KnowledgeSource = {
  citation:
    "Johnson MA, Sharpe GR, Brown PI. Inspiratory muscle training improves cycling time-trial performance and anaerobic work capacity but not critical power. Eur J Appl Physiol 101(6):761-770.",
  year: 2007,
  url: doi("10.1007/s00421-007-0551-3"),
  kind: "studie",
};

const MALTA_2021: KnowledgeSource = {
  citation:
    "Malta ES, Dutra YM, Broatch JR, Bishop DJ, Zagatto AM. The effects of regular cold-water immersion use on training-induced changes in strength and endurance performance: a systematic review with meta-analysis. Sports Med 51(1):161-174.",
  year: 2021,
  url: doi("10.1007/s40279-020-01362-0"),
  kind: "review",
};

// Lange ritten en warming-up (fase 2B, 2026-10-16). DOI's via PubMed bevestigd.
const BARSUMYAN_DURABILITY_2025: KnowledgeSource = {
  citation:
    "Barsumyan A, Soost C, Burchard R. Enhanced durability predicts success in amateur road cycling: evidence of power output declines. Front Sports Act Living 7:1530162.",
  year: 2025,
  url: doi("10.3389/fspor.2025.1530162"),
  kind: "studie",
};

const HAMILTON_2024: KnowledgeSource = {
  citation:
    "Hamilton K, Kilding AE, Plews DJ, et al. Durability of the moderate-to-heavy-intensity transition is related to the effects of prolonged exercise on severe-intensity performance. Eur J Appl Physiol 124(8):2427-2438.",
  year: 2024,
  url: doi("10.1007/s00421-024-05459-6"),
  kind: "studie",
};

const STEVENSON_2023: KnowledgeSource = {
  citation:
    "Stevenson JD, Kilding AE, Plews DJ, Maunder E. Prolonged exercise shifts ventilatory parameters at the moderate-to-heavy intensity transition. Eur J Appl Physiol 124(1):309-315.",
  year: 2023,
  url: doi("10.1007/s00421-023-05285-2"),
  kind: "studie",
};

const SANCHEZ_JIMENEZ_2025: KnowledgeSource = {
  citation:
    "Sánchez-Jiménez JL, Salas-Montoro JA, Mateo-March M, et al. Is intensity the most important factor in determining the amount of prior work accumulated that affects cyclists' acute durability? A systematic review. Eur J Appl Physiol 126(1):163-179.",
  year: 2025,
  url: doi("10.1007/s00421-025-05885-0"),
  kind: "review",
};

const JONES_KIRBY_2025: KnowledgeSource = {
  citation:
    "Jones AM, Kirby BS. Physiological resilience: what is it and how might it be trained? Scand J Med Sci Sports 35(3):e70032.",
  year: 2025,
  url: doi("10.1111/sms.70032"),
  kind: "review",
};

const HAJOGLOU_2005: KnowledgeSource = {
  citation:
    "Hajoglou A, Foster C, De Koning JJ, Lucia A, Kernozek TW, Porcari JP. Effect of warm-up on cycle time trial performance. Med Sci Sports Exerc 37(9):1608-1614.",
  year: 2005,
  url: doi("10.1249/01.mss.0000177589.02381.0a"),
  kind: "studie",
};

const BARRANCO_GIL_2020: KnowledgeSource = {
  citation:
    "Barranco-Gil D, Alejo LB, Valenzuela PL, et al. Warming up before a 20-minute endurance effort: is it really worth it? Int J Sports Physiol Perform 15(7):964-970.",
  year: 2020,
  url: doi("10.1123/ijspp.2019-0554"),
  kind: "studie",
};

const VASCONCELOS_2023: KnowledgeSource = {
  citation:
    "Vasconcelos GC, Brietzke C, Cesario JCS, et al. No evidence of postactivation performance enhancement on endurance exercises: a comprehensive systematic review and meta-analysis. Med Sci Sports Exerc 56(2):315-327.",
  year: 2023,
  url: doi("10.1249/MSS.0000000000003308"),
  kind: "review",
};

export const TRAINING_ARTICLES: TrainingArticle[] = [
  {
    slug: "lage-cadans",
    category: "intensiteit",
    title: "Lage cadans",
    summary:
      "Rijden op lage toeren lijkt alleen iets op te leveren bij hoge intensiteit. Op tempo of drempel is er geen winst gevonden.",
    points: [
      "In een proef van acht weken stegen VO2max en maximaal aeroob vermogen meer als de VO2max-blokken en sprints op 50 tot 70 toeren werden gereden dan op eigen cadans (8,7 tegen 4,6 procent).",
      "Een systematische review vond in 2017 geen sterk bewijs voor lage cadans, en raadde het hooguit aan op matige tot maximale intensiteit.",
      "Een torque-programma op 50 toeren bij 70 procent van het VO2max-vermogen deed in tien weken niets; zware squats in de gym verbeterden wel het vermogen.",
      "ZWB zet lage cadans daarom alleen op VO2max-blokken en sprints, als protocol dat de AI-coach in je schema verwerkt.",
    ],
    limits: [
      "De positieve proef had 24 jonge, goed getrainde vrouwen. Of het bij mannen, oudere of minder getrainde renners net zo werkt, is niet onderzocht; tot oktober 2026 is daar geen nieuwe proef bij gekomen.",
      "De lange duurritten met lage-cadansblokken in de workoutbibliotheek rijden op tempo en drempel, waar dit bewijs niet voor geldt; ze zijn variatie, geen bewezen winst.",
    ],
    sources: [HEBISZ_2024, HANSEN_RONNESTAD_2017, DE_PABLOS_2025],
  },
  {
    slug: "zones",
    category: "intensiteit",
    title: "Zones: een afspraak, geen grens in je lijf",
    summary:
      "De zones in ZWB zijn die van Zwift, in procenten van je FTP. Handig om af te spreken, maar dezelfde procent betekent niet voor iedereen hetzelfde.",
    points: [
      "Je lijf kent een paar echte overgangen: de eerste drempel, waaronder je lang rustig kunt rijden, en het hoogste vermogen dat nog stabiel blijft. Bij honderd mensen lagen die overgangen op heel verschillende percentages van hun maximum. Een vaste procent zet dus niet iedereen in hetzelfde gebied.",
      "Het hoogste stabiele vermogen ligt bij veel renners rond 93 tot 96 % van hun FTP, en op hun FTP zelf hielden renners het gemiddeld een half uur tot drie kwartier vol.",
      "Daarom krijgen lange drempelblokken (vijftien minuten of meer) in ZWB 90 tot 95 % FTP, kortere hooguit 100 %. Boven de 100 % komt alleen in blokken van hooguit acht minuten.",
      "Op 85 % FTP waren hartslag, ademhaling en gevoel al 'zwaar'. Let dus ook op hartslag en hoe het voelt; die zeggen soms meer dan het wattage.",
      "De koppeling tussen RPE en een procent FTP in ZWB is een eigen afspraak. Wie zijn training op gevoel indeelt, krijgt een heel ander beeld dan op vermogen of hartslag.",
    ],
    limits: [
      "Waar je eigen drempels liggen, meet je alleen met een inspanningstest met lactaat of ademgassen. ZWB heeft die gegevens niet.",
      "De studies zijn klein en vaak bij getrainde mannen gedaan.",
    ],
    sources: [IANNETTA_2020, JAMNICK_2018, INGLIS_2020, BORSZCZ_2019, WONG_2023, DENHAM_2026, SANDERS_2017],
  },
  {
    slug: "lange-ritten",
    category: "intensiteit",
    title: "Lange ritten en duurvermogen",
    summary:
      "Hoe goed je je vermogen vasthoudt na uren rijden, is een eigen eigenschap: duurvermogen. Het beslist veel wedstrijden, en lange ritten trainen het.",
    points: [
      "Na een lange rit ligt je drempel lager. Na twee à tweeënhalf uur matig fietsen zakte het vermogen op de eerste drempel met 6 tot 10 procent, en wie daar minder zakte, verloor ook minder op een inspanning van vijf minuten.",
      "Bij amateurs verloren de betere renners na 1000 kJ half zoveel op twintig minuten als de mindere (6,5 tegen 12,5 procent).",
      "Hard werk kost meer dan rustig werk: boven je critical power zakt het vermogen al na veel minder kilojoules.",
      "Wat het traint is nog dun onderzocht. Een overzicht noemt jaren van flink volume, regelmatig lange ritten (bij voorkeur met tempo of harder aan het eind) en krachttraining.",
      "De lange ritten in de workoutbibliotheek bouwen daarop: een rustig begin en het werk na anderhalf à twee uur.",
      "Een hartslag die wegloopt van je vermogen (ontkoppeling) hangt samen met hoeveel je drempel zakt. Met het protocol Duurtest volg je dat maandelijks.",
    ],
    limits: [
      "Het meeste onderzoek beschrijft wie veel duurvermogen heeft. Welke lange rit het het best traint, is nauwelijks in proeven getest.",
      "Dat een rit na ongeveer twee uur als vermoeiend telt, is een omrekening van profdata naar clubrenners, geen gemeten grens.",
    ],
    sources: [
      BARSUMYAN_DURABILITY_2025,
      HAMILTON_2024,
      STEVENSON_2023,
      SANCHEZ_JIMENEZ_2025,
      JONES_KIRBY_2025,
      ROTHSCHILD_2025,
    ],
  },
  {
    slug: "korte-intervallen",
    category: "intensiteit",
    title: "Korte intervallen (30/15)",
    summary:
      "Blokken van 30 seconden hard en 15 seconden rustig gaven in een paar proeven meer winst dan even zware intervallen van vijf minuten.",
    points: [
      "Drie series van 13 keer 30/15 gaven in tien weken meer VO2max dan vier keer vijf minuten bij dezelfde ervaren zwaarte (8,7 tegen 2,6 procent), en ook meer vermogen op 30 seconden, 5 en 40 minuten.",
      "Bij toprenners gaven negen van die sessies in drie weken een betere 20-minutentest (4,7 tegen -1,4 procent); de VO2max veranderde daar niet anders.",
      "Je haalt met korte blokken meer minuten dicht bij je VO2max, omdat je de hartslag hoog houdt zonder volledig te verzuren. Bij goed getrainde mannen én vrouwen gaf 30/15 meer tijd boven 90 procent VO2max dan constant rijden (ruim 18 tegen 15 minuten).",
      "Dat voordeel zag een latere proef alleen als de blokken op een vast vermogen werden gereden, niet als renners zelf voluit gingen. In ERG-modus op Zwift rijd je ze op een vast vermogen.",
    ],
    limits: [
      "Het bewijs komt vooral van één onderzoeksgroep, met kleine groepen; ook de nieuwere studies hebben die groep als (mede)auteur.",
      "Of 30/15 op lange termijn beter is dan lange intervallen, is niet onderzocht; afwisselen ligt voor de hand.",
    ],
    sources: [RONNESTAD_2015, RONNESTAD_2020, URIANSTAD_2024, APPELHANS_2025],
  },
  {
    slug: "intensiteitsverdeling",
    category: "intensiteit",
    title: "Gepolariseerd of piramidaal",
    summary:
      "Of je je harde werk gepolariseerd of piramidaal verdeelt, maakt voor je prestatie weinig uit. Veel rustig rijden is in beide de basis.",
    points: [
      "Een meta-analyse vond voor gepolariseerd trainen een klein voordeel op VO2max, vooral bij korte programma's en zeer goed getrainde sporters. Op tijdrit en uithoudingsvermogen was er geen verschil.",
      "Een grotere analyse op de gegevens van individuele deelnemers vond geen verschil tussen gepolariseerd en piramidaal, ook niet op VO2max. Wedstrijdsporters leken meer te hebben aan gepolariseerd, recreanten juist aan piramidaal.",
      "Bij matig getrainde fietsers voegden vier uur extra rustig-tot-matig rijden per week naast intervaltraining in zes weken niets toe aan de tijdrit.",
      "ZWB schrijft daarom geen verdeling voor; de AI-coach volgt de periodisering en je voorkeuren.",
    ],
    limits: [
      "De studies zijn kort (vaak minder dan twaalf weken) en verschillen sterk in opzet.",
      "Het verschil tussen wedstrijdsporters en recreanten komt uit een deelanalyse; dat is een aanwijzing, geen bewijs.",
    ],
    sources: [OLIVEIRA_2024, ROSENBLAT_2025, MORAN_MACDONALD_2026],
  },
  {
    slug: "rustige-ritten",
    category: "intensiteit",
    title: "Rustige ritten rustig",
    summary:
      "Goed getrainde duursporters rijden het grootste deel van hun tijd rustig. Gepland tempowerk is nuttig; een rustige rit die ongemerkt tempo wordt, is de valkuil.",
    points: [
      "Bij goed getrainde duursporters ligt zo'n 80% van de trainingen onder de eerste drempel; het harde werk zit in een klein deel.",
      "Lopers die bij dezelfde totale belasting meer rustig en minder op tempo trainden, verbeterden meer op hun wedstrijd.",
      "Tempo is geen verloren tijd. Bij goed getrainde fietsers verbeterde een week met gematigde intervallen de drempel zelfs meer dan een week met harde intervallen (4,5 tegen 2,1 procent).",
      "Bij gelijke arbeid vermoeit een harde intervaltraining meer dan een rustige duurrit, vooral voor korte, harde inspanningen de dag erna. Bij elite-fietsers kon een derde van het matige volume weg zonder verlies op de tijdrit.",
      "Juist als je je sterk voelt is inhouden het lastigst. Wil je tempo rijden, plan het dan; maak er geen rustige rit van die halverwege tempo wordt.",
      "Houd je bij een duurrit onder 75% van je FTP, de bovenkant van zone 2. Op Zwift helpt een workout in ERG-modus; in een groep rijd je achteraan of laat je hem gaan.",
    ],
    limits: [
      "Het onderzoek is klein en vaak bij lopers gedaan.",
      "Dat tempo op een rustige dag de harde dag schaadt, is een vuistregel van coaches; direct gemeten is het nauwelijks.",
    ],
    sources: [
      SEILER_2010,
      ESTEVE_LANAO_2007,
      OLIVEIRA_2024,
      RONNESTAD_BLOCK_2025,
      BARRANCO_GIL_2024,
      CHRISTENSEN_2023,
    ],
  },
  {
    slug: "ftp-test",
    category: "testen",
    title: "Je FTP: wat de test meet",
    summary:
      "Een FTP-test is een goed herhaalbare prestatietest, maar geen exacte meting van je drempel. Per renner zit hij er al gauw een paar procent naast.",
    points: [
      "De 20-minutentest is goed herhaalbaar: twee keer testen scheelt meestal maar een paar procent. Een nieuwe FTP die minder dan 3 % afwijkt van de vorige, toont ZWB daarom als gelijk gebleven.",
      "95 % van je twintig minuten komt op groepsniveau dicht bij de drempel, maar per renner wijkt het al gauw 10 % af. Recreatieve renners komen er vaak iets onder uit.",
      "Op hun FTP hielden renners het gemiddeld 34 tot 51 minuten vol, geen uur. Een lang drempelblok op 100 % is voor veel renners dus zwaarder dan het lijkt.",
      "De warming-up telt mee. Na een lange warming-up met een harde blok van vijf minuten reden renners hun test ongeveer 5 % lager. ZWB gebruikt daarom drie korte versnellingen.",
      "De ramptest neemt 75 % van je hoogste minuut. Dat getal is nooit gepubliceerd getoetst, en de uitkomst hangt af van hoe snel de test oploopt. Wie explosief is, haalt een hoge laatste minuut en komt daardoor vaak te hoog uit; een echte duurrenner eerder te laag.",
      "Wijkt je test meer dan 8 % af van je vermogenscurve (CP en eFTP uit intervals.icu), dan krijgen jij en je trainer een seintje. Dan is opnieuw testen, of de 20-minutentest kiezen, het overwegen waard.",
    ],
    limits: [
      "De meeste studies zijn klein en gedaan bij getrainde mannen.",
      "CP en eFTP zijn zelf ook schattingen. Ze zeggen alleen iets als je de laatste tijd ook echt hard hebt gereden.",
      "Hoe vaak je moet testen is niet onderzocht. Acht weken is een keuze van ZWB.",
      "Dat explosieve renners op de ramptest hoger uitkomen, volgt uit hoe de test werkt (de hoogste minuut leunt op je anaerobe reserve); als zodanig gemeten is het niet.",
    ],
    sources: [
      BORSZCZ_2018,
      BORSZCZ_2019,
      MCGRATH_2019,
      INGLIS_2020,
      VALENZUELA_2018,
      WONG_2023,
      TRAMONTIN_2021,
      AZEVEDO_2023,
      KARSTEN_2021,
    ],
  },
  {
    slug: "opbouwen",
    category: "piek",
    title: "Opbouwen: hoe snel mag het?",
    summary:
      "Geleidelijk opbouwen en grote sprongen vermijden helpt. Dat het precies 10 % per week moet zijn, is nooit aangetoond.",
    points: [
      "In een proef met ruim vijfhonderd beginnende hardlopers gaf een schema volgens de 10 %-regel evenveel blessures als een gewoon schema.",
      "Tussen 10 en 24 % opbouw per week werd geen verschil gevonden; wie in twee weken meer dan 30 % bijdeed, had wel vaker overbelastingsklachten.",
      "Een te lage belasting is ook een risico. Bij duursporters, ook fietsers, was het risico op klachten het laagst met weinig pieken en een flinke belasting over vier weken. Daarom plant ZWB een opbouwweek nooit onder wat je nu al rijdt.",
      "ZWB houdt 10 % per week aan als voorzichtige standaard en vermijdt sprongen van meer dan een kwart.",
      "Fitness, vermoeidheid en vorm (CTL, ATL en TSB) komen uit een rekenmodel. Op groepsniveau past dat redelijk, maar per renner zijn de onderliggende tijden erg onzeker. De grenzen die ZWB op TSB legt, zijn daarom afspraken, geen metingen.",
      "Na een pauze van twee tot vier weken zakken je VO2max en bloedvolume al merkbaar; wat je recent hebt opgebouwd, verlies je het snelst. Na meer dan tien dagen rust begint het schema daarom lager en bouwt het in een week of twee terug op.",
    ],
    limits: [
      "Bijna al het onderzoek naar opbouw en blessures is bij hardlopers gedaan. Fietsen belast je lichaam anders, en voor fietsers zijn er geen vergelijkbare proeven.",
      "Herstelweken (twee tot vier opbouwweken en dan een rustigere week) zijn gangbaar bij coaches, maar niet als zodanig onderzocht.",
    ],
    sources: [
      BUIST_2008,
      NIELSEN_2014,
      DAMSTED_2018,
      GABBETT_2020,
      JOHNSTON_2019,
      IMPELLIZZERI_2020,
      HELLARD_2006,
      MUJIKA_PADILLA_2001,
    ],
  },
  {
    slug: "warming-up",
    category: "piek",
    title: "Warming-up",
    summary:
      "Een warming-up helpt vooral bij korte, harde wedstrijden. Voor een inspanning van twintig minuten of langer maakt hij weinig uit, en sprints erin geven geen extra duurvermogen.",
    points: [
      "Voor een tijdrit van drie kilometer was een warming-up 2,8 procent sneller dan geen. Licht of zwaar maakte niet uit; de winst zat in de eerste kilometer.",
      "Voor een tijdrit van twintig minuten maakte geen, een gewone of een warming-up met sprints per saldo niets uit. Met sprints begon je alleen harder.",
      "Korte, maximale activaties verbeterden duurprestaties niet in een meta-analyse van 35 studies.",
      "Voor een FTP-test werkte een korte warming-up met een paar versnellingen beter dan een lange met een zwaar blok.",
      "De warming-ups bij een race in ZWB volgen dit: kort en licht voor een lange wedstrijd, meer activatie voor een korte race met een harde start.",
    ],
    limits: [
      "Geen onderzoek vergelijkt warming-ups per soort Zwift-race; de keuze per race is een afleiding.",
      "Bijna alle proeven zijn gedaan met getrainde mannen in een lab.",
    ],
    sources: [HAJOGLOU_2005, BARRANCO_GIL_2020, VASCONCELOS_2023, TRAMONTIN_2021],
  },
  {
    slug: "taper",
    category: "piek",
    title: "Taper naar een wedstrijd",
    summary:
      "Voor een belangrijke wedstrijd haal je volume weg, maar houd je de intensiteit en het aantal trainingen gelijk.",
    points: [
      "Twee meta-analyses vonden de beste prestatie bij een taper van hooguit drie weken waarin het volume met 41 tot 60 procent zakt.",
      "Intensiteit en het aantal trainingen per week blijven gelijk; die weghalen kost juist vorm.",
      "Een korte, zware week vóór de taper versterkt het effect. Bij elite-fietsers gaf zes dagen dagelijks hard werk gevolgd door vijf dagen taper meer winst dan elf dagen alleen taperen.",
      "De AI-coach tapert zo naar een A-mikpunt en naar een eendaags doel, en zet er een korte zware week voor als je herstelwaarden dat toelaten.",
    ],
    limits: [
      "De winst ligt rond enkele procenten op tijdrit en uithoudingsvermogen; VO2max verandert niet.",
      "Voor een reeks races, zoals de ZRL, is een lange taper geen goed idee: dan train je niet meer door.",
    ],
    sources: [BOSQUET_2007, WANG_2023, RONNESTAD_VIKMOEN_2019],
  },
  {
    slug: "herstel-meten",
    category: "herstel",
    title: "Herstel meten: HRV, rusthartslag en slaap",
    summary:
      "Je horloge meet elke nacht je HRV en rusthartslag. Eén ochtend zegt weinig; een week vergeleken met je eigen normale waarden zegt wel iets.",
    points: [
      "HRV schommelt van dag tot dag flink. Daarom kijkt ZWB naar het gemiddelde van de laatste week, niet naar één nacht.",
      "Dat weekgemiddelde wordt vergeleken met je eigen normale band: wat je de dertig dagen daarvoor gewoon was, met een marge die past bij hoeveel jouw metingen van nature schommelen.",
      "Zakt je HRV onder die band, of stijgt je rusthartslag erboven, dan is dat een teken van vermoeidheid. Het schema wordt dan voorzichtiger.",
      "Een HRV boven je band is niet altijd goed nieuws. Bij sporters die bewust te zwaar trainden, steeg het weekgemiddelde juist. Bij zware belasting telt een hoge HRV daarom niet als geruststelling.",
      "Wielrenners die op HRV, rusthartslag en hun eigen gevoel samen trainden, gingen er meer op vooruit dan op HRV alleen. ZWB weegt daarom ook mee hoe een rit voelde.",
      "Een korte nacht kost prestatie: gemiddeld enkele procenten na een nacht van zes uur of minder, vooral als je daarna lang wakker bent.",
    ],
    limits: [
      "Het onderzoek naar sturen op HRV is klein, en de winst ten opzichte van een vast schema is bescheiden.",
      "Horloges en ringen meten HRV 's nachts, de studies meestal 's ochtends met een borstband. Hoe goed die metingen overeenkomen, verschilt per apparaat.",
      "De marge van de band (een halve standaardafwijking) is de gangbare keuze in onderzoek; de ondergrens van 3 % voor heel stabiele metingen is een eigen keuze van ZWB.",
    ],
    sources: [
      PLEWS_2013,
      BUCHHEIT_2014,
      VESTERINEN_2016,
      JAVALOYES_2019,
      LE_MEUR_2013,
      MANRESA_ROCAMORA_2021,
      ALFONSO_2025,
      CRAVEN_2022,
    ],
  },
  {
    slug: "hittetraining",
    category: "omstandigheden",
    title: "Hittetraining",
    summary:
      "Een week tot twee weken dagelijks het warm hebben maakt je beter bestand tegen de hitte. Vijf weken hittetraining verhoogt ook je hemoglobine.",
    points: [
      "Al na vijf tot veertien dagen daalt je kerntemperatuur en hartslag in de warmte en neemt je bloedplasma toe.",
      "Een heet bad van ongeveer 40 °C direct na een gewone training werkte in een proef net zo: na zes dagen ging een tijdrit in de warmte ongeveer 5 procent sneller.",
      "Elke extra hittesessie geeft meer aanpassing; langere en warmere sessies werken sterker.",
      "Vijf weken vijf keer per week 50 minuten in de hitte verhoogde de hemoglobinemassa bij renners met ongeveer 2 tot 4 procent, vergelijkbaar met een hoogtestage. Bij vrouwen werkte het net zo goed (4,0 tegen 3,5 procent bij mannen), met betere prestaties in normale temperatuur.",
      "Stop je, dan is het effect binnen twee weken verdwenen. Drie keer per week hield de hemoglobine op peil, ook na een hoogtestage.",
      "Een thermopak werkte even goed als een hittekamer. Thuis fietsen met extra kleding maakte getrainde vrouwen in tien dagen beter bestand tegen hitte.",
      "In de studies met een hittepak reden renners tot hun kerntemperatuur rond 38,5 °C lag. Met een CORE-sensor zie je of je daar komt; de app leest hem uit intervals.icu bij een hitteprotocol.",
    ],
    limits: [
      "De meeste proeven zijn klein, en het werk aan hemoglobine komt grotendeels van één onderzoeksgroep.",
      "Thuis met extra kleding verhoogde in de enige proef (tien dagen, vrouwen) de hemoglobine niet; daarvoor zijn vijf weken nodig, en dat is thuis niet getest.",
      "Het bad is getest na hardlopen bij mannen die niet aan de warmte gewend waren.",
      "Een CORE-sensor schat de kerntemperatuur vanaf de huid; in een validatiestudie bij fietsers week ongeveer de helft van de metingen meer dan 0,3 °C af van een rectale meting.",
    ],
    sources: [
      RACINAIS_2015,
      ZURAWLEW_2016,
      MCDONALD_2025,
      OBERHOLZER_2019,
      RONNESTAD_HEAT_2022,
      LUNDBY_2023,
      LUNDBY_2021,
      RICHARD_2025,
      CUBEL_2024,
      RONNESTAD_HEAT_2024,
      VERDEL_2021,
    ],
  },
  {
    slug: "ademspiertraining",
    category: "naast-de-fiets",
    title: "Ademspiertraining",
    summary:
      "Inademen tegen weerstand maakt je ademspieren sterker. Bij renners ging een tijdrit daarna wat sneller.",
    points: [
      "In een dubbelblinde proef reden renners na zes weken twee keer per dag dertig ademhalingen tegen weerstand een tijdrit van 20 en 40 km 4 tot 5 procent sneller.",
      "Meta-analyses vinden een kleinere winst, die groter is bij minder getrainde mensen en bij langere inspanningen. Een latere meta-analyse bij sporters vond een gematigd effect op prestatie.",
      "In een tweede proef met fietsers ging een tijdrit van 25 km na zes weken 2,7 procent sneller.",
      "Je ziet het effect in een tijdrit, niet in een oplopende test.",
    ],
    limits: [
      "De meeste studies zijn klein, en de opzet verschilt sterk.",
      "Een proef met een nep-ademtrainer als vergelijking vond bij gezonde jonge mannen na vier weken geen winst boven die placebo.",
    ],
    sources: [ROMER_2002, ILLI_2012, HAJGHANBARI_2013, KARSTEN_IMT_2018, JOHNSON_2007, NOTTER_2023],
  },
  {
    slug: "koud-na-training",
    category: "naast-de-fiets",
    title: "Koud water na de training",
    summary:
      "Een ijsbad na de training remt vooral de winst van krachttraining. Voor duurwerk lijkt het weinig uit te maken.",
    points: [
      "Na krachttraining remt regelmatig koud water de toename van kracht en spiermassa; een meta-analyse vond een duidelijk nadelig effect.",
      "Na duurtraining maakte het in dezelfde meta-analyse niets uit voor tijdrit en maximaal vermogen.",
      "Bewaar het voor momenten waarop snel herstel telt, zoals een meerdaagse koers.",
    ],
    limits: ["Het onderzoek naar duurtraining is beperkt, vooral op de lange termijn."],
    sources: [BROATCH_2018, MALTA_2021],
  },
];

export function trainingArticleBySlug(slug: string): TrainingArticle | null {
  return TRAINING_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function trainingArticlesByCategory(): { category: TrainingCategory; articles: TrainingArticle[] }[] {
  return TRAINING_CATEGORIES.map((category) => ({
    category,
    articles: TRAINING_ARTICLES.filter((article) => article.category === category),
  })).filter((group) => group.articles.length > 0);
}
