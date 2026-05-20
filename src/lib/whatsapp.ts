// Haalt publieke Open Graph metadata op van een chat.whatsapp.com invite URL.
// Werkt zolang de groep "shareable via link" aan heeft staan in WhatsApp.

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeHtmlEntities(s: string): string {
  return s.replace(/&[a-z#0-9]+;/gi, (match) => HTML_ENTITIES[match] ?? match);
}

export type WhatsAppGroupInfo = {
  name: string | null;
  iconUrl: string | null;
  description: string | null;
};

export function isValidInviteUrl(url: string): boolean {
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+\/?$/i.test(url.trim());
}

export async function fetchWhatsAppGroupInfo(
  inviteUrl: string,
): Promise<WhatsAppGroupInfo> {
  if (!isValidInviteUrl(inviteUrl)) {
    return { name: null, iconUrl: null, description: null };
  }

  let html: string;
  try {
    const res = await fetch(inviteUrl, {
      headers: {
        // chat.whatsapp.com serveert de Open Graph metadata aan elk user-agent.
        "User-Agent":
          "Mozilla/5.0 (compatible; ZWB-Platform/1.0; +https://zwbcycling.nl)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      // Korte timeout zodat een trage WhatsApp-fetch ons admin-form niet ophoudt.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { name: null, iconUrl: null, description: null };
    }
    html = await res.text();
  } catch {
    return { name: null, iconUrl: null, description: null };
  }

  const titleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i,
  );
  const imageMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i,
  );
  const descMatch = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
  );

  let name = titleMatch?.[1] ?? null;
  if (name) {
    // WhatsApp voegt vaak " | WhatsApp" of " | Group Invite" achter de naam.
    name = name
      .replace(/\s*\|\s*WhatsApp.*$/i, "")
      .replace(/\s*\|\s*Group Invite.*$/i, "")
      .trim();
    name = decodeHtmlEntities(name);
  }

  const description = descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : null;

  return {
    name: name && name.length > 0 ? name : null,
    iconUrl: imageMatch?.[1] ?? null,
    description,
  };
}
