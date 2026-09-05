export const config = {
  // Elke minuut: de webhook-callback mag zelf niets verwerken (Strava eist een
  // 200 binnen 2 seconden), dus dit is wat de wachtrij leegtrekt.
  schedule: "* * * * *",
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
