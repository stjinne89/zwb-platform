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
