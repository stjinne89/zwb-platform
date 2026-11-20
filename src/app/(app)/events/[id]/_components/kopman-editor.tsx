"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveStreamKopman } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";
import { kopmanSvg } from "@/components/livestream/kopman-figure";
import {
  DEFAULT_KOPMAN,
  KOPMAN_FACIAL,
  KOPMAN_GLASSES,
  KOPMAN_HAIR,
  KOPMAN_HAIR_COLORS,
  KOPMAN_SKINS,
  kopmanColors,
  kopmanFace,
  kopmanHelmets,
  type KopmanLook,
  type KopmanMood,
} from "@/lib/youtube-live/kopman";
import type { TenueInks } from "@/lib/youtube-live/overlay-styles";
import { cn } from "@/lib/utils";

// De eigen kopman bij de stijl Strip (0347, 2026-11-20). Het voorbeeld tekent
// meteen mee; pas Opslaan bewaart hem en zet de thumbnail opnieuw op YouTube
// (elke keer opnieuw zou de YouTube-quota opmaken).

const MOODS: KopmanMood[] = ["aanval", "limiet", "zege"];

type Kind = "geen" | KopmanLook["body"];

export function KopmanEditor({
  streamId,
  initial,
  tenue,
  onSaved,
  onError,
}: {
  streamId: string;
  initial: KopmanLook | null;
  /** Het clubtenue, van de server. */
  tenue: TenueInks;
  onSaved: () => void;
  onError: (message: string | null) => void;
}) {
  const [saved, setSaved] = useState<KopmanLook | null>(initial);
  const [kind, setKind] = useState<Kind>(initial?.body ?? "geen");
  const [look, setLook] = useState<KopmanLook>(initial ?? DEFAULT_KOPMAN);
  const [pending, startTransition] = useTransition();

  const current: KopmanLook | null = kind === "geen" ? null : { ...look, body: kind, facial: kind === "man" ? look.facial : 0 };
  const dirty = JSON.stringify(current) !== JSON.stringify(saved);
  const set = (change: Partial<KopmanLook>) => setLook({ ...look, ...change });
  const colors = kopmanColors(tenue, current);

  function save() {
    onError(null);
    startTransition(async () => {
      const res = await saveStreamKopman(current, streamId);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      setSaved(current);
      if (res.thumbnailError) onError(res.thumbnailError);
      onSaved();
    });
  }

  return (
    <div className="grid gap-3">
      <span className="text-sm font-medium">Je kopman</span>
      <Choice
        label="Kopman"
        options={[
          { value: "geen", label: "Geen" },
          { value: "man", label: "Man" },
          { value: "vrouw", label: "Vrouw" },
        ]}
        value={kind}
        onChange={(next) => {
          // Een ander kapsel per soort: terug naar het eerste.
          if (next !== "geen" && next !== look.body) setLook({ ...look, body: next, hair: 0 });
          setKind(next);
        }}
      />
      {current && (
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid gap-2">
            <div className="size-40 overflow-hidden rounded-md border-4" style={{ borderColor: colors.helmet }}>
              {kopmanSvg({ face: kopmanFace(current), colors, mood: "rust", uid: "edit" })}
            </div>
            <div className="flex gap-2">
              {MOODS.map((mood) => (
                <div key={mood} className="size-12 overflow-hidden rounded border-2" style={{ borderColor: colors.helmet }}>
                  {kopmanSvg({ face: kopmanFace(current), colors, mood, uid: `edit${mood}`, frame: "face" })}
                </div>
              ))}
            </div>
          </div>
          <div className="grid min-w-64 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
            <Row label="Huid">
              <Swatches
                label="Huid"
                colors={KOPMAN_SKINS.map((hex, i) => ({ hex, label: `Huid ${i + 1}` }))}
                value={look.skin}
                onChange={(skin) => set({ skin })}
              />
            </Row>
            <Row label="Kapsel">
              <Choice
                label="Kapsel"
                options={KOPMAN_HAIR[current.body].map((label, value) => ({ value, label }))}
                value={current.hair}
                onChange={(hair) => set({ hair })}
              />
            </Row>
            <Row label="Haar">
              <Swatches label="Haarkleur" colors={KOPMAN_HAIR_COLORS} value={look.hairColor} onChange={(hairColor) => set({ hairColor })} />
            </Row>
            {current.body === "man" && (
              <Row label="Gezicht">
                <Choice
                  label="Gezichtshaar"
                  options={KOPMAN_FACIAL.map((label, value) => ({ value, label }))}
                  value={current.facial}
                  onChange={(facial) => set({ facial })}
                />
              </Row>
            )}
            <Row label="Helm">
              <Swatches label="Helm" colors={kopmanHelmets(tenue)} value={look.helmet} onChange={(helmet) => set({ helmet })} />
            </Row>
            <Row label="Bril">
              <Choice
                label="Bril"
                options={KOPMAN_GLASSES.map((label, value) => ({ value, label }))}
                value={current.glasses}
                onChange={(glasses) => set({ glasses })}
              />
            </Row>
          </div>
        </div>
      )}
      {dirty && (
        <Button type="button" size="sm" className="w-fit" disabled={pending} onClick={save}>
          {pending ? "Bezig…" : "Kopman opslaan"}
        </Button>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </>
  );
}

function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-fit flex-wrap rounded-md border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
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

function Swatches({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: readonly { hex: string; label: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {colors.map((color, i) => (
        <button
          key={color.hex}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={color.label}
          title={color.label}
          onClick={() => onChange(i)}
          className={cn(
            "size-8 rounded-full border border-foreground/30 transition",
            value === i && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  );
}
