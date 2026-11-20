"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { saveKopman } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";
import { kopmanSvg } from "@/components/livestream/kopman-figure";
import {
  KOPMAN_FACIAL,
  KOPMAN_GLASSES,
  KOPMAN_HAIR,
  KOPMAN_HAIR_COLORS,
  KOPMAN_SHIRTS,
  KOPMAN_SKINS,
  kopmanColors,
  kopmanFace,
  kopmanHelmets,
  type KopmanLook,
  type KopmanMood,
} from "@/lib/youtube-live/kopman";
import type { TenueInks } from "@/lib/youtube-live/overlay-styles";
import { cn } from "@/lib/utils";

// De eigen kopman (0347), op het profiel (0349, 2026-11-20): de figuur op de
// overlay en de thumbnail in Strip, en naar keuze de avatar. Zonder eigen
// kopman staat de standaardkopman klaar (een vrouw bij geslacht vrouw, anders
// een man); pas Opslaan bewaart hem. Het voorbeeld tekent meteen mee.

const MOODS: KopmanMood[] = ["aanval", "limiet", "zege"];

type Avatar = "foto" | "kopman";

export function KopmanEditor({
  initial,
  fallback,
  tenue,
  hasPhoto,
  initialAvatar,
}: {
  /** De opgeslagen kopman, of null. */
  initial: KopmanLook | null;
  /** De standaardkopman, als er nog geen eigen is. */
  fallback: KopmanLook;
  /** Het clubtenue, van de server. */
  tenue: TenueInks;
  /** Alleen met een foto valt er te kiezen; zonder is de kopman de avatar. */
  hasPhoto: boolean;
  initialAvatar: Avatar;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<{ look: KopmanLook | null; avatar: Avatar }>({ look: initial, avatar: initialAvatar });
  const [look, setLook] = useState<KopmanLook>(initial ?? fallback);
  const [avatar, setAvatar] = useState<Avatar>(initialAvatar);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current: KopmanLook = { ...look, facial: look.body === "man" ? look.facial : 0 };
  const dirty =
    JSON.stringify(current) !== JSON.stringify(saved.look) || (hasPhoto && avatar !== saved.avatar);
  const set = (change: Partial<KopmanLook>) => setLook({ ...look, ...change });
  const colors = kopmanColors(tenue, current);

  function save(next: KopmanLook | null) {
    setError(null);
    startTransition(async () => {
      const res = await saveKopman(next, hasPhoto ? avatar : "kopman");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved({ look: next, avatar: next ? avatar : "foto" });
      if (!next) {
        setLook(fallback);
        setAvatar("foto");
      }
      if (res.thumbnailError) setError(res.thumbnailError);
      router.refresh();
    });
  }

  return (
    <section id="kopman" className="scroll-mt-20 rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kopman</h2>
      <div className="mt-3 grid gap-3">
        <div className="grid w-fit grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
          {hasPhoto && (
            <Row label="Avatar">
              <Choice
                label="Avatar"
                options={[
                  { value: "foto", label: "Foto" },
                  { value: "kopman", label: "Kopman" },
                ]}
                value={avatar}
                onChange={setAvatar}
              />
            </Row>
          )}
          <Row label="Figuur">
            <Choice
              label="Figuur"
              options={[
                { value: "man", label: "Man" },
                { value: "vrouw", label: "Vrouw" },
              ]}
              value={current.body}
              onChange={(body) => {
                // Een ander kapsel per soort: terug naar het eerste.
                if (body !== look.body) setLook({ ...look, body, hair: 0 });
              }}
            />
          </Row>
        </div>
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
            <Row label="Shirt">
              <Choice
                label="Shirt"
                options={KOPMAN_SHIRTS.map((label, value) => ({ value, label }))}
                value={current.shirt}
                onChange={(shirt) => set({ shirt })}
              />
            </Row>
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
        <div className="flex flex-wrap gap-2">
          {dirty && (
            <Button type="button" size="sm" disabled={pending} onClick={() => save(current)}>
              {pending ? "Bezig…" : "Kopman opslaan"}
            </Button>
          )}
          {saved.look && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => save(null)}>
              <Trash2 className="size-4" />
              Kopman weghalen
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
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
