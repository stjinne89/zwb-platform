// Lichte RSS-parser voor podcast-feeds (standaard RSS 2.0 + iTunes/Spotify namespaces).
// Genoeg voor 95% van de podcast-hosts (Anchor, Buzzsprout, Podbean, Castos, Acast).

export type RssEpisode = {
  guid: string;
  title: string;
  description: string;
  pubDate: string; // ISO
  audioUrl: string | null;
  webUrl: string | null;
  imageUrl: string | null;
  duration: string | null;
};

export type RssFeed = {
  title: string;
  description: string;
  imageUrl: string | null;
  episodes: RssEpisode[];
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function cleanCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTag(xml: string, tag: string): string | null {
  // Escape ":" voor namespaced tags (itunes:image)
  const safeTag = tag.replace(/:/g, "\\:");
  const re = new RegExp(`<${safeTag}[^>]*>([\\s\\S]*?)</${safeTag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return decodeEntities(cleanCdata(m[1]));
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const safeTag = tag.replace(/:/g, "\\:");
  const re = new RegExp(`<${safeTag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m?.[1] ?? null;
}

export async function fetchRssFeed(url: string): Promise<RssFeed> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ZWB-Platform RSS fetcher)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`RSS fetch faalde: HTTP ${res.status}`);
  }
  const xml = await res.text();

  // Channel-level metadata
  const channelMatch = xml.match(/<channel[\s\S]*?>([\s\S]*?)<\/channel>/i);
  const channelXml = channelMatch?.[1] ?? xml;

  const channelTitle = extractTag(channelXml, "title") ?? "";
  const channelDescription = extractTag(channelXml, "description") ?? "";

  // Channel image — eerst itunes:image, dan klassieke <image><url>
  let channelImage = extractAttr(channelXml, "itunes:image", "href");
  if (!channelImage) {
    const imageBlock = extractTag(channelXml, "image");
    if (imageBlock) channelImage = extractTag(imageBlock, "url");
  }

  // Items — alleen binnen channel (anders pakt hij iTunes-image-tags op)
  // Splits eerst <item> blokken eruit.
  const itemMatches = channelXml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  const episodes: RssEpisode[] = itemMatches.map((itemXml) => {
    const title = extractTag(itemXml, "title") ?? "";
    const rawDesc =
      extractTag(itemXml, "content:encoded") ??
      extractTag(itemXml, "description") ??
      "";
    const description = stripHtml(rawDesc);
    const pubDateRaw = extractTag(itemXml, "pubDate");
    const pubDate = pubDateRaw
      ? new Date(pubDateRaw).toISOString()
      : new Date().toISOString();
    const guid = extractTag(itemXml, "guid") ?? extractTag(itemXml, "link") ?? title;
    const audioUrl = extractAttr(itemXml, "enclosure", "url");
    const webUrl = extractTag(itemXml, "link");
    const imageUrl = extractAttr(itemXml, "itunes:image", "href");
    const duration = extractTag(itemXml, "itunes:duration");

    return {
      guid,
      title,
      description,
      pubDate,
      audioUrl,
      webUrl,
      imageUrl,
      duration,
    };
  });

  return {
    title: channelTitle,
    description: channelDescription,
    imageUrl: channelImage,
    episodes,
  };
}
