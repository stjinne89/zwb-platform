// Detecteer Spotify- en YouTube-links en converteer naar embed-URLs.

export type SpotifyEmbed = {
  type: "show" | "episode" | "album" | "playlist" | "track";
  embedUrl: string;
  openUrl: string;
};

export function detectSpotify(url: string): SpotifyEmbed | null {
  const m = url.match(
    /^https:\/\/open\.spotify\.com(?:\/embed)?\/(show|episode|album|playlist|track)\/([A-Za-z0-9]+)/i,
  );
  if (!m) return null;
  const type = m[1].toLowerCase() as SpotifyEmbed["type"];
  const id = m[2];
  return {
    type,
    embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`,
    openUrl: `https://open.spotify.com/${type}/${id}`,
  };
}

export type YouTubeEmbed = {
  videoId: string;
  embedUrl: string;
  openUrl: string;
};

export function detectYouTube(url: string): YouTubeEmbed | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i,
  );
  if (!m) return null;
  const videoId = m[1];
  return {
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    openUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export type GoogleDriveEmbed = {
  type: "file" | "doc" | "sheet" | "slide";
  embedUrl: string;
  openUrl: string;
  /** Aanbevolen iframe-hoogte */
  defaultHeight: number;
};

/**
 * Herkent Google Drive / Docs / Sheets / Slides URLs en geeft een
 * embed-URL terug (publieke preview-modus). Werkt alleen als de
 * gebruiker het document heeft gedeeld met "iedereen met de link".
 */
export function detectGoogleDrive(url: string): GoogleDriveEmbed | null {
  // 1. drive.google.com/file/d/{ID}/...  (PDFs, beelden, video, willekeurig bestand)
  let m = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (m) {
    const id = m[1];
    return {
      type: "file",
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      openUrl: `https://drive.google.com/file/d/${id}/view`,
      defaultHeight: 640,
    };
  }

  // 2. docs.google.com/{document|spreadsheets|presentation}/d/{ID}/...
  m = url.match(
    /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]+)/,
  );
  if (m) {
    const kind = m[1] as "document" | "spreadsheets" | "presentation";
    const id = m[2];
    const type =
      kind === "document" ? "doc" : kind === "spreadsheets" ? "sheet" : "slide";
    const embedPath = kind === "presentation" ? "embed" : "preview";
    return {
      type,
      embedUrl: `https://docs.google.com/${kind}/d/${id}/${embedPath}`,
      openUrl: `https://docs.google.com/${kind}/d/${id}/edit`,
      defaultHeight:
        kind === "document" ? 720 : kind === "spreadsheets" ? 520 : 480,
    };
  }

  // 3. drive.google.com/open?id={ID}
  m = url.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/);
  if (m) {
    const id = m[1];
    return {
      type: "file",
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      openUrl: `https://drive.google.com/file/d/${id}/view`,
      defaultHeight: 640,
    };
  }

  return null;
}
