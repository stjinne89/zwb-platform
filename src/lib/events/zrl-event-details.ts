// Wat een gewoon Zwift-event bij "Ophalen" krijgt, ook voor een ZRL-race:
// de wereld als locatie, de banner als cover en de omschrijving van het event.
//
// Een ZRL-teamrace wordt automatisch gekoppeld (zrl-event-link.ts) en kreeg
// daarbij alleen route, afstand en spelregels. Het teamevent krijgt de locatie
// en cover; de raceweek erboven ook, plus de omschrijving, die de eventpagina
// al op elk teamevent eronder toont. Alleen lege velden: wat een captain zelf
// invult blijft staan.
//
// WTRL gebruikt één banner voor alle divisies van een ronde. Die staat daarom
// één keer in de opslag, onder een naam uit de URL, en elk event wijst ernaar.
// Een event verwijderen ruimt alleen zijn eigen map op, niet `covers/`.

import { createHash } from "node:crypto";
import {
  absoluteHttpUrl,
  cleanDescription,
  fetchCoverImage,
  zwiftLocation,
} from "@/lib/events/link-prefill";
import type { ZwiftEventInfo } from "@/lib/events/zwift-route";

type AdminClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: { from: (bucket: string) => any };
};

type StoredDetails = {
  location: string | null;
  description?: string | null;
  cover_image_path: string | null;
};

export type ZrlDetailUpdate = {
  location?: string;
  description?: string;
  cover_image_path?: string;
};

const blank = (value: string | null | undefined) => !String(value ?? "").trim();

/**
 * Wat er aan lege velden bij moet, of null als er niets te vullen is. Puur.
 * Zonder `description` in `stored` blijft de omschrijving buiten beschouwing.
 */
export function zrlDetailUpdate(
  stored: StoredDetails,
  info: Pick<ZwiftEventInfo, "route" | "description">,
  coverPath: string | null,
): ZrlDetailUpdate | null {
  const update: ZrlDetailUpdate = {};
  const location = zwiftLocation(info);
  if (location && blank(stored.location)) update.location = location;
  if (coverPath && blank(stored.cover_image_path)) update.cover_image_path = coverPath;
  if ("description" in stored && blank(stored.description)) {
    // WTRL schrijft apostroffen dubbel: "The world''s Greatest".
    const description = cleanDescription(info.description?.replace(/''/g, "'"));
    if (description) update.description = description;
  }
  return Object.keys(update).length > 0 ? update : null;
}

/** Het opslagpad van een Zwift-banner: per URL altijd hetzelfde. */
export function zwiftCoverPath(imageUrl: string, ext: string): string {
  const hash = createHash("sha256").update(imageUrl).digest("hex").slice(0, 24);
  return `covers/zwift/${hash}.${ext}`;
}

/** Haalt de banner één keer per URL per run op en bewaart hem in event-photos. */
export function zwiftCoverStore(admin: AdminClient) {
  const byUrl = new Map<string, Promise<string | null>>();
  return (info: Pick<ZwiftEventInfo, "imageUrl" | "externalUrl">): Promise<string | null> => {
    const url = absoluteHttpUrl(info.imageUrl, info.externalUrl);
    if (!url) return Promise.resolve(null);
    if (!byUrl.has(url)) {
      byUrl.set(
        url,
        (async () => {
          const image = await fetchCoverImage(url);
          if (!image) return null;
          const path = zwiftCoverPath(url, image.ext);
          const { error } = await admin.storage
            .from("event-photos")
            .upload(path, image.bytes, { contentType: image.contentType, upsert: true });
          return error ? null : path;
        })(),
      );
    }
    return byUrl.get(url)!;
  };
}

type DetailRow = StoredDetails & { id: string; parent_event_id: string | null };

/**
 * Vult de lege velden van gekoppelde ZRL-teamevents en hun raceweek. Leest
 * Zwift niet zelf: de aanroeper heeft het event al opgehaald.
 */
export async function fillZrlEventDetails(
  admin: AdminClient,
  items: Array<{ row: DetailRow; info: ZwiftEventInfo }>,
  notes: string[],
) {
  if (items.length === 0) return;
  const cover = zwiftCoverStore(admin);
  const parentInfo = new Map<string, ZwiftEventInfo>();

  for (const { row, info } of items) {
    if (row.parent_event_id && !parentInfo.has(row.parent_event_id)) {
      parentInfo.set(row.parent_event_id, info);
    }
    const coverPath = blank(row.cover_image_path) ? await cover(info) : null;
    const update = zrlDetailUpdate(
      { location: row.location, cover_image_path: row.cover_image_path },
      info,
      coverPath,
    );
    if (!update) continue;
    const { error } = await admin.from("events").update(update).eq("id", row.id);
    if (error) notes.push(`${row.id}: ${error.message}`);
  }

  if (parentInfo.size === 0) return;
  const { data: parents, error } = await admin
    .from("events")
    .select("id, location, description, cover_image_path")
    .in("id", [...parentInfo.keys()]);
  if (error) {
    notes.push(error.message);
    return;
  }
  for (const parent of (parents ?? []) as Array<StoredDetails & { id: string }>) {
    const info = parentInfo.get(parent.id)!;
    const coverPath = blank(parent.cover_image_path) ? await cover(info) : null;
    const update = zrlDetailUpdate(parent, info, coverPath);
    if (!update) continue;
    const { error: updateError } = await admin
      .from("events")
      .update(update)
      .eq("id", parent.id);
    if (updateError) notes.push(`${parent.id}: ${updateError.message}`);
  }
}
