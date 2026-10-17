// De kennisbank kracht, core en mobiliteit.
//
// Zelfde opzet als de kennisbibliotheek voeding (src/lib/nutrition/library.ts):
// in code, zodat elke bewering en elke bron via een commit gaat, en
// tests/unit/strength-library.test.ts bewaakt dat er bij elk artikel een
// navolgbare bron staat.
//
// De onderbouwing van de krachtartikelen, met wat niet te controleren was,
// staat uitgebreider in docs/kracht-literatuur.md. Teksten zijn eigen
// samenvattingen; we citeren de bronnen niet letterlijk. Van de meeste bronnen
// is alleen de samenvatting gelezen.

import type { ArticleEvidence } from "@/lib/knowledge/evidence";
import type { EvidenceKind } from "@/lib/nutrition/library";

export const STRENGTH_CATEGORIES = ["kracht", "core", "mobiliteit"] as const;
export type StrengthCategory = (typeof STRENGTH_CATEGORIES)[number];

export const STRENGTH_CATEGORY_LABELS: Record<StrengthCategory, string> = {
  kracht: "Kracht",
  core: "Core en rug",
  mobiliteit: "Rekken en losmaken",
};

export type StrengthSource = {
  citation: string;
  year: number;
  url: string;
  kind: EvidenceKind;
};

export type StrengthArticle = {
  slug: string;
  category: StrengthCategory;
  /** Hoe gegrond het centrale advies is; zie src/lib/knowledge/evidence.ts. */
  evidence: ArticleEvidence;
  title: string;
  summary: string;
  points: string[];
  /** Wat de bronnen níét laten zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  sources: StrengthSource[];
  /** Series waar dit artikel de onderbouwing van is (slug uit mobility_series). */
  series?: string[];
};

const doi = (id: string) => `https://doi.org/${id}`;

const RONNESTAD_2010A: StrengthSource = {
  citation:
    "Rønnestad BR, Hansen EA, Raastad T. Effect of heavy strength training on thigh muscle cross-sectional area, performance determinants, and performance in well-trained cyclists. Eur J Appl Physiol 108:965-975.",
  year: 2010,
  url: doi("10.1007/s00421-009-1307-z"),
  kind: "studie",
};

const RONNESTAD_2010B: StrengthSource = {
  citation:
    "Rønnestad BR, Hansen EA, Raastad T. In-season strength maintenance training increases well-trained cyclists' performance. Eur J Appl Physiol 110:1269-1282.",
  year: 2010,
  url: doi("10.1007/s00421-010-1622-4"),
  kind: "studie",
};

const VIKMOEN_2016: StrengthSource = {
  citation:
    "Vikmoen O, Ellefsen S, Trøen Ø, Hollan I, Hanestadhaugen M, Raastad T, Rønnestad BR. Strength training improves cycling performance, fractional utilization of VO2max and cycling economy in female cyclists. Scand J Med Sci Sports 26:384-396.",
  year: 2016,
  url: doi("10.1111/sms.12468"),
  kind: "studie",
};

const VIKMOEN_2017: StrengthSource = {
  citation:
    "Vikmoen O, Rønnestad BR, Ellefsen S, Raastad T. Heavy strength training improves running and cycling performance following prolonged submaximal work in well-trained female athletes. Physiol Rep 5(5):e13149.",
  year: 2017,
  url: doi("10.14814/phy2.13149"),
  kind: "studie",
};

const RONNESTAD_MUJIKA_2014: StrengthSource = {
  citation:
    "Rønnestad BR, Mujika I. Optimizing strength training for running and cycling endurance performance: A review. Scand J Med Sci Sports 24:603-612.",
  year: 2014,
  url: doi("10.1111/sms.12104"),
  kind: "review",
};

const LLANOS_LAGOS_2026: StrengthSource = {
  citation:
    "Llanos-Lagos C, Ramirez-Campillo R, Sáez de Villarreal E. Heavy strength training effects on physiological determinants of endurance cyclist performance: a systematic review with meta-analysis. Eur J Appl Physiol 126:193-222.",
  year: 2026,
  url: doi("10.1007/s00421-025-05883-2"),
  kind: "review",
};

const SCHOENFELD_2017: StrengthSource = {
  citation:
    "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. J Strength Cond Res 31:3508-3523.",
  year: 2017,
  url: doi("10.1519/JSC.0000000000002200"),
  kind: "review",
};

const OLMEDILLAS_2012: StrengthSource = {
  citation:
    "Olmedillas H, González-Agüero A, Moreno LA, Casajus JA, Vicente-Rodríguez G. Cycling and bone health: a systematic review. BMC Med 10:168.",
  year: 2012,
  url: doi("10.1186/1741-7015-10-168"),
  kind: "review",
};

const CLARSEN_2010: StrengthSource = {
  citation:
    "Clarsen B, Krosshaug T, Bahr R. Overuse injuries in professional road cyclists. Am J Sports Med 38:2494-2501.",
  year: 2010,
  url: doi("10.1177/0363546510376816"),
  kind: "studie",
};

const VAN_HOOF_2012: StrengthSource = {
  citation:
    "Van Hoof W, Volkaerts K, O'Sullivan K, Verschueren S, Dankaerts W. Comparing lower lumbar kinematics in cyclists with low back pain (flexion pattern) versus asymptomatic controls: field study using a wireless posture monitoring system. Man Ther 17:312-317.",
  year: 2012,
  url: doi("10.1016/j.math.2012.02.012"),
  kind: "studie",
};

const STREISFELD_2017: StrengthSource = {
  citation:
    "Streisfeld GM, Bartoszek C, Creran E, Inge B, McShane MD, Johnston T. Relationship Between Body Positioning, Muscle Activity, and Spinal Kinematics in Cyclists With and Without Low Back Pain: A Systematic Review. Sports Health 9:75-79.",
  year: 2017,
  url: doi("10.1177/1941738116676260"),
  kind: "review",
};

const RODRIGUEZ_PEREA_2023: StrengthSource = {
  citation:
    "Rodríguez-Perea Á, Reyes-Ferrada W, Jerez-Mayorga D, Chirosa Ríos L, Van den Tillar R, Chirosa Ríos I, Martínez-García D. Core training and performance: a systematic review with meta-analysis. Biol Sport 40:975-992.",
  year: 2023,
  url: doi("10.5114/biolsport.2023.123319"),
  kind: "review",
};

const SADLER_2017: StrengthSource = {
  citation:
    "Sadler SG, Spink MJ, Ho A, De Jonge XJ, Chuter VH. Restriction in lateral bending range of motion, lumbar lordosis, and hamstring flexibility predicts the development of low back pain: a systematic review of prospective cohort studies. BMC Musculoskelet Disord 18:179.",
  year: 2017,
  url: doi("10.1186/s12891-017-1534-0"),
  kind: "review",
};

const BEHM_2016: StrengthSource = {
  citation:
    "Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals: a systematic review. Appl Physiol Nutr Metab 41:1-11.",
  year: 2016,
  url: doi("10.1139/apnm-2015-0235"),
  kind: "review",
};

// Hertoetst in de wetenschappelijke toets, fase 4 (2026-10-16). DOI's via PubMed
// bevestigd; zie docs/wetenschappelijke-toets.md.
export const BARRANCO_GIL_2024_RT: StrengthSource = {
  citation:
    "Barranco-Gil D, Hernández-Belmonte A, Rodríguez-Rielves V, et al. Off- and on-bike resistance training in cyclists: a randomized controlled trial. Med Sci Sports Exerc 57(2):296-304.",
  year: 2024,
  url: doi("10.1249/MSS.0000000000003556"),
  kind: "studie",
};

export const PALLARES_2025: StrengthSource = {
  citation:
    "Pallarés JG, Barranco-Gil D, Rodríguez-Rielves V, et al. Cyclists do not need to incorporate off-bike resistance training to increase strength, muscle-tendon structure, and pedaling performance: exploring a high-intensity on-bike method. Biol Sport 42(3):185-195.",
  year: 2025,
  url: doi("10.5114/biolsport.2025.146790"),
  kind: "studie",
};

export const VALENZUELA_2021_RT: StrengthSource = {
  citation:
    "Valenzuela PL, Gil-Cabrera J, Talavera E, et al. On- versus off-bike power training in professional cyclists: a randomized controlled trial. Int J Sports Physiol Perform 16(5):674-681.",
  year: 2021,
  url: doi("10.1123/ijspp.2020-0305"),
  kind: "studie",
};

const JI_2021: StrengthSource = {
  citation:
    "Ji S, Donath L, Wahl P. Effects of alternating unilateral vs. bilateral resistance training on sprint and endurance cycling performance in trained endurance athletes: a 3-armed, randomized, controlled, pilot trial. J Strength Cond Res 36(12):3280-3289.",
  year: 2021,
  url: doi("10.1519/JSC.0000000000004105"),
  kind: "studie",
};

const MONTALVO_PEREZ_2021: StrengthSource = {
  citation:
    "Montalvo-Pérez A, Alejo LB, Valenzuela PL, et al. Traditional versus velocity-based resistance training in competitive female cyclists: a randomized controlled trial. Front Physiol 12:586113.",
  year: 2021,
  url: doi("10.3389/fphys.2021.586113"),
  kind: "studie",
};

const KRISTOFFERSEN_2019: StrengthSource = {
  citation:
    "Kristoffersen M, Sandbakk Ø, Rønnestad BR, Gundersen H. Comparison of short-sprint and heavy strength training on cycling performance. Front Physiol 10:1132.",
  year: 2019,
  url: doi("10.3389/fphys.2019.01132"),
  kind: "studie",
};

const SPIERING_2021: StrengthSource = {
  citation:
    "Spiering BA, Mujika I, Sharp MA, Foulis SA. Maintaining physical performance: the minimal dose of exercise needed to preserve endurance and strength over time. J Strength Cond Res 35(5):1449-1458.",
  year: 2021,
  url: doi("10.1519/JSC.0000000000003964"),
  kind: "review",
};

const LOPEZ_2021: StrengthSource = {
  citation:
    "Lopez P, Radaelli R, Taaffe DR, et al. Resistance training load effects on muscle hypertrophy and strength gain: systematic review and network meta-analysis. Med Sci Sports Exerc 53(6):1206-1216.",
  year: 2021,
  url: doi("10.1249/MSS.0000000000002585"),
  kind: "review",
};

const CURRIER_2026: StrengthSource = {
  citation:
    "Currier BS, D'Souza AC, Singh MAF, et al. American College of Sports Medicine position stand. Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: an overview of reviews. Med Sci Sports Exerc 58(4):851-872.",
  year: 2026,
  url: doi("10.1249/MSS.0000000000003897"),
  kind: "consensus",
};

const VIKESTAD_2024: StrengthSource = {
  citation:
    "Vikestad V, Dalen T. Effect of strength and endurance training sequence on endurance performance. Sports 12(8):226.",
  year: 2024,
  url: doi("10.3390/sports12080226"),
  kind: "review",
};

const HELD_2026: StrengthSource = {
  citation:
    "Held S, Wolf L, Rappelt L, et al. Maximizing adaptations in concurrent training: an umbrella review of meta-analyses. Sports Med 56(6):1489-1512.",
  year: 2026,
  url: doi("10.1007/s40279-026-02401-y"),
  kind: "review",
};

const PETRE_2021: StrengthSource = {
  citation:
    "Petré H, Hemmingsson E, Rosdahl H, Psilander N. Development of maximal dynamic strength during concurrent resistance and endurance training in untrained, moderately trained, and trained individuals: a systematic review and meta-analysis. Sports Med 51(5):991-1010.",
  year: 2021,
  url: doi("10.1007/s40279-021-01426-9"),
  kind: "review",
};

const HUIBERTS_2023: StrengthSource = {
  citation:
    "Huiberts RO, Wüst RCI, van der Zwaard S. Concurrent strength and endurance training: a systematic review and meta-analysis on the impact of sex and training status. Sports Med 54(2):485-503.",
  year: 2023,
  url: doi("10.1007/s40279-023-01943-9"),
  kind: "review",
};

const FLORENCE_2023: StrengthSource = {
  citation:
    "Florence GE, Oosthuyse T, Bosch AN. Skeletal site-specific effects of jump training on bone mineral density in adults: a systematic review and meta-analysis. J Sports Sci 41(23):2063-2076.",
  year: 2023,
  url: doi("10.1080/02640414.2024.2312052"),
  kind: "review",
};

const HILKENS_2023: StrengthSource = {
  citation:
    "Hilkens L, van Schijndel N, Weijer VCR, et al. Jumping exercise combined with collagen supplementation preserves bone mineral density in elite cyclists. Int J Sport Nutr Exerc Metab 34(1):38-47.",
  year: 2023,
  url: doi("10.1123/ijsnem.2023-0080"),
  kind: "studie",
};

const FLORVAG_2025: StrengthSource = {
  citation:
    "Florvåg AG, Berg ØA, Røksund OD, et al. Exercise interventions to improve bone mineral density in athletes participating in low-impact sports: a scoping review. BMC Musculoskelet Disord 26(1):73.",
  year: 2025,
  url: doi("10.1186/s12891-025-08316-5"),
  kind: "review",
};

const BARRAJON_2026: StrengthSource = {
  citation:
    "Barrajón C, Legaz-Arrese A, Cirer-Sastre R, et al. Effects of bike-fitting on lower back pain in cyclists: a systematic review. Cureus 18(1):e101718.",
  year: 2026,
  url: doi("10.7759/cureus.101718"),
  kind: "review",
};

const SMRCINA_2022: StrengthSource = {
  citation:
    "Smrcina Z, Woelfel S, Burcal C. A systematic review of the effectiveness of core stability exercises in patients with non-specific low back pain. Int J Sports Phys Ther 17(5):766-774.",
  year: 2022,
  url: doi("10.26603/001c.37251"),
  kind: "review",
};

const WARNEKE_2024: StrengthSource = {
  citation:
    "Warneke K, Lohmann LH. Revisiting the stretch-induced force deficit: a systematic review with multilevel meta-analysis of acute effects. J Sport Health Sci 13(6):805-819.",
  year: 2024,
  url: doi("10.1016/j.jshs.2024.05.002"),
  kind: "review",
};

const LI_2023: StrengthSource = {
  citation:
    "Li FY, Guo CG, Li HS, et al. A systematic review and net meta-analysis of the effects of different warm-up methods on the acute effects of lower limb explosive strength. BMC Sports Sci Med Rehabil 15(1):106.",
  year: 2023,
  url: doi("10.1186/s13102-023-00703-6"),
  kind: "review",
};

const DEL_VECCHIO_2019: StrengthSource = {
  citation:
    "Del Vecchio L, Stanton R, Reaburn P, et al. Effects of combined strength and sprint training on lean mass, strength, power, and sprint performance in masters road cyclists. J Strength Cond Res 33(1):66-79.",
  year: 2019,
  url: doi("10.1519/JSC.0000000000001960"),
  kind: "studie",
};

export const STRENGTH_ARTICLES: StrengthArticle[] = [
  {
    slug: "zwaar-krachtwerk-en-fietsen",
    category: "kracht",
    evidence: "matig",
    title: "Maakt zwaar krachtwerk je sneller op de fiets?",
    summary:
      "In studies bij goed getrainde renners wel: zware beentraining naast het fietsen verbeterde fietseconomie en het vermogen in langere tests. De groepen zijn klein en de zekerheid is laag.",
    points: [
      "Twaalf weken zware beentraining, twee keer per week naast de gewone duurtraining, verbeterde bij goed getrainde renners het vermogen in een test van 40 minuten en het vermogen bij een lage lactaatwaarde.",
      "Bij goed getrainde vrouwelijke renners gaf elf weken hetzelfde beeld: meer vermogen over 40 minuten en een betere fietseconomie.",
      "De bovenbeenspier werd groter zonder dat de renners zwaarder werden.",
      "Een overzichtsstudie over 17 studies en 262 renners vond een effect op fietsefficiëntie, sprintvermogen en fietsprestatie, en geen effect op VO2max.",
      "Het gaat om zwaar werk: gewichten waarmee je vier tot tien herhalingen haalt. Een overzichtsartikel raadt voor fietseconomie zware training aan.",
      "Nieuwere proeven bij goed getrainde mannen wijzen dezelfde kant op: tien weken squats verhoogden het maximale aerobe vermogen, en eenbenig of tweebenig trainen verbeterde allebei de tijdrit.",
      "In een kortere proef van zes weken met vrouwelijke renners kwam er wel kracht bij, maar nog geen extra duurvermogen.",
      "Voor je sprint werkt sprinttraining op de fiets beter: korte sprints gaven meer sprintvermogen, zwaar krachtwerk gaf meer kracht.",
    ],
    limits: [
      "De studies zijn klein: zes tot elf renners in de krachtgroep.",
      "De overzichtsstudie noemt de zekerheid van het bewijs zelf laag en doet daarom geen stevige aanbeveling over de beste invulling.",
      "De deelnemers waren goed getraind en werden begeleid. Of het bij recreatieve renners zonder begeleiding net zo uitpakt, is niet onderzocht.",
      "De meta-analyse vond geen verschil naar geslacht, niveau of aantal sessies per week; welke invulling het best werkt, weten we dus niet.",
    ],
    sources: [
      RONNESTAD_2010A,
      VIKMOEN_2016,
      RONNESTAD_MUJIKA_2014,
      LLANOS_LAGOS_2026,
      PALLARES_2025,
      JI_2021,
      MONTALVO_PEREZ_2021,
      KRISTOFFERSEN_2019,
    ],
    series: ["gym-opbouw-1", "gym-opbouw-2", "gym-opbouw-3"],
  },
  {
    slug: "het-gymprogramma",
    category: "kracht",
    evidence: "beperkt",
    title: "Het gymprogramma: opbouw in drie blokken",
    summary:
      "De gymseries volgen één beschreven onderzoeksprogramma: vier beenoefeningen, drie sets, twee keer per week, van tien naar zes herhalingen.",
    points: [
      "Vier oefeningen die op de trapbeweging lijken: halve squat, eenbenige leg press, staande eenbenige heupbuiging en kuitheffen.",
      "Drie sets per oefening, twee sessies per week.",
      "Week 1 tot 3: tien herhalingen in de eerste sessie van de week en zes in de tweede. Week 4 tot 6: acht en vijf. Daarna: zes en vier.",
      "Het gewicht is zo gekozen dat het genoemde aantal herhalingen net lukt, en gaat omhoog zodra het makkelijker wordt.",
      "In de studie was er de eerste twee weken bij elke sessie een begeleider, daarna bij minstens één per week.",
    ],
    limits: [
      "De rust tussen sets staat niet in de bron. De 120 seconden in de app zijn een eigen keuze.",
      "De bron gebruikt een Smith-machine voor de halve squat; de app beschrijft een halterstang in een rek.",
      "De bron duurde elf weken; in de app loopt het derde blok tot week 12, zoals in de oudere studies.",
      "Een serie in de app heeft één aantal herhalingen. De zwaardere tweede sessie van de week staat daarom in de ondertitel.",
      "De app noemt geen kilo's en kan je techniek niet zien. Heb je nooit met een halterstang getraind, laat een trainer meekijken.",
    ],
    sources: [VIKMOEN_2017, RONNESTAD_2010A],
    series: ["gym-opbouw-1", "gym-opbouw-2", "gym-opbouw-3"],
  },
  {
    slug: "kracht-onderhouden-in-het-seizoen",
    category: "kracht",
    evidence: "matig",
    title: "Kracht vasthouden in het seizoen",
    summary:
      "Na twaalf weken opbouw hield één zware sessie per week de winst in spieromvang en kracht dertien weken vast.",
    points: [
      "Renners deden twaalf weken twee keer per week zware krachttraining en daarna, in het wedstrijdseizoen, dertien weken één keer per week.",
      "Spieromvang en kracht bleven op het niveau van na de opbouw.",
      "Over de hele periode verbeterden het maximale aerobe vermogen en het vermogen over 40 minuten meer dan bij renners die alleen fietsten.",
      "Een overzicht over onderhoud: één sessie per week houdt kracht en spier vast zolang het gewicht zwaar blijft. Bij ouderen zijn mogelijk twee sessies nodig.",
      "Renners die tien weken helemaal geen kracht deden, verloren kracht en dijspier.",
    ],
    limits: [
      "Zes renners per groep.",
      "Hoe de onderhoudssessie er precies uitzag, was voor ons niet te controleren. De twee sets van vijf in de app zijn een eigen invulling; uit de bron komt alleen de frequentie.",
      "Wat stoppen kost voor je fietsprestatie, is niet duidelijk: in de studie waar renners stopten, daalden kracht en spier, maar niet meetbaar hun fietswaarden.",
    ],
    sources: [RONNESTAD_2010B, SPIERING_2021, PALLARES_2025],
    series: ["gym-onderhoud"],
  },
  {
    slug: "thuis-met-lichtere-gewichten",
    category: "kracht",
    evidence: "matig",
    title: "Thuis met lichtere gewichten",
    summary:
      "Met lichtere gewichten groeit de spier vergelijkbaar als je de sets dicht bij het einde van je kunnen brengt. Maximale kracht bouw je beter op met zware gewichten.",
    points: [
      "Een overzichtsstudie over 21 studies vergeleek lichte gewichten (tot 60% van wat je één keer kunt) met zware. Alle sets gingen door tot de spier het niet meer kon.",
      "De spiergroei was vergelijkbaar. De maximale kracht nam meer toe met zware gewichten.",
      "De thuisserie gebruikt daarom dezelfde vier bewegingen als het gymprogramma, met een dumbbell of kettlebell en een band, en vraagt om door te gaan tot je er nog ongeveer twee herhalingen over hebt.",
      "Een latere netwerk-meta-analyse en het ACSM-standpunt van 2026 bevestigen dit: voor kracht werkt zwaar gewicht (vanaf ongeveer 80 procent van wat je één keer kunt) het best.",
    ],
    limits: [
      "De deelnemers waren geen wielrenners.",
      "Of trainen met lichtere gewichten je sneller maakt op de fiets is niet onderzocht: de studies bij renners gebruikten zware gewichten.",
      "In de studies gingen de sets door tot falen. De app houdt twee herhalingen over; dat is een eigen, voorzichtiger keuze.",
      "Voor de series met alleen je eigen gewicht geldt dit nog sterker: die maken je benen en romp belastbaarder, maar een effect op je vermogen mag je er niet van verwachten.",
    ],
    sources: [SCHOENFELD_2017, LOPEZ_2021, CURRIER_2026],
    series: ["kracht-thuis-gewicht", "kracht-basis", "kracht-klimmen", "kracht-eenbenig"],
  },
  {
    slug: "kracht-en-fietsen-combineren",
    category: "kracht",
    evidence: "matig",
    title: "Kracht en fietsen combineren",
    summary:
      "De studies deden twee krachtsessies per week naast de gewone duurtraining. Volgorde en dag maken voor je duurvermogen weinig uit; de regels in de app gaan over spierpijn vóór je sleutelsessie.",
    points: [
      "In de studies bij renners kwamen er twee krachtsessies per week bij de normale duurtraining, die gewoon doorging.",
      "De app stelt een krachtserie alleen voor op een dag zonder geplande training en zonder rit, minstens drie dagen na de vorige krachtsessie en hooguit twee keer per week.",
      "Series die materiaal vragen (halterstang, apparaat, dumbbell, band) stelt de app nooit uit zichzelf voor: je kiest ze zelf. Ze tellen wel mee voor de rust ertussen.",
      "Een krachtsessie telt niet mee in je trainingsbelasting, CTL of naleving.",
      "Meta-analyses vonden dat de volgorde van kracht en duur weinig uitmaakt voor je duurvermogen.",
      "Krachtwinst lijdt vooral als je beide in één sessie doet, bij getrainde mensen, en bij mannen meer dan bij vrouwen. Gescheiden sessies op één dag gaven dat nadeel niet.",
      "De serie Springen voor je botten telt niet mee voor de rust tussen krachtsessies: die is kort en mag ook op een fietsdag.",
    ],
    limits: [
      "De studies naar combineren gingen meestal over niet-wielrenners en maten vooral kracht en VO2max, niet je prestatie in een wedstrijd.",
      "De drie dagen rust en \"alleen op een rustdag\" komen niet uit de studies en zijn voorzichtiger dan nodig voor je duurvermogen. Ze moeten voorkomen dat spierpijn in je volgende sleutelsessie zit.",
    ],
    sources: [RONNESTAD_2010A, VIKMOEN_2017, RONNESTAD_MUJIKA_2014, VIKESTAD_2024, HELD_2026, PETRE_2021, HUIBERTS_2023],
  },
  {
    slug: "wielrennen-en-botdichtheid",
    category: "kracht",
    evidence: "matig",
    title: "Wielrennen en je botten",
    summary:
      "Wegwielrenners die veel trainen hebben vaak een lage botdichtheid. Fietsen alleen geeft je botten te weinig prikkel; springen kan helpen.",
    points: [
      "Een overzichtsstudie over 31 studies vond bij volwassen wegwielrenners een lage botdichtheid op belangrijke plekken, zoals de lendenwervels.",
      "Mountainbiken, of fietsen combineren met een andere sport, lijkt dat effect te verkleinen.",
      "De auteurs zoeken de oorzaak in de vele uren zittend op de fiets, waarbij het zadel je gewicht draagt, en de rust daarna.",
      "Springen geeft wel een prikkel: bij volwassenen steeg de botdichtheid in de dijbeenhals met ongeveer 1,5 procent, bij rond de 50 sprongen vier keer per week.",
      "Bij topwielrenners bleef de botdichtheid in de dijbeenhals op peil met vijf keer per week vijf minuten springen, met collageen ervoor; zonder daalde ze.",
      "Daarom staat er een serie Springen voor je botten: vijf keer tien sprongen. Die mag ook op een fietsdag.",
    ],
    limits: [
      "Er zijn weinig studies bij renners. De topwielrenners kregen ook collageen, dus wat het springen alleen deed, is niet te scheiden.",
      "Springen belast knieën en enkels. Begin rustig, land zacht en stop bij pijn.",
      "Maak je je zorgen over je botdichtheid, of heb je botontkalking of gewrichtsklachten, bespreek dat dan eerst met je huisarts.",
    ],
    sources: [OLMEDILLAS_2012, FLORENCE_2023, HILKENS_2023, FLORVAG_2025],
    series: ["springen"],
  },
  {
    slug: "lage-rugpijn-bij-renners",
    category: "core",
    evidence: "beperkt",
    title: "Lage rugpijn bij wielrenners",
    summary:
      "Rugpijn is de meest voorkomende overbelasting bij renners. Renners met klachten zitten meetbaar ronder in hun onderrug.",
    points: [
      "Van 109 profrenners had 58% in het voorgaande jaar lage rugpijn gehad; 41% had er medische hulp voor gezocht. Wedstrijden missen kwam weinig voor.",
      "In een veldstudie reden renners met en zonder chronische lage rugpijn twee uur op hun eigen fiets. De renners met klachten zaten met een rondere onderrug en hun pijn nam in die twee uur toe.",
      "Een overzichtsstudie vond bij renners met rugpijn een rondere onderrug tijdens het fietsen, minder uithoudingsvermogen van de rugstrekkers en een onbalans in de aansturing van de rompspieren. Een lager stuur gaf meer buiging in de onderrug.",
      "De serie Zithouding richt zich daarom op het volhouden van je houding; Fundament op het uithoudingsvermogen van je romp.",
      "Een bikefit verminderde rugpijn in drie kleine studies.",
      "Stabiliteitsoefeningen voor de romp verminderden pijn bij mensen met niet-specifieke lage rugpijn, maar die studies gingen niet over renners.",
    ],
    limits: [
      "De veldstudie had acht renners met klachten en negen zonder, en vergeleek alleen. Of de houding de pijn veroorzaakt of andersom, laat ze niet zien.",
      "Dat de series in de app rugpijn voorkomen of verminderen, is niet onderzocht.",
      "Dit is geen behandeling. Bij aanhoudende klachten: ga naar een fysiotherapeut of huisarts.",
    ],
    sources: [CLARSEN_2010, VAN_HOOF_2012, STREISFELD_2017, BARRAJON_2026, SMRCINA_2022],
    series: ["zithouding", "fundament"],
  },
  {
    slug: "wat-core-training-doet",
    category: "core",
    evidence: "matig",
    title: "Wat core-training wel en niet doet",
    summary:
      "Core-training verbetert balans en sprongkracht bij gezonde mensen. Dat je er harder van fietst, is niet aangetoond.",
    points: [
      "Een overzichtsstudie over 22 studies vond dat core-training van minstens vier weken de balans duidelijk verbetert, en ook de verticale en horizontale sprong.",
      "De programma's in die studies duurden minimaal vier weken. De app telt daarom in blokken van 28 dagen en mikt op twee tot drie sessies per week.",
    ],
    limits: [
      "Geen van de uitkomsten in die studie is een fietsprestatie. Verwacht van core-werk geen extra watt.",
      "De deelnemers waren gezonde mensen uit allerlei sporten, geen wielrenners.",
      "Twee tot drie sessies per week is een eigen keuze van de app; de studie noemt in haar samenvatting geen beste frequentie.",
    ],
    sources: [RODRIGUEZ_PEREA_2023],
    series: ["fundament"],
  },
  {
    slug: "kracht-op-de-fiets",
    category: "kracht",
    evidence: "beperkt",
    title: "Kracht op de fiets",
    summary:
      "Korte, maximale trappen bergop in een groot verzet gaven bij goed getrainde renners evenveel kracht als squats in de sportschool, zonder extra klachten.",
    points: [
      "37 goed getrainde renners deden tien weken twee keer per week óf squats, óf trappen op de fiets met dezelfde zwaarte en hetzelfde volume, óf niets extra.",
      "Op de fiets: vijf sets van zeven trappen voluit vanuit stilstand op een helling van 6 procent, in een verzet waarbij de cadans rond 43 toeren lag. Tussen de sets vier minuten rust, en minstens drie dagen tussen twee sessies.",
      "Beide groepen werden even sterk, hun Wingate-vermogen steeg en hun maximale aerobe vermogen ging omhoog. De squatgroep kreeg iets meer stijfheid en pijn in de benen.",
      "Wie geen kracht deed, verloor in tien weken kracht en dijspier.",
      "Bij profs gaven sprints op de fiets en krachtwerk in de sportschool allebei een betere tijdrit.",
      "Dit is iets anders dan torque-intervallen van minuten op lage cadans: daarbij haal je maar de helft van je trapkracht, en het bewijs is wisselend.",
      "Het protocol Kracht op de fiets volgt deze opzet.",
    ],
    limits: [
      "Eén onderzoeksgroep, alleen goed getrainde mannen.",
      "Buiten op een helling. Of het op een smart trainer net zo werkt, met een vliegwiel en zonder echte helling, is niet getest.",
      "In de studie was de zwaarte gemeten als 70 procent van de maximale trapkracht. De app gebruikt de cadans als richtpunt, zoals de onderzoekers op de weg deden.",
    ],
    sources: [BARRANCO_GIL_2024_RT, PALLARES_2025, VALENZUELA_2021_RT],
  },
  {
    slug: "kracht-als-je-ouder-wordt",
    category: "kracht",
    evidence: "matig",
    title: "Kracht als je ouder wordt",
    summary:
      "Met de jaren verlies je spiermassa en sprintvermogen. Krachttraining remt dat af, en ouderen hebben er waarschijnlijk iets meer van nodig om het vast te houden.",
    points: [
      "Bij masters-wegrenners van rond de vijftig gaven twaalf weken kracht- en sprinttraining meer spiermassa in de benen en een betere sprint.",
      "Kracht en spier houd je vast met één zware sessie per week; bij ouderen zijn voor de spiermassa mogelijk twee sessies per week nodig.",
      "Het ACSM-standpunt van 2026: voor kracht werkt zwaar gewicht (vanaf ongeveer 80 procent van wat je één keer kunt), twee à drie sets, minstens twee keer per week.",
      "Krachttraining en springen zijn ook goed voor je botten, en die worden met de jaren kwetsbaarder; zie Wielrennen en je botten.",
      "De gymseries en de thuisserie gelden voor masters net zo. Bouw rustiger op als je lang niet met gewicht hebt getraind.",
    ],
    limits: [
      "Er zijn weinig studies met oudere renners zelf; die bij masters had 25 deelnemers en was niet volledig gerandomiseerd.",
      "Het advies van twee sessies voor ouderen komt uit onderzoek bij niet-sporters.",
    ],
    sources: [DEL_VECCHIO_2019, SPIERING_2021, CURRIER_2026],
    series: ["gym-onderhoud"],
  },
  {
    slug: "rekken-voor-de-rit",
    category: "mobiliteit",
    evidence: "matig",
    title: "Rekken vlak voor de rit",
    summary:
      "Lang statisch rekken vlak voor een inspanning kost kracht in een krachttest. Voor sprongen en sprints is het nadeel kleiner of afwezig; dynamisch losmaken blijft de veiligste keuze.",
    points: [
      "Direct na statisch rekken was de prestatie gemiddeld 3,7% lager; na dynamisch rekken 1,3% hoger.",
      "De duur maakt uit: een minuut of langer per spiergroep gaf 4,6% verlies, korter dan een minuut 1,1%.",
      "Een nieuwere meta-analyse met alleen gecontroleerde studies vond na statisch rekken wel minder maximale kracht, vooral na een minuut of langer, maar geen nadeel voor sprongen en sprints in het algemeen.",
      "Een netwerk-meta-analyse vond dynamisch rekken het best voor sprong en sprint.",
      "Elke vorm van rekken vergroot je bewegingsbereik, maar meestal korter dan een half uur.",
      "De serie Voor de rit is daarom volledig dynamisch; lange rekhoudingen staan in Na de rit.",
    ],
    limits: [
      "De tests volgden drie tot vijf minuten na het rekken. Kwam er na het rekken nog een dynamische warming-up, dan was er geen duidelijk effect op de prestatie meer.",
      "De studies gaan over allerlei krachttests en sprongen, niet specifiek over fietsen. Of rekken je fietsvermogen verandert, is niet onderzocht.",
    ],
    sources: [BEHM_2016, WARNEKE_2024, LI_2023],
    series: ["voor-de-rit", "na-de-rit"],
  },
  {
    slug: "hamstrings-en-rugpijn",
    category: "mobiliteit",
    evidence: "beperkt",
    title: "Stijve hamstrings en rugpijn",
    summary:
      "Minder beweeglijke hamstrings en een stijve romp gaan samen met een grotere kans dat je later lage rugpijn krijgt. Het verband is er, maar klein.",
    points: [
      "Een overzichtsstudie volgde in twaalf onderzoeken 5.459 mensen minstens een jaar.",
      "Wie minder ver zijwaarts kon buigen, een vlakkere onderrug had of minder beweeglijke hamstrings, kreeg vaker lage rugpijn.",
      "Kracht en uithoudingsvermogen van rug- en buikspieren voorspelden in deze studie géén rugpijn.",
      "De serie Na de rit bevat daarom hamstring- en heupwerk.",
    ],
    limits: [
      "Het verband bij de hamstrings is statistisch aanwezig maar klein.",
      "De deelnemers waren geen wielrenners.",
      "Een verband is geen bewijs dat rekken rugpijn voorkomt; dat is in deze studie niet getest.",
    ],
    sources: [SADLER_2017],
    series: ["na-de-rit"],
  },
];

export function strengthArticleBySlug(slug: string): StrengthArticle | null {
  return STRENGTH_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function strengthArticlesByCategory(): {
  category: StrengthCategory;
  articles: StrengthArticle[];
}[] {
  return STRENGTH_CATEGORIES.map((category) => ({
    category,
    articles: STRENGTH_ARTICLES.filter((article) => article.category === category),
  })).filter((group) => group.articles.length > 0);
}

/** De artikelen die een serie onderbouwen, voor de link op de seriepagina. */
export function articlesForSeries(seriesSlug: string): StrengthArticle[] {
  return STRENGTH_ARTICLES.filter((article) => article.series?.includes(seriesSlug));
}
