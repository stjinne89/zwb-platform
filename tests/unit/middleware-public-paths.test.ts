import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Een cron-route wordt door een externe dienst aangeroepen zonder cookie. Staat
// hij niet in PUBLIC_PATHS, dan stuurt de middleware hem met een 307 naar /login
// -- en cron-job.org volgt geen redirects, dus de job draait nooit. Erger nog:
// hij meldt geen fout, want hij kréég antwoord.
//
// Precies dat gebeurde bij /api/zwift/events/sync. Deze test leidt de lijst van
// bearer-beveiligde routes af uit de code in plaats van hem over te typen, zodat
// een volgende nieuwe cron-route niet opnieuw stilletjes kan stranden.

const ROOT = join(__dirname, "..", "..");
const API_DIR = join(ROOT, "src", "app", "api");

function routeFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...routeFiles(full));
    else if (entry === "route.ts") found.push(full);
  }
  return found;
}

/** Van bestandspad naar URL-pad: src/app/api/x/y/route.ts -> /api/x/y */
function urlPath(file: string): string {
  return `/${relative(join(ROOT, "src", "app"), file).split(sep).slice(0, -1).join("/")}`;
}

const PUBLIC_PATHS = (() => {
  const source = readFileSync(join(ROOT, "src", "lib", "supabase", "middleware.ts"), "utf8");
  const block = source.match(/const PUBLIC_PATHS = \[([\s\S]*?)\];/);
  if (!block) throw new Error("PUBLIC_PATHS niet gevonden in middleware.ts");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
})();

function isPublic(path: string) {
  // Zelfde vergelijking als de middleware zelf doet.
  return PUBLIC_PATHS.some((allowed) => path.startsWith(allowed));
}

describe("PUBLIC_PATHS en de cron-routes", () => {
  const files = routeFiles(API_DIR);

  it("vindt de API-routes", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  const cronRoutes = files
    .filter((file) => readFileSync(file, "utf8").includes("checkCronSecret"))
    .map(urlPath);

  it("herkent de bearer-beveiligde routes", () => {
    expect(cronRoutes.length).toBeGreaterThan(3);
  });

  it.each(cronRoutes)("laat %s door zonder sessie", (path) => {
    expect(isPublic(path)).toBe(true);
  });

  it("laat de GPX-download van een routevoorstel juist NIET door", () => {
    // De spiegelbeeldige fout: een ledenroute per ongeluk publiek maken. Een
    // vertrekpunt en de route eromheen zijn het privacygevoeligst wat hier staat.
    expect(isPublic("/api/training/outdoor-routes/abc/gpx")).toBe(false);
  });

  it("laat de FIT-export van een workout niet door", () => {
    expect(isPublic("/api/training/workouts/abc/fit")).toBe(false);
  });
});
