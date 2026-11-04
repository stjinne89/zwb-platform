// Pop-up "nog niet gekoppeld" (migratie 0307). Titel en link liggen vast per
// koppeling; de uitleg is de standaardtekst hieronder, die de beheerder voor het
// versturen kan aanpassen. Puur: geen database, ook in de browser bruikbaar.
//
// Geen Zwift: wie geen Zwift-ID heeft en niet zei dat hij niet zwift, krijgt al
// elke sessie de vraag (zwift-id-dialog.tsx). Een tweede melding is dubbel.
//
// De teksten zeggen alleen wat ook in /privacy en /hulp staat.

export const NOTICE_INTEGRATIONS = ["strava", "intervals", "telegram", "push", "agenda", "live"] as const;

export type NoticeIntegration = (typeof NOTICE_INTEGRATIONS)[number];

export const NOTICE_BODY_MAX = 600;

export function isNoticeIntegration(value: unknown): value is NoticeIntegration {
  return (NOTICE_INTEGRATIONS as readonly string[]).includes(String(value));
}

export type NoticeTemplate = {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
};

const RIDES_MATTER =
  "Ze tellen dan niet mee voor badges, weekstanden, clubstatistieken, cols en ZWBlokken, en je trainingsschema ziet niet wat je reed.";

/**
 * De tekst per koppeling. Bij Strava hangt die af van de plekken: zijn die vol,
 * dan wijst de melding naar ritten via intervals.icu, want Strava zou de
 * koppeling weigeren.
 */
export function noticeTemplate(
  integration: NoticeIntegration,
  options: { stravaCapFull?: boolean } = {},
): NoticeTemplate {
  switch (integration) {
    case "strava":
      return options.stravaCapFull
        ? {
            title: "Je ritten komen nog niet binnen",
            body: `Je ritten komen nog niet in ZWB. ${RIDES_MATTER} De Strava-plekken zijn vol; via intervals.icu kan het wel.`,
            href: "/hulp/koppelen#ritten-via-intervals",
            linkLabel: "Ritten via intervals.icu",
          }
        : {
            title: "Strava is nog niet gekoppeld",
            body: `Zonder Strava-koppeling komen je ritten niet in ZWB. ${RIDES_MATTER}`,
            href: "/profiel?weergave=bewerken#strava",
            linkLabel: "Strava koppelen",
          };
    case "intervals":
      return {
        title: "intervals.icu is nog niet gekoppeld",
        body: "Zonder intervals.icu kent je trainingsschema je fitheid (CTL, ATL en TSB), je FTP en je zones niet, en zonder vermogensmeter ook de belasting van je ritten niet. Je powercurve en ZWBriljant hebben het ook nodig.",
        href: "/zwbeter-worden/doelen",
        linkLabel: "intervals.icu koppelen",
      };
    case "push":
      return {
        title: "Meldingen staan nog uit",
        body: "Zonder meldingen mis je nieuwe events, herinneringen, berichten tijdens een rit en nieuws over je trainingsschema. Op een iPhone werkt dat alleen als ZWB als app op je beginscherm staat.",
        href: "/profiel?weergave=bewerken#meldingen",
        linkLabel: "Meldingen aanzetten",
      };
    case "telegram":
      return {
        title: "Telegram is nog niet gekoppeld",
        body: "Rijd je met een Wahoo ELEMNT? Die toont geen ZWB-meldingen, wel die van Telegram. Zonder koppeling komen berichten tijdens een rit niet op je fietscomputer.",
        href: "/samen-fietsen",
        linkLabel: "Telegram koppelen",
      };
    case "agenda":
      return {
        title: "Je agenda is nog niet gekoppeld",
        body: "Met een agendalink zie je de events waar je ja op zei, je teamraces en je geplande trainingen in je eigen agenda, zoals Google Agenda, Outlook of Apple Agenda.",
        href: "/profiel?weergave=bewerken#agenda",
        linkLabel: "Agendalink maken",
      };
    case "live":
      return {
        title: "Live volgen is nog niet gekoppeld",
        body: "Koppel je Garmin of Wahoo, dan kunnen clubleden je tijdens een rit live op de kaart volgen. Dat zet je per rit aan.",
        href: "/samen-fietsen",
        linkLabel: "Live volgen koppelen",
      };
  }
}

/** Opschonen voor opslag: witruimte eraf, hooguit NOTICE_BODY_MAX tekens. */
export function cleanNoticeBody(value: unknown): string | null {
  const text = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text || text.length > NOTICE_BODY_MAX) return null;
  return text;
}
