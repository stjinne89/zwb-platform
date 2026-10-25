// De hoofdvideo "Aan de slag met ZWBasis": per scène de tekst (die als
// ondertitel in beeld komt) en wat er tegelijk gebeurt.
//
// De tekst is de enige bron: de ondertitels en de timing van de klikken komen
// hier allemaal uit. `s.at("woord")` wacht tot het punt in de tekst waar dat
// woord valt, zodat een klik samenvalt met de ondertitel erover. De video's
// hebben geen stem (besluit eigenaar, 2026-10-19); komt er ooit wel een
// audiobestand per scène in audio/, dan rekent de opname met die duur.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VIDEO = {
  id: "aan-de-slag-met-zwbasis",
  titel: "Aan de slag met ZWBasis",
  // "tegels" is het nieuwe design, "klassiek" het huidige.
  design: "tegels",
};

export const SCENES = [
  {
    id: "01-welkom",
    titel: "Welkom",
    preset: "nieuw",
    ingelogd: false,
    start: "/login",
    tekst:
      "Welkom bij ZWB! In deze video laat ik je stap voor stap zien hoe je aan de slag gaat met ZWBasis, onze eigen clubapp. Je gebruikt hem gewoon in de browser, op je telefoon of op je computer.",
    async speel(s) {
      await s.at("ZWBasis");
      await s.highlight(s.page.locator("form").first(), 2200);
    },
  },
  {
    id: "02-registreren",
    titel: "Account aanmaken",
    preset: "nieuw",
    ingelogd: false,
    start: "/login",
    tekst:
      "Je begint met een account. Kies Registreren, en vul je naam in, je e-mailadres en een wachtwoord van minstens acht tekens. Vink aan dat je akkoord gaat met de privacyverklaring, en tik op Account aanmaken.",
    async speel(s) {
      const p = s.page;
      await s.at("Registreren");
      await s.tap(p.getByRole("button", { name: "Registreren" }));
      await s.at("naam");
      await s.type(p.getByPlaceholder(/Je naam/), "Sanne de Vries");
      await s.at("e-mailadres");
      await s.type(p.getByPlaceholder("E-mailadres"), "sanne@voorbeeld.nl");
      await s.at("wachtwoord");
      await s.type(p.getByPlaceholder(/Wachtwoord/), "fietsen2026");
      await s.at("Vink");
      await s.tap(p.locator('input[name="privacy_accepted"]'));
      await s.at("tik");
      await s.tap(p.getByRole("button", { name: "Account aanmaken" }));
    },
  },
  {
    id: "03-bevestigen",
    titel: "E-mail bevestigen",
    preset: "nieuw",
    ingelogd: false,
    start: "/login",
    tekst:
      "Je krijgt nu een mail met een bevestigingslink. Zie je die niet binnen een paar minuten? Kijk dan in je map met ongewenste mail of spam. Tik op de link in de mail, en je account is bevestigd.",
    // Het registratieformulier opnieuw invullen, buiten beeld.
    async voorbereiding(s) {
      const p = s.page;
      await p.getByRole("button", { name: "Registreren" }).click();
      await p.getByPlaceholder(/Je naam/).fill("Sanne de Vries");
      await p.getByPlaceholder("E-mailadres").fill("sanne@voorbeeld.nl");
      await p.getByPlaceholder(/Wachtwoord/).fill("fietsen2026");
      await p.locator('input[name="privacy_accepted"]').check();
      await p.getByRole("button", { name: "Account aanmaken" }).click();
      await p.getByText("Bijna klaar.").waitFor();
    },
    async speel(s) {
      const box = s.page.getByText("Bijna klaar.").locator("..");
      await s.at("bevestigingslink");
      await s.highlight(box, 2500);
      await s.at("spam");
      await s.highlight(box, 2500);
    },
  },
  {
    id: "04-goedkeuring",
    titel: "Wachten op goedkeuring",
    preset: "nieuw",
    ingelogd: true,
    start: "/wachten",
    tekst:
      "Daarna wacht je account op goedkeuring door een beheerder. Meestal is dat snel geregeld. In de tussentijd kun je alvast de starthelper openen.",
    async speel(s) {
      const p = s.page;
      await s.at("goedkeuring");
      await s.highlight(p.getByText(/wacht op goedkeuring/), 2500);
      await s.at("starthelper");
      await s.tap(p.getByRole("link", { name: "Open de starthelper" }));
    },
  },
  {
    id: "05-starthelper",
    titel: "De starthelper",
    preset: "nieuw",
    ingelogd: true,
    start: "/welkom",
    tekst:
      "De starthelper laat zien welke stappen je al gedaan hebt, en wat je nog moet doen. Elke stap heeft een knop die je meteen naar de goede plek brengt. Je vindt de starthelper later ook terug via de pagina Hulp.",
    async speel(s) {
      const p = s.page;
      await s.at("stappen");
      await s.highlight(p.getByText("Voortgang").locator(".."), 1800);
      await s.at("Elke");
      await s.scrollTo(p.getByRole("heading", { name: "Goedkeuring door beheerder" }), "start");
      await s.at("knop");
      await s.highlight(p.getByRole("link", { name: "Profiel aanvullen" }), 2000);
      await s.at("later");
      await s.scrollTo(p.getByRole("heading", { name: "intervals.icu koppelen" }), "start");
    },
  },
  {
    id: "06-beginscherm",
    titel: "App op je beginscherm",
    preset: "nieuw",
    ingelogd: true,
    start: "/welkom",
    tekst:
      "Handig: zet ZWBasis als app op je beginscherm. Op een iPhone open je de site in Safari, tik je op Delen, en kies je Zet op beginscherm. Op Android open je de site in Chrome, tik je op de drie puntjes, en kies je Toevoegen aan startscherm.",
    async speel(s) {
      const p = s.page;
      await s.scrollTo(p.getByRole("heading", { name: "ZWB als app op je telefoon" }), "start");
      await s.at("iPhone");
      await s.highlight(p.getByRole("heading", { name: "iPhone of iPad" }).locator(".."), 3800);
      await s.at("Android");
      await s.highlight(p.getByRole("heading", { name: "Android" }).locator(".."), 3800);
    },
  },
  {
    id: "07-zwift-id",
    titel: "Je Zwift-ID",
    preset: "goedgekeurd",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Ben je goedgekeurd, dan kom je op Vandaag, je startpagina. De eerste keer vraagt de app om je Zwift-ID. Die vind je op my.zwift.com: open je profiel, en het nummer in de adresbalk is je Zwift-ID. Zwift je niet? Tik dan op Ik zwift niet.",
    async speel(s) {
      const p = s.page;
      const dialog = p.getByRole("dialog");
      await s.at("Zwift-ID");
      await s.highlight(dialog, 2000);
      await s.at("adresbalk");
      await s.type(dialog.getByRole("textbox"), "4123456");
      await s.at("Ik");
      await s.highlight(dialog.getByRole("button", { name: "Ik zwift niet" }), 1500);
      await s.tap(dialog.getByRole("button", { name: "Opslaan" }));
    },
  },
  {
    id: "08-vandaag",
    titel: "Vandaag",
    preset: "compleet",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Op Vandaag zie je in één oogopslag de eerstvolgende ritten, je training en wat er in de club gebeurt. Scroll gerust eens rustig naar beneden om alles te bekijken.",
    async speel(s) {
      await s.at("ritten");
      await s.highlight(s.page.locator("main a[href^='/events/']").first(), 2200);
      await s.at("training");
      await s.scrollBy(380, 1800);
      await s.at("Scroll");
      await s.scrollBy(700, 3500);
    },
  },
  {
    id: "09-tabs",
    titel: "De vier tabs",
    preset: "compleet",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Onderin staan vier tabs. Vandaag, de Kalender, ZWBeter voor je training, en de Club, met de leden, teams, stats en Samen fietsen. Je profiel en Mijn garage vind je rechtsboven, onder je naam.",
    async speel(s) {
      const p = s.page;
      const tabs = p.locator("nav.tg-tabs-bottom");
      await s.at("vier");
      await s.highlight(tabs, 1600);
      await s.at("Kalender");
      await s.tap(tabs.getByRole("link", { name: "Kalender" }));
      await s.at("ZWBeter");
      await s.tap(tabs.getByRole("link", { name: "ZWBeter" }));
      await s.at("Club");
      await s.tap(tabs.getByRole("link", { name: "Club" }));
      await s.at("stats");
      await s.scrollBy(320, 1500);
      await s.at("rechtsboven");
      await s.tap(p.getByRole("button", { name: /Persoonlijk menu/ }));
      await s.highlight(p.getByRole("menu"), 2500);
    },
  },
  {
    id: "10-profiel",
    titel: "Je profiel",
    preset: "profiel",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Vul daarna je profiel aan. Je vindt het onder je naam, rechtsboven. Tik op het potlood om het te bewerken, en tik bovenaan op het rondje om een foto toe te voegen. Vul je regio in, en schrijf een korte bio. Iets verderop kies je je ZRL-categorie, als je meedoet aan de Zwift Racing League. Vergeet niet om op te slaan.",
    async speel(s) {
      const p = s.page;
      await s.at("naam");
      await s.tap(p.getByRole("button", { name: /Persoonlijk menu/ }));
      await s.tap(p.getByRole("menuitem", { name: "Profiel" }));
      await p.waitForURL(/\/profiel/);
      await s.at("potlood");
      await s.tap(p.locator('[aria-label="Bewerken"]'));
      await p.waitForURL(/weergave=bewerken/);
      await p.locator('input[name="region"]').waitFor();
      await s.at("rondje");
      await s.highlight(p.getByText("SV", { exact: true }).first(), 1800);
      await s.at("regio");
      await s.scrollTo(p.locator('input[name="region"]'));
      await s.type(p.locator('input[name="region"]'), "Breda");
      await s.at("bio");
      await s.type(p.locator('textarea[name="bio"]'), "Fiets graag in het weekend en rijd door de week op Zwift.", 28);
      await s.at("ZRL-categorie");
      const zrl = p.locator('select[name="zrl_category"]');
      await s.scrollTo(zrl);
      await s.highlight(zrl, 1200);
      await zrl.selectOption("C");
      await s.at("Vergeet");
      const save = p.getByRole("button", { name: "Opslaan", exact: true }).last();
      await s.scrollTo(save);
      await s.tap(save);
    },
  },
  {
    id: "11-strava",
    titel: "Strava koppelen",
    preset: "compleet",
    ingelogd: true,
    start: "/profiel?weergave=bewerken",
    tekst:
      "Wil je dat je ritten vanzelf binnenkomen? Koppel dan Strava. Dat kan op je profiel of op Vandaag. Zet bij het koppelen het vinkje voor je activiteiten aan, anders kan de app je ritten niet lezen.",
    async speel(s) {
      const p = s.page;
      const section = p.locator("#strava");
      await s.at("Strava");
      await s.scrollTo(section, "start");
      await s.at("profiel");
      await s.highlight(section.getByRole("link", { name: "Koppel met Strava" }), 2500);
      await s.at("vinkje");
      await s.highlight(section.getByRole("link", { name: "Koppel met Strava" }), 3500);
    },
  },
  {
    id: "12-zonder-strava",
    titel: "Geen plek op Strava?",
    preset: "compleet",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Strava laat maar een beperkt aantal leden koppelen. Is er geen plek meer? Dan laat je je ritten binnenkomen via intervals.icu, of je importeert ze hier op Vandaag. Op de hulppagina staat precies hoe dat werkt.",
    async speel(s) {
      const p = s.page;
      await s.at("beperkt");
      await s.scrollTo(p.getByRole("button", { name: "Koppel intervals.icu" }).or(p.getByRole("link", { name: "Koppel intervals.icu" })).first());
      await s.at("intervals.icu");
      await s.highlight(p.getByRole("button", { name: "Koppel intervals.icu" }).or(p.getByRole("link", { name: "Koppel intervals.icu" })).first(), 2200);
      await s.at("importeert");
      await s.highlight(p.getByRole("button", { name: /Importeer ritten/ }), 2500);
    },
  },
  {
    id: "13-meldingen",
    titel: "Meldingen aanzetten",
    preset: "compleet",
    ingelogd: true,
    start: "/profiel?weergave=bewerken",
    tekst:
      "Zet ook je meldingen aan. Dan krijg je een seintje als een event bijna begint, als iemand live rijdt, of als je een badge hebt verdiend. Je kiest zelf welke meldingen je wilt krijgen.",
    async speel(s) {
      const p = s.page;
      const section = p.locator("#meldingen");
      await s.scrollTo(section, "start");
      await s.at("meldingen");
      await s.highlight(section.getByRole("button").first(), 2500);
      await s.at("kiest");
      await s.scrollBy(220, 1500);
    },
  },
  {
    id: "14-kalender",
    titel: "Events en aanmelden",
    preset: "compleet",
    ingelogd: true,
    start: "/kalender",
    tekst:
      "In de kalender staan alle clubritten en events. Tik op een event voor de details, en meld je aan. Zo weten de anderen dat je meerijdt.",
    async speel(s) {
      const p = s.page;
      await s.at("clubritten");
      await s.highlight(p.getByText("Zondagochtend buitenrit vanuit Breda").first(), 1800);
      await s.at("Tik");
      await s.tap(p.getByText("Zondagochtend buitenrit vanuit Breda").first());
      await p.waitForURL(/\/events\//);
      await s.pause(600);
      await s.at("meld");
      const rsvp = p.getByRole("button", { name: /Ik (ga|doe|kom)|Aanmelden|Ja/ }).first();
      await s.scrollTo(rsvp);
      await s.tap(rsvp);
    },
  },
  {
    id: "15-hulp",
    titel: "Hulp en tot slot",
    preset: "compleet",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Kom je ergens niet uit? Tik dan bovenin op het vraagteken. Op de pagina Hulp staat per onderdeel hoe het werkt, en wat je kunt doen als iets niet lukt. Veel plezier met ZWBasis, en tot op de fiets!",
    async speel(s) {
      const p = s.page;
      await s.at("vraagteken");
      await s.tap(p.locator('header a[href^="/hulp"]'));
      await p.waitForURL(/\/hulp/);
      await s.at("onderdeel");
      const search = p.getByRole("searchbox").or(p.getByPlaceholder(/Zoek/)).first();
      await s.type(search, "Strava", 120);
      await s.at("lukt");
      await search.fill("");
      await s.scrollBy(500, 2500);
    },
  },
];

/**
 * Korte clips voor /hulp: per onderdeel de scènes die erbij horen, en het
 * anker op de hulppagina waar de link komt. Welkom en de afsluiting staan
 * alleen in de hele video.
 */
export const CLIPS = [
  { id: "account-aanmaken", titel: "Account aanmaken", scenes: ["02-registreren", "03-bevestigen", "04-goedkeuring"], hulp: "beginnen" },
  { id: "starthelper", titel: "De starthelper", scenes: ["05-starthelper"], hulp: "beginnen" },
  { id: "app-op-beginscherm", titel: "App op je beginscherm", scenes: ["06-beginscherm"], hulp: "webapp-installeren" },
  { id: "zwift-id", titel: "Je Zwift-ID", scenes: ["07-zwift-id"], hulp: "zwift-id" },
  { id: "wegwijs", titel: "Wegwijs in de app", scenes: ["08-vandaag", "09-tabs"], hulp: "beginnen" },
  { id: "profiel", titel: "Je profiel", scenes: ["10-profiel"], hulp: "beginnen" },
  { id: "strava-koppelen", titel: "Strava koppelen", scenes: ["11-strava"], hulp: "strava-rechten" },
  { id: "zonder-strava", titel: "Ritten zonder Strava", scenes: ["12-zonder-strava"], hulp: "ritten-via-intervals" },
  { id: "meldingen", titel: "Meldingen aanzetten", scenes: ["13-meldingen"], hulp: "meldingen-problemen" },
  { id: "aanmelden-event", titel: "Aanmelden voor een event", scenes: ["14-kalender"], hulp: "agenda" },
  { id: "kj-standen", titel: "Durability: de kJ-standen", scenes: ["16-kj-melding", "17-kj-intervals", "18-kj-ophalen"], hulp: "zwbriljant" },
];

// ---- Scènes die alleen in een hulpclip staan, niet in de hoofdvideo --------

const INTERVALS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "intervals");

/**
 * Waar je tikt in de schermen van intervals.icu (390x590, zoals de opname). De
 * schermen zijn echte schermafdrukken van de eigenaar (2026-10-25), met naam en
 * vermogensgrafiek vervaagd; in "3-curves-1000" staat de eerste stand op 1000 kJ
 * (in werkelijkheid stond die op 830 kJ en is niets opgeslagen).
 */
const INTERVALS_SPOTS = {
  "1-menu": { beste: [0, 256, 198, 47] },
  "2a-dicht": { puntjes: [318, 462, 55, 55] },
  "2-fab": { curves: [176, 284, 197, 34] },
  "3-curves": { standen: [14, 408, 308, 28], pen1: [192, 412, 14, 20] },
  "4-dialog": { veld: [38, 195, 312, 30], opslaan: [280, 392, 76, 30] },
  "3-curves-1000": { pen2: [314, 412, 14, 20], vinkjes: [104, 409, 138, 26] },
};

/** Een pagina met de schermafdrukken, en per scherm onzichtbare vlakken om op te tikken. */
function intervalsPage() {
  const shots = Object.keys(INTERVALS_SPOTS).map((name) => {
    const data = readFileSync(path.join(INTERVALS_DIR, `${name}.jpg`)).toString("base64");
    const spots = Object.entries(INTERVALS_SPOTS[name])
      .map(([id, [x, y, w, h]]) => `<div id="${id}" class="spot" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`)
      .join("");
    return `<section data-scherm="${name}" hidden><img src="data:image/jpeg;base64,${data}" alt="">${spots}</section>`;
  });
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>
    html, body { margin: 0; background: #121016; overflow: hidden; }
    section { position: fixed; inset: 0; }
    section[hidden] { display: none; }
    img { display: block; width: 390px; height: 590px; }
    .spot { position: absolute; }
  </style></head><body>${shots.join("")}<script>
    window.toon = (name) => document.querySelectorAll("section").forEach((el) => (el.hidden = el.dataset.scherm !== name));
    toon("1-menu");
  </script></body></html>`;
}

export const HULP_SCENES = [
  {
    id: "16-kj-melding",
    titel: "Durability ontbreekt",
    preset: "kj-melding",
    ingelogd: true,
    start: "/dashboard",
    tekst:
      "Zie je in ZWB de melding dat durability ontbreekt? Dan krijgen we uit intervals.icu geen vermoeide curve. Die zet je zo aan.",
    async speel(s) {
      const dialog = s.page.locator('[data-slot="dialog-content"]');
      await dialog.waitFor({ timeout: 5000 });
      await s.at("melding");
      await s.highlight(dialog, 4200);
    },
  },
  {
    id: "17-kj-intervals",
    titel: "De kJ-standen in intervals.icu",
    ingelogd: false,
    start: "/__demo/intervals",
    // Geen app maar de schermafdrukken hierboven; opname.mjs zet deze pagina neer.
    html: intervalsPage,
    tekst:
      "Open intervals.icu en kies in het menu Beste prestaties. Tik rechtsonder op de knop met de drie puntjes en kies Vermogenscurves. Onderaan staan twee kJ-standen. Tik bij de eerste op het potloodje, vul 1000 in en tik op Opslaan. Zet de tweede op 2000 en vink ze allebei aan.",
    async speel(s) {
      const p = s.page;
      const toon = (name) => p.evaluate((n) => window.toon(n), name);
      const spot = (id) => p.locator(`#${id}`);
      await s.at("Beste prestaties");
      await s.highlight(spot("beste"), 1400);
      await s.tap(spot("beste"));
      await toon("2a-dicht");
      await s.at("drie puntjes");
      await s.highlight(spot("puntjes"), 1200);
      await s.tap(spot("puntjes"));
      await toon("2-fab");
      await s.at("Vermogenscurves");
      await s.highlight(spot("curves"), 1200);
      await s.tap(spot("curves"));
      await toon("3-curves");
      await s.at("Onderaan");
      await s.highlight(spot("standen"), 2200);
      await s.at("potloodje");
      await s.tap(spot("pen1"));
      await toon("4-dialog");
      await s.at("1000");
      await s.highlight(spot("veld"), 1500);
      await s.at("Opslaan");
      await s.tap(spot("opslaan"));
      await toon("3-curves-1000");
      await s.at("tweede");
      await s.highlight(spot("pen2"), 1800);
      await s.at("vink");
      await s.highlight(spot("vinkjes"), 2400);
    },
  },
  {
    id: "18-kj-ophalen",
    titel: "Mijn waarden ophalen",
    preset: "vermogen",
    ingelogd: true,
    start: "/zwbeter-worden/vermogen",
    tekst:
      "intervals.icu rekent je curves daarna opnieuw uit, dat duurt een paar minuten. Ga dan in ZWB naar Mijn vermogen en tik op Mijn waarden ophalen. Je durability telt dan mee in je ZWBriljant.",
    async speel(s) {
      const button = s.page.getByRole("button", { name: "Mijn waarden ophalen" });
      await s.at("Mijn vermogen");
      await s.highlight(s.page.getByRole("link", { name: "Vermogen", exact: true }).first(), 1800);
      await s.at("tik");
      await s.highlight(button, 3000);
    },
  },
];
