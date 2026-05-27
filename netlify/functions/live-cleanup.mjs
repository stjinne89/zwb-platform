export const config = {
  schedule: "*/15 * * * *",
};

export default async function handler() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;
  const secret = process.env.LIVE_CLEANUP_SECRET;

  if (!siteUrl || !secret) {
    return new Response("Missing NEXT_PUBLIC_SITE_URL/URL or LIVE_CLEANUP_SECRET", {
      status: 500,
    });
  }

  const cleanupUrl = `${siteUrl.replace(/\/$/, "")}/api/live/cleanup`;
  const response = await fetch(cleanupUrl, {
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
