import { describe, expect, it } from "vitest";
import {
  adaptiveDailyPrompt,
  defaultTrainingPrompt,
  dropShortEasyRides,
  isEasyRide,
  planUpdatePrompt,
} from "@/lib/training/workouts";

describe("training prompts", () => {
  it("noemt 10 % opbouw een keuze en begrenst sprongen", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("vermijd sprongen van meer dan een kwart");
    expect(prompt).toContain("geen bewezen grens");
    expect(prompt).not.toContain("de sprong veilig te houden");
  });

  it("begrenst drempelblokken naar hun lengte", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("Drempelblokken van 15 minuten of langer krijgen 90-95% FTP");
    expect(prompt).toContain("Boven 100% FTP alleen in blokken van hooguit 8 minuten");
  });

  it("staat een korte overbelasting vóór de taper alleen toe met ruimte in het herstel", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("korte overbelastingsweek van ongeveer zes dagen");
    expect(prompt).toContain("alleen als herstelwaarden, TSB en ramp_rate dat toelaten");
    expect(prompt).toContain("Een overbelastingsweek zonder taper erachter plan je nooit");
  });

  it("trekt een weekuitzondering niet door naar andere weken", () => {
    const prompt = planUpdatePrompt();
    expect(prompt).toContain("één specifieke week");
    expect(prompt).toContain("nooit door naar maandagen in andere weken");
  });

  it("gebruikt de vrije feedback van het lid bij volgende bijstellingen", () => {
    expect(defaultTrainingPrompt()).toContain("athleteReport");
    expect(adaptiveDailyPrompt()).toContain("yesterday.athleteRpe");
    expect(adaptiveDailyPrompt()).toContain("athleteReport");
  });

  it("laat het A-mikpunt uit de jaarplanning vóór de taperregel op goal.type gaan", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("seasonPlan");
    expect(prompt).toContain("gaat vóór de taperregel op goal.type");
    // De oude regel blijft gelden zolang er geen A-mikpunt ligt; anders zou een
    // basisconditie-doel zonder jaarplanning ineens getaperd worden.
    expect(prompt).toContain("Zonder A-mikpunt in de planperiode");
  });

  it("plant een nieuw schema als blok van hooguit twaalf weken", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("blok van hooguit twaalf weken");
    expect(prompt).toContain("zet endDate op planWindow.to");
    // Een doel voorbij het blok is geen piek in dit blok.
    expect(prompt).toContain("planWindow.goalBeyond");
    expect(prompt).toContain("Plan dan geen taper naar die datum");
    // Een mikpunt na het blok is de gewone gang van zaken, geen waarschuwing meer.
    expect(prompt).not.toContain("het schema moet vóór die datum verlengd worden");
  });

  it("laat een volgend blok voortbouwen in plaats van opnieuw beginnen", () => {
    const prompt = planUpdatePrompt();
    expect(prompt).toContain("planUpdate.nextBlock");
    expect(prompt).toContain("begin niet opnieuw onderaan");
  });

  it("laat de planner niet door een rustperiode heen bouwen", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("kind 'rust'");
    expect(prompt).toContain("begin geen opbouwblok dat er doorheen loopt");
    expect(prompt).toContain("langer dan tien dagen");
  });

  it("bouwt naar een trainingskamp toe en laat het weekplafond daar los", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("kind 'kamp'");
    expect(prompt).toContain("gaat vóór goal.maxHoursPerWeek");
    expect(prompt).toContain("Werk in de opbouw naar een trainingskamp toe");
    // Een kamp wordt benut als door een prof: kwaliteit hoort erbij, de zwaarte
    // hangt van de renner af, en die ruime kijk blijft binnen het kamp.
    expect(prompt).toContain("Kwaliteit hoort bij een trainingskamp");
    expect(prompt).toContain("bepaal je per renner op wat die aankan");
    expect(prompt).toContain("Trek hem niet door naar de gewone weken");
    expect(prompt).not.toContain("niet om intensiteit");
    expect(prompt).toContain("Na een trainingskamp volgt herstel");
    // Ontlasten ervoor en herstellen erna volgen de data van de renner, geen
    // vast aantal dagen.
    expect(prompt).toContain("is geen vast aantal dagen");
    expect(prompt).toContain("niet op een vast aantal dagen");
    expect(prompt).not.toContain("laatste drie dagen vóór het kamp");
    expect(prompt).not.toContain("eerste vijf tot zeven dagen");
    expect(adaptiveDailyPrompt()).toContain("dan is veel volume de bedoeling");
  });

  it("houdt een rustdag ook een rustdag als het lid fris is", () => {
    expect(adaptiveDailyPrompt()).toContain("seasonPlan.periods");
    expect(adaptiveDailyPrompt()).toContain("ook als de signalen fris zijn");
  });

  it("stuurt niet op een readiness van een eerdere dag", () => {
    expect(defaultTrainingPrompt()).toContain("wellness.readinessCurrent op false");
  });

  it("plant geen tweede training op een dag waarop al is gereden", () => {
    expect(adaptiveDailyPrompt()).toContain("todayRides");
    expect(adaptiveDailyPrompt()).toContain("geef geen workout met de datum van vandaag terug");
  });

  it("weet bij een bijwerking dat een A-mikpunt wél een piekmoment is", () => {
    expect(planUpdatePrompt()).toContain("A-mikpunt uit seasonPlan");
  });

  it("maakt de wedstrijdspecifieke ZRL-prikkel expliciet", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("goal.type 'zrl'");
    expect(prompt).toContain("minstens één VO2max-, anaerobe of raceprikkel");
    expect(prompt).toContain("niet als de hele kwaliteit van de week");
    expect(prompt).toContain("herstelweek of concrete vermoeidheidssignalen");
  });

  it("ziet beschikbaarheid als tijd en stuurt op belasting uit de CTL", () => {
    const prompt = defaultTrainingPrompt();
    // De oude lezing: maxHoursPerWeek als volume waar de opbouw naartoe werkt.
    expect(prompt).not.toContain("Werk met de opbouwweken toe naar goal.maxHoursPerWeek");
    expect(prompt).not.toContain("85%");
    expect(prompt).toContain("het is geen doel");
    expect(prompt).toContain("Stuur het schema op weekbelasting in TSS");
    expect(prompt).toContain("Plan een opbouwweek nooit onder currentLoad.weeklyTss");
    expect(prompt).toContain("verhoog dan de dichtheid");
    expect(planUpdatePrompt()).toContain("het weektotaal volgt uit de weekbelasting");
  });

  it("valt terug op de CTL als ZWB ritten mist", () => {
    expect(defaultTrainingPrompt()).toContain("recentLoad.loadCoverage laag terwijl intervalsLoad.ctl er wel is");
  });

  it("legt geen maximum op sleutelsessies en laat een race de rest niet vervangen", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("Er is geen maximum aan het aantal sleutelsessies");
    expect(prompt).toContain("maar vervangt de andere niet");
  });

  it("verdeelt volgens de kennisbank en plant binnen korter en dichter", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("Verdeel de belasting volgens de kennisbank");
    expect(prompt).toContain("Vul een week niet aan met lange rustige duurritten");
    expect(prompt).toContain("indoorTssPerHour");
    expect(prompt).toContain("goal.preferredMode 'indoor'");
  });

  it("plant een rustdag met een optionele rustige rit in plaats van een korte hersteltraining", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("Plan geen losse hersteltraining of rustige duurrit korter dan 90 minuten");
    expect(prompt).toContain("Reken die optionele rit niet mee in het weekvolume");
    expect(prompt).toContain("een uur rustige duur (tot 70% FTP) plan je niet");
    expect(prompt).not.toContain("Een korte duurrit is geen hersteltraining");
  });

  it("ziet de optionele rit op een rustdag niet als extra belasting", () => {
    expect(adaptiveDailyPrompt()).toContain("de optionele rit van een rustdag");
    expect(adaptiveDailyPrompt()).toContain("Vraagt het lid met today.availableMinutes zelf om een rit");
  });
});

describe("dropShortEasyRides", () => {
  const workout = (intensity: string, durationMinutes: number) => ({ intensity, durationMinutes });
  const block = (target: string, durationMinutes: number, extra: Record<string, unknown> = {}) => ({
    label: "Blok",
    durationMinutes,
    target,
    notes: "",
    intensity: "endurance",
    ...extra,
  });
  // Zoals de AI het op 2026-10-26 schreef: watt, en bij deze FTP net boven 70%.
  const rustigeDuur = (durationMinutes: number) => ({
    title: `Rustige duur ${durationMinutes} min`,
    intensity: "endurance",
    durationMinutes,
    structure: [block("RPE 3, 140-175w", 10), block("RPE 4, 177-191w", durationMinutes - 15), block("RPE 2, 135-165w", 5)],
  });

  it("maakt van een korte hersteltraining en een rust-workout een rustdag", () => {
    expect(dropShortEasyRides([workout("recovery", 45), workout("rest", 30)])).toEqual([]);
  });

  it("maakt van een korte rustige duurrit een rustdag, ook op 'endurance'", () => {
    expect(dropShortEasyRides([rustigeDuur(60), rustigeDuur(75)], 260)).toEqual([]);
    expect(dropShortEasyRides([{ ...workout("endurance", 60), structure: [block("65-70%", 60)] }])).toEqual([]);
  });

  it("laat rustige duur van 90 minuten en ritten met intensiteit staan", () => {
    const kept = [
      workout("recovery", 90),
      rustigeDuur(90),
      workout("threshold", 60),
      { title: "Intensieve duur 3x15", intensity: "endurance", durationMinutes: 60, structure: [block("71-80%", 45)] },
      { title: "Tempo 3x10", intensity: "tempo", durationMinutes: 60, structure: [block("81-86%", 30)] },
      { title: "Openers 45 min", intensity: "endurance", durationMinutes: 45, structure: [block("55%", 5, { burstSeconds: 15 })] },
      { title: "Rustige duur openers", intensity: "endurance", durationMinutes: 45, structure: [block("65%", 40)] },
    ];
    expect(dropShortEasyRides(kept, 260)).toEqual(kept);
  });

  it("houdt bij het dagvoorstel alleen de oude regel voor 'recovery' aan", () => {
    const rides = [workout("recovery", 45), rustigeDuur(60)];
    expect(dropShortEasyRides(rides, 260, "recovery")).toEqual([rustigeDuur(60)]);
  });

  it("herkent een duurrit zonder titel aan zijn kernwerk", () => {
    expect(isEasyRide({ intensity: "endurance", durationMinutes: 60, structure: [block("68%", 50)] })).toBe(true);
    expect(isEasyRide({ intensity: "endurance", durationMinutes: 60, structure: [block("74%", 50)] })).toBe(false);
  });

  it("laat de dagaanpassing een vaste afspraak nooit teruggeven en staat een leeg antwoord toe", () => {
    expect(adaptiveDailyPrompt()).toContain("Een dag met een fixedWorkout neem je nooit op in je antwoord");
    expect(adaptiveDailyPrompt()).toContain("geef dan een lege workouts-lijst terug");
  });
});
