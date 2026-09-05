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
