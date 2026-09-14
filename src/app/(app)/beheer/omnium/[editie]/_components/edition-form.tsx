"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEFAULT_OMNIUM_PARTS, generateEdition } from "@/lib/omnium/edition";
import type { Discipline } from "@/lib/omnium/scoring";
import { updateOmniumEdition } from "../../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export type EditionPartRow = {
  id: string;
  discipline: Discipline;
  order_index: number;
  title: string;
  starts_at: string;
  duration_minutes: number | null;
  break_minutes: number | null;
  route_name: string | null;
  route_url: string | null;
  world: string | null;
  distance_km: number | null;
  laps: number | null;
  zwift_event_id: string | null;
  sprint_count: number | null;
  drafting: boolean | null;
};

type PartState = {
  discipline: Discipline;
  title: string;
  durationMinutes: number;
  breakMinutes: number;
  routeName: string;
  routeUrl: string;
  world: string;
  distanceKm: string;
  laps: string;
  zwiftEventId: string;
  sprintCount: number;
};

function toState(rows: EditionPartRow[]): PartState[] {
  return DEFAULT_OMNIUM_PARTS.map((fallback) => {
    const row = rows.find((part) => part.discipline === fallback.discipline);
    return {
      discipline: fallback.discipline,
      title: row?.title ?? fallback.title,
      durationMinutes: row?.duration_minutes ?? fallback.durationMinutes,
      breakMinutes: row?.break_minutes ?? fallback.breakMinutes,
      routeName: row?.route_name ?? "",
      routeUrl: row?.route_url ?? "",
      world: row?.world ?? "",
      distanceKm: row?.distance_km != null ? String(row.distance_km) : "",
      laps: row?.laps != null ? String(row.laps) : "",
      zwiftEventId: row?.zwift_event_id ?? "",
      sprintCount: row?.sprint_count ?? fallback.sprintCount ?? 0,
    };
  });
}

function amsterdamHhmm(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Haalt het nummer uit een geplakte zwift.com/events/view/<id>-link. */
function zwiftEventIdFrom(raw: string): string {
  const trimmed = raw.trim();
  const match = /events\/view\/(\d+)/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

export function EditionForm({
  editionId,
  startAtIso,
  published,
  initial,
  parts: partRows,
}: {
  editionId: string;
  startAtIso: string;
  published: boolean;
  initial: {
    title: string;
    subtitle: string;
    slug: string;
    introMd: string;
    youtubeUrl: string;
  };
  parts: EditionPartRow[];
}) {
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [slug, setSlug] = useState(initial.slug);
  const [introMd, setIntroMd] = useState(initial.introMd);
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl);
  const [reconDateKey, setReconDateKey] = useState("");
  const [reconTimeLocal, setReconTimeLocal] = useState("19:45");
  const [parts, setParts] = useState<PartState[]>(() => toState(partRows));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const preview = useMemo(
    () =>
      generateEdition({
        seasonSlug: "preview",
        number: 1,
        slug: slug || "preview",
        title: title || "Editie",
        dateKey: startAtIso.slice(0, 10),
        firstStartLocal: amsterdamHhmm(startAtIso),
        parts: parts.map((part) => ({
          discipline: part.discipline,
          title: part.title,
          durationMinutes: part.durationMinutes,
          breakMinutes: part.breakMinutes,
        })),
      }),
    [parts, slug, title, startAtIso],
  );

  function patch(discipline: Discipline, changes: Partial<PartState>) {
    setParts((prev) =>
      prev.map((part) =>
        part.discipline === discipline ? { ...part, ...changes } : part,
      ),
    );
  }

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await updateOmniumEdition({
        editionId,
        title,
        subtitle,
        slug,
        introMd,
        youtubeUrl,
        reconDateKey: reconDateKey || undefined,
        reconTimeLocal: reconDateKey ? reconTimeLocal : undefined,
        parts: parts.map((part) => ({
          discipline: part.discipline,
          title: part.title,
          durationMinutes: part.durationMinutes,
          breakMinutes: part.breakMinutes,
          routeName: part.routeName,
          routeUrl: part.routeUrl,
          world: part.world,
          distanceKm: part.distanceKm ? Number(part.distanceKm) : undefined,
          laps: part.laps ? Number(part.laps) : undefined,
          zwiftEventId: part.zwiftEventId,
          sprintCount: part.sprintCount,
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Opgeslagen.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {published && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          Deze editie staat publiek. Wijzigingen zijn direct zichtbaar.
        </p>
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Editie
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="edition-title">
              Titel
            </label>
            <input
              id="edition-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="edition-subtitle">
              Ondertitel
            </label>
            <input
              id="edition-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="edition-slug">
              Slug
            </label>
            <input
              id="edition-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="edition-youtube">
              YouTube-URL
            </label>
            <input
              id="edition-youtube"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              className={FIELD}
            />
          </div>
        </div>
        <div>
          <label className={LABEL} htmlFor="edition-intro">
            Intro
          </label>
          <textarea
            id="edition-intro"
            rows={3}
            value={introMd}
            onChange={(event) => setIntroMd(event.target.value)}
            className={FIELD}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="edition-recon-date">
              Recon-rit
            </label>
            <input
              id="edition-recon-date"
              type="date"
              value={reconDateKey}
              onChange={(event) => setReconDateKey(event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="edition-recon-time">
              Tijd recon
            </label>
            <input
              id="edition-recon-time"
              type="time"
              value={reconTimeLocal}
              onChange={(event) => setReconTimeLocal(event.target.value)}
              className={FIELD}
              disabled={!reconDateKey}
            />
          </div>
        </div>
      </section>

      {parts.map((part, index) => (
        <section
          key={part.discipline}
          className="space-y-3 rounded-lg border bg-card p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {index + 1}. {part.title}
            </h2>
            {preview && (
              <span className="tabular-nums text-sm text-muted-foreground">
                {amsterdamHhmm(preview.parts[index].startAtIso)}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-title`}>
                Titel
              </label>
              <input
                id={`${part.discipline}-title`}
                value={part.title}
                onChange={(event) =>
                  patch(part.discipline, { title: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-route`}>
                Route
              </label>
              <input
                id={`${part.discipline}-route`}
                value={part.routeName}
                onChange={(event) =>
                  patch(part.discipline, { routeName: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-world`}>
                Wereld
              </label>
              <input
                id={`${part.discipline}-world`}
                value={part.world}
                onChange={(event) =>
                  patch(part.discipline, { world: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-routeurl`}>
                ZwiftInsider-link
              </label>
              <input
                id={`${part.discipline}-routeurl`}
                value={part.routeUrl}
                onChange={(event) =>
                  patch(part.discipline, { routeUrl: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-distance`}>
                Afstand (km)
              </label>
              <input
                id={`${part.discipline}-distance`}
                inputMode="decimal"
                value={part.distanceKm}
                onChange={(event) =>
                  patch(part.discipline, { distanceKm: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-laps`}>
                Rondes
              </label>
              <input
                id={`${part.discipline}-laps`}
                inputMode="numeric"
                value={part.laps}
                onChange={(event) =>
                  patch(part.discipline, { laps: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-duration`}>
                Duur (min)
              </label>
              <input
                id={`${part.discipline}-duration`}
                type="number"
                min={1}
                value={part.durationMinutes}
                onChange={(event) =>
                  patch(part.discipline, {
                    durationMinutes: Number(event.target.value),
                  })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-break`}>
                Pauze erna (min)
              </label>
              <input
                id={`${part.discipline}-break`}
                type="number"
                min={0}
                value={part.breakMinutes}
                onChange={(event) =>
                  patch(part.discipline, {
                    breakMinutes: Number(event.target.value),
                  })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor={`${part.discipline}-zwift`}>
                Zwift-event
              </label>
              <input
                id={`${part.discipline}-zwift`}
                value={part.zwiftEventId}
                onChange={(event) =>
                  patch(part.discipline, {
                    zwiftEventId: zwiftEventIdFrom(event.target.value),
                  })
                }
                className={FIELD}
              />
            </div>
            {part.discipline === "crit" && (
              <div>
                <label className={LABEL} htmlFor="crit-sprints">
                  Tussensprints
                </label>
                <input
                  id="crit-sprints"
                  type="number"
                  min={0}
                  max={10}
                  value={part.sprintCount}
                  onChange={(event) =>
                    patch(part.discipline, {
                      sprintCount: Number(event.target.value),
                    })
                  }
                  className={FIELD}
                />
              </div>
            )}
          </div>
        </section>
      ))}

      {preview && (
        <p className="text-sm text-muted-foreground">
          Loopt van {amsterdamHhmm(preview.startAtIso)} tot{" "}
          {amsterdamHhmm(preview.endAtIso)} — {preview.totalMinutes} minuten.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
    </div>
  );
}
