"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ImageUp, Radio } from "lucide-react";
import {
  prepareStream,
  refreshStreamThumbnail,
  setOverlayStand,
  setOverlayStyle,
  setOverlayTheme,
} from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";
import { OVERLAY_STYLES } from "@/lib/youtube-live/overlay-styles";
import { cn } from "@/lib/utils";

// Na het klaarzetten verdwijnt PrepareStreamButton en verschijnt ThumbnailButton;
// een geweigerde thumbnail gaat via deze map mee, per race.
const thumbnailErrors = new Map<string, string>();

export function PrepareStreamButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await prepareStream(eventId);
            if (!res.ok) setError(res.error);
            else if (res.thumbnailError) {
              thumbnailErrors.set(eventId, res.thumbnailError);
              router.refresh();
            }
          });
        }}
      >
        <Radio className="size-3.5" />
        {pending ? "Bezig…" : "Stream klaarzetten"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

/** De live stand in de OBS-overlay aan of uit (0341); de overlay volgt bij zijn volgende verversing. */
export function OverlayStandToggle({ streamId, initial }: { streamId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            setError(null);
            startTransition(async () => {
              const res = await setOverlayStand(streamId, next);
              if (!res.ok) {
                setOn(!next);
                setError(res.error);
              }
            });
          }}
          className="size-4 accent-primary"
        />
        <span className="text-sm">Live stand in de overlay</span>
      </label>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

/** Kopieert de link naar de overlay, voor een browserbron in OBS (fase 2). */
export function OverlayLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.open(path, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Gekopieerd" : "Overlay-link voor OBS"}
    </Button>
  );
}

/** Maakt de thumbnail van de eigen stream opnieuw en zet hem op YouTube. */
export function ThumbnailButton({ streamId, eventId }: { streamId: string; eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const fromPrepare = thumbnailErrors.get(eventId) ?? null;
    thumbnailErrors.delete(eventId);
    return fromPrepare;
  });
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          setDone(false);
          startTransition(async () => {
            const res = await refreshStreamThumbnail(streamId);
            if (res.ok) setDone(true);
            else setError(res.error);
          });
        }}
      >
        {done ? <Check className="size-3.5" /> : <ImageUp className="size-3.5" />}
        {pending ? "Bezig…" : done ? "Thumbnail staat erop" : "Thumbnail vernieuwen"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </>
  );
}

const THEME_OPTIONS = [
  { value: "dark", label: "Donker" },
  { value: "light", label: "Licht" },
] as const;

type Theme = (typeof THEME_OPTIONS)[number]["value"];
type Look = (typeof OVERLAY_STYLES)[number]["key"];
type LookResult = Awaited<ReturnType<typeof setOverlayStyle>>;

/**
 * De stijl van overlay en thumbnail (0346), en bij tegels en zeefdruk donker
 * of licht (0345). De overlay volgt bij zijn volgende verversing, de thumbnail
 * gaat meteen opnieuw naar YouTube.
 */
export function OverlayLookPicker({
  streamId,
  initialStyle,
  initialTheme,
}: {
  streamId: string;
  initialStyle: Look;
  initialTheme: Theme;
}) {
  const [look, setLook] = useState(initialStyle);
  const [theme, setTheme] = useState(initialTheme);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change<T extends string>(next: T, current: T, set: (v: T) => void, save: () => Promise<LookResult>) {
    if (next === current) return;
    set(next);
    setError(null);
    startTransition(async () => {
      const res = await save();
      if (!res.ok) {
        set(current);
        setError(res.error);
      } else if (res.thumbnailError) {
        setError(res.thumbnailError);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Stijl"
        options={OVERLAY_STYLES.map((s) => ({ value: s.key, label: s.label }))}
        value={look}
        disabled={pending}
        onChange={(next) => change(next, look, setLook, () => setOverlayStyle(streamId, next))}
      />
      {OVERLAY_STYLES.find((s) => s.key === look)?.modes && (
        <Segmented
          label="Donker of licht"
          options={THEME_OPTIONS}
          value={theme}
          disabled={pending}
          onChange={(next) => change(next, theme, setTheme, () => setOverlayTheme(streamId, next))}
        />
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-8 rounded px-3 text-sm font-medium transition",
            value === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
