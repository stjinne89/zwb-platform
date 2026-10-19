import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HELP_VIDEOS, type HelpVideoId } from "../_data";

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function videoById(id: HelpVideoId) {
  return HELP_VIDEOS.find((video) => video.id === id)!;
}

// Een gewone link naar het mp4-bestand: op de telefoon opent de eigen
// videospeler, en er hoeft geen speler in de pagina te laden.
function videoHref(id: HelpVideoId) {
  return `/hulp-video/${id}.mp4`;
}

/**
 * "Bekijk de video" onder een hulponderdeel. De prop heet bewust niet `id`:
 * tests/unit/help-categories.test.ts leest `id="..."` uit deze bestanden als
 * anker van de hulppagina.
 */
export function HelpVideoLink({ video: id, className }: { video: HelpVideoId; className?: string }) {
  const video = videoById(id);
  return (
    <a
      href={videoHref(id)}
      target="_blank"
      rel="noopener"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline",
        className,
      )}
    >
      <PlayCircle className="size-4" aria-hidden />
      Bekijk de video
      <span className="font-normal text-muted-foreground">({duration(video.seconds)})</span>
    </a>
  );
}

/** Alle video's onder elkaar, voor de categorie Beginnen. Het anker `videos`
 * staat op de sectie in beginnen.tsx, waar de hulptest de ankers leest. */
export function HelpVideoList() {
  return (
    <>
      <h2 className="flex items-center gap-2 font-semibold">
        <PlayCircle className="size-5 text-primary" aria-hidden />
        Korte video&apos;s
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {HELP_VIDEOS.map((video) => (
          <li key={video.id}>
            <a
              href={videoHref(video.id)}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm transition hover:border-primary/40"
            >
              <span className="font-medium">{video.title}</span>
              <span className="text-muted-foreground">{duration(video.seconds)}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
