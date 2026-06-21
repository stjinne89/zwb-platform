export const config = {
  schedule: "0 * * * *",
};

export default async function handler() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;
  const secret = process.env.HEALTHCHECK_SECRET;

  if (!siteUrl || !secret) {
    return new Response(
      "Missing NEXT_PUBLIC_SITE_URL/URL or HEALTHCHECK_SECRET",
      { status: 500 },
    );
  }

  const url = `${siteUrl.replace(/\/$/, "")}/api/health/integrations`;
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
