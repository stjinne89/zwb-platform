// Dagelijkse trainingsronde: dagvoorstellen, blijven liggen herzieningen en
// gestrande AI-generaties.
//
// De runbook noemde hiervoor een "externe cron", maar die is nooit ingesteld:
// training_adaptation_runs was op 20 augustus 2026 nog volledig leeg, terwijl de
// route al maanden bestond. Daarmee draaide ook het vangnet voor vastgelopen
// herzieningen niet. Als functie in deze repo staat de cron in versiebeheer en
// hoeft niemand hem ergens anders te onthouden — één aanroep per ochtend.

export const config = {
  // 08:30 UTC is 09:30 Nederlandse tijd in de winter en 10:30 in de zomer.
  // Dan heeft intervals.icu doorgaans de hersteldata van de huidige dag al.
  schedule: "30 8 * * *",
};

export default async function handler() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;
  const secret = process.env.TRAINING_ADAPTATION_SECRET;

  if (!siteUrl || !secret) {
    return new Response(
      "Missing NEXT_PUBLIC_SITE_URL/URL or TRAINING_ADAPTATION_SECRET",
      { status: 500 },
    );
  }

  const url = `${siteUrl.replace(/\/$/, "")}/api/training/adaptations/daily`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
    },
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/plain",
    },
  });
}
