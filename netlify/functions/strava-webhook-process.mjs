export const config = {
  // Elke 5 minuten. De webhook-callback mag zelf niets verwerken (Strava eist een
  // 200 binnen 2 seconden), dus dit is wat de wachtrij leegtrekt.
  //
  // Bewust niet elke minuut: elke tik kost twee Netlify-invocaties (deze functie
  // plus de route die hij aanroept), en dat is ~86k per maand voor iets dat het
  // grootste deel van de dag niets te doen heeft. Netlify-credits zijn beperkt
  // (zie AGENTS.md). Vijf minuten is nog altijd 3 tot 6 keer sneller dan de
  // kwartierpoll die dit vervangt, en Strava heeft er geen mening over: die kijkt
  // alleen naar hoe snel de callback antwoordt.
  schedule: "*/5 * * * *",
};

export default async function handler() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;
  const secret = process.env.STRAVA_SYNC_SECRET;

  if (!siteUrl || !secret) {
    return new Response("Missing NEXT_PUBLIC_SITE_URL/URL or STRAVA_SYNC_SECRET", {
      status: 500,
    });
  }

  const url = `${siteUrl.replace(/\/$/, "")}/api/strava/webhook/process`;
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/plain",
    },
  });
}
