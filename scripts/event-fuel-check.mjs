#!/usr/bin/env node
// Toetst het eventvoedingsmodel (src/lib/nutrition/event-fuel.ts) aan gereden
// events: wat het advies zou zijn met de planning, en wat het met de echte rit
// had moeten zijn. Stap 1 van docs/eventvoeding-plan.md. Leest alleen een
// export; schrijft niets naar de database.
//
//   node scripts/event-fuel-check.mjs [--in <json>] [--weight 75]
//
// De export (een JSON-array) komt uit deze query, bijvoorbeeld via de
// Supabase-connector, opgeslagen als .tmp/event-fuel/rides.json:
//
//   with w as (
//     select tw.id, tw.profile_id, tw.scheduled_at::date d, tw.duration_minutes plan_min,
//            tw.intensity, e.type
//     from training_workouts tw join events e on e.id = tw.event_id
//     where tw.superseded_at is null and tw.scheduled_at < now()
//       and tw.scheduled_at > now() - interval '120 days'
//   ), m as (
//     select w.*, ia.moving_time_seconds / 60.0 real_min, ia.kilojoules kj,
//            ia.average_watts avg_watts, ia.normalized_watts np_watts, ia.ftp_watts ftp,
//            row_number() over (partition by w.id
//              order by abs(ia.moving_time_seconds / 60 - w.plan_min)) rn
//     from w join intervals_activities ia on ia.profile_id = w.profile_id
//       and ia.start_date_local::date = w.d and ia.type ilike '%ride%'
//   )
//   select type, intensity, plan_min, round(real_min) real_min, kj, avg_watts, np_watts, ftp
//   from m where rn = 1 and kj > 0 and ftp > 0;
//
// Geen lid-id's of namen in de export nodig; het gewicht is voor iedereen
// hetzelfde (--weight), omdat het profielgewicht niet in de export zit.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// events.ts haalt via club.ts server-only binnen; buiten Next is dat dezelfde stub als in vitest.
const jiti = createJiti(import.meta.url, {
  alias: { "@": path.join(root, "src"), "server-only": path.join(root, "tests/unit/stubs/server-only.ts") },
});
const fuel = await jiti.import(path.join(root, "src/lib/nutrition/event-fuel.ts"));
const events = await jiti.import(path.join(root, "src/lib/training/events.ts"));

function arg(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const IN = arg("--in", path.join(root, ".tmp", "event-fuel", "rides.json"));
const WEIGHT = Number(arg("--weight", "75"));
if (!existsSync(IN)) {
  console.error(`Geen export op ${IN}. Zie de query bovenin dit script.`);
  process.exit(1);
}

const ZWIFT = new Set(["zrl", "ladder", "flamme_rouge", "src", "zwift"]);
/** De IF die het schema zonder pacingplan zou verwachten. */
function plannedIf(row) {
  if (row.intensity !== "race") return null;
  return ZWIFT.has(row.type)
    ? events.zwiftRaceIntensityFactor(row.plan_min)
    : events.outdoorRaceIntensityFactor(row.plan_min);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const pct = (value) => (value == null ? "—" : `${value > 0 ? "+" : ""}${Math.round(value * 100)}%`);

const rows = JSON.parse(readFileSync(IN, "utf8")).map((row) => ({
  ...row,
  plan_min: Number(row.plan_min),
  real_min: Number(row.real_min),
  kj: Number(row.kj),
  avg_watts: Number(row.avg_watts),
  np_watts: Number(row.np_watts),
  ftp: Number(row.ftp),
}));

const byType = new Map();
for (const row of rows) {
  const list = byType.get(row.type) ?? [];
  list.push(row);
  byType.set(row.type, list);
}

console.log(`Eventvoeding getoetst aan ${rows.length} gereden events (gewicht ${WEIGHT} kg voor iedereen).\n`);
console.log("type | n | IF plan vs echt (NP) | gem/NP | kJ plan vs echt | advies plan → echt (g/u) | sloot met het plan");
console.log("---|---|---|---|---|---|---");
for (const [type, list] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
  const ifErrors = [];
  const avgToNp = [];
  const kjErrors = [];
  const advicePlan = [];
  const adviceReal = [];
  let closed = 0;
  for (const row of list) {
    const realIf = row.np_watts / row.ftp;
    const planIf = plannedIf(row) ?? realIf;
    ifErrors.push(planIf / realIf - 1);
    avgToNp.push(row.avg_watts / row.np_watts);
    // Zonder pacingplan: vermogen = IF × FTP, en dat is NP, geen gemiddelde.
    const planWatts = planIf * row.ftp;
    kjErrors.push((planWatts * 3.6 * row.plan_min) / 60 / row.kj - 1);
    const plan = fuel.fuelAdvice({
      minutes: row.plan_min,
      watts: planWatts,
      intensityFactor: planIf,
      weightKg: WEIGHT,
      intensity: row.intensity,
    });
    const real = fuel.fuelAdvice({
      minutes: row.real_min,
      watts: row.avg_watts,
      intensityFactor: realIf,
      weightKg: WEIGHT,
      intensity: row.intensity,
    });
    advicePlan.push(plan.perHourG);
    adviceReal.push(real.perHourG);
    // Had het advies van de planning de echte rit gedragen?
    const actual = fuel.fuelBalance({
      minutes: row.real_min,
      watts: row.avg_watts,
      intensityFactor: realIf,
      weightKg: WEIGHT,
      intakePerHourG: plan.perHourG,
    });
    if (actual.reserveAtMinute == null) closed += 1;
  }
  console.log(
    [
      type,
      list.length,
      pct(median(ifErrors)),
      median(avgToNp)?.toFixed(2),
      pct(median(kjErrors)),
      `${median(advicePlan)} → ${median(adviceReal)}`,
      `${closed}/${list.length}`,
    ].join(" | "),
  );
}
