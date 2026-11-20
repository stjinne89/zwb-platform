"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, ImageUp, Radio } from "lucide-react";
import {
  prepareStream,
  refreshStreamThumbnail,
  setOverlaySize,
  setOverlayStand,
  setOverlayStyle,
  setOverlayTheme,
} from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";
import { OVERLAY_STYLES } from "@/lib/youtube-live/overlay-styles";
import { OVERLAY_SIZES, type OverlaySize } from "@/lib/youtube-live/overlay-size";
import { cn } from "@/lib/utils";

// Na het klaarzetten verdwijnt PrepareStreamButton en verschijnt ThumbnailButton;
// een geweigerde thumbnail gaat via deze map mee, per race.
const thumbnailErrors = new Map<string, string>();

/** Klaarzetten, met de grootte van het Zwift-beeld (0348, 0350; standaard die van de vorige stream). */
export function PrepareStreamButton({ eventId, initialSize }: { eventId: string; initialSize: OverlaySize }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(initialSize);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SizeSelect value={size} disabled={pending} onChange={setSize} />
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await prepareStream(eventId, size);
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

function SizeSelect({ value, disabled, onChange }: { value: OverlaySize; disabled: boolean; onChange: (value: OverlaySize) => void }) {
  return (
    <select
      aria-label="Zwift-beeld"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as OverlaySize)}
      className="h-8 rounded-md border bg-background px-2 text-sm"
    >
      {OVERLAY_SIZES.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** De resolutie van de overlay bij een stream die al klaarstaat (0348). */
export function OverlaySizeSelect({ streamId, initial }: { streamId: string; initial: OverlaySize }) {
  const [size, setSize] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <SizeSelect
        value={size}
        disabled={pending}
        onChange={(next) => {
          const was = size;
          setSize(next);
          setError(null);
          startTransition(async () => {
            const res = await setOverlaySize(streamId, next);
            if (!res.ok) {
              setSize(was);
              setError(res.error);
            }
          });
        }}
      />
      {error && <span className="text-sm text-destructive">{error}</span>}
    </>
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
 * gaat meteen opnieuw naar YouTube. Ingeklapt; open toont het elke stijl als
 * de echte thumbnail van deze stream, en de gekozen overlay in het klein
 * (2026-11-20). Pas bij openen laden de voorbeelden. Bij strip een link naar
 * de eigen kopman, die sinds 0349 op het profiel staat.
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
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState(initialStyle);
  const [theme, setTheme] = useState(initialTheme);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = OVERLAY_STYLES.find((s) => s.key === look);

  function change<T extends string>(next: T, was: T, set: (v: T) => void, save: () => Promise<LookResult>) {
    if (next === was) return;
    set(next);
    setError(null);
    startTransition(async () => {
      const res = await save();
      if (!res.ok) {
        set(was);
        setError(res.error);
      } else if (res.thumbnailError) {
        setError(res.thumbnailError);
      }
    });
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        Stijl · {current?.label}
        {current?.modes && <span className="text-muted-foreground">· {theme === "dark" ? "Donker" : "Licht"}</span>}
      </button>
      {open && (
        <div className="grid gap-4">
          <div role="radiogroup" aria-label="Stijl" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {OVERLAY_STYLES.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={look === option.key}
                disabled={pending}
                onClick={() => change(option.key, look, setLook, () => setOverlayStyle(streamId, option.key))}
                className="group grid gap-1.5 text-left disabled:opacity-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl(streamId, "thumbnail", option.key, option.modes ? theme : "dark")}
                  alt=""
                  width={1280}
                  height={720}
                  loading="lazy"
                  className={cn(
                    "aspect-video w-full rounded-md border bg-muted object-cover transition",
                    look === option.key ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "group-hover:opacity-90",
                  )}
                />
                <span className={cn("text-sm", look === option.key ? "font-semibold" : "text-muted-foreground")}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
          {current?.modes && (
            <Segmented
              label="Donker of licht"
              options={THEME_OPTIONS}
              value={theme}
              disabled={pending}
              onChange={(next) => change(next, theme, setTheme, () => setOverlayTheme(streamId, next))}
            />
          )}
          {look === "strip" && (
            <Link href="/profiel?weergave=bewerken#kopman" className="w-fit text-sm font-medium underline underline-offset-4">
              Kopman aanpassen
            </Link>
          )}
          <OverlayPreview src={previewUrl(streamId, "overlay", look, current?.modes ? theme : "dark")} />
        </div>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

function previewUrl(streamId: string, kind: "thumbnail" | "overlay", look: Look, theme: Theme): string {
  const query = new URLSearchParams({ style: look, theme });
  if (kind === "overlay") query.set("preview", "");
  return `/live/stream/${streamId}/${kind}?${query}`;
}

/** De overlay op schaal, met een donker vlak waar Zwift komt. */
function OverlayPreview({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1920));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-md border bg-neutral-800">
      {scale > 0 && (
        <iframe
          key={src}
          src={src}
          title="Overlay"
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: 1920, height: 1080, transform: `scale(${scale})`, colorScheme: "normal" }}
        />
      )}
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
