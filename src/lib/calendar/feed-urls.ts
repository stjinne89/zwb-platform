// Links naar het agenda-abonnement, los van feed-token.ts zodat de browser
// geen node:crypto binnenhaalt.

export type CalendarFeedUrls = {
  /** Om te kopiëren; werkt in elke agenda-app. */
  https: string;
  /** Opent op iPhone, Mac en in de Outlook-app direct het abonneervenster. */
  webcal: string;
  google: string;
  outlook: string;
};

export function calendarFeedUrls(siteUrl: string, token: string): CalendarFeedUrls {
  const https = `${siteUrl.replace(/\/+$/, "")}/api/agenda/${token}.ics`;
  const webcal = https.replace(/^https?:\/\//i, "webcal://");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=ZWB`,
  };
}
