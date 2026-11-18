"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { removeStream } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function LiveDot() {
  return <span className="size-2 rounded-full bg-red-600" aria-label="live" />;
}

export type PlayerStream = {
  id: string;
  name: string;
  embedUrl: string;
  watchUrl: string;
  /** Volgens de laatste controle bij YouTube (0339). */
  live?: boolean;
};

/**
 * De YouTube-speler bij een race (livestreams, 0338). Meer streams: een knop per
 * lid, standaard wie als eerste klaarzette.
 */
export function StreamPlayer({
  streams,
  removableIds = [],
}: {
  streams: PlayerStream[];
  /** Streams die deze kijker mag weghalen: de eigen, of alle voor eventbeheer. */
  removableIds?: string[];
}) {
  const [selectedId, setSelectedId] = useState(streams[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selected = streams.find((stream) => stream.id === selectedId) ?? streams[0];
  if (!selected) return null;

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeStream(id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      {streams.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {streams.map((stream) => (
            <Button
              key={stream.id}
              type="button"
              size="sm"
              role="tab"
              aria-selected={stream.id === selected.id}
              variant={stream.id === selected.id ? "default" : "outline"}
              onClick={() => setSelectedId(stream.id)}
            >
              {stream.live && <LiveDot />}
              {stream.name}
            </Button>
          ))}
        </div>
      )}
      <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
        <iframe
          key={selected.id}
          src={selected.embedUrl}
          title={`Stream van ${selected.name}`}
          className="size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className={cn("flex flex-wrap items-center gap-3 text-sm")}>
        {streams.length === 1 && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {selected.live && <LiveDot />}
            {selected.name}
          </span>
        )}
        <a
          href={selected.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline"
        >
          Op YouTube
          <ArrowUpRight className="size-3.5" />
        </a>
        {removableIds.includes(selected.id) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => remove(selected.id)}
          >
            <Trash2 className="size-3.5" />
            Weghalen
          </Button>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>
    </div>
  );
}
