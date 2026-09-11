// LET OP: scheduled functions gaan op deze site niet af (zie docs/runbook.md
// sectie 8). De echte trigger staat sinds 2026-09-08 op cron-job.org. Dit
// bestand blijft staan voor het geval Netlify het ooit weer doet; pas het niet
// aan zonder ook de cron-job.org-job bij te werken.

export const config = {
  // Dagelijks om 03:40 UTC, ná de reconcile: openstaande deauthorisaties
  // afmaken, opgeruimde koppelingen wissen en het inactiviteitsbeleid draaien.
  schedule: "40 3 * * *",
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

  const url = `${siteUrl.replace(/\/$/, "")}/api/strava/lifecycle`;
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
