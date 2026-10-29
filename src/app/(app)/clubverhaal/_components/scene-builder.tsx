"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Bike, Cloud, Frown, Mountain, PartyPopper, Plus, Sun, Sunset, TrendingDown, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAPTERS } from "@/lib/clubverhaal/chapters";
import {
  LIGHTS,
  LIGHT_LABEL,
  POSES,
  POSE_LABEL,
  RIDERS_MAX,
  SCENES_MAX,
  SCENE_TEXT_MAX,
  type Light,
  type Pose,
  type Scene,
} from "@/lib/clubverhaal/scenes";

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const POSE_ICON: Record<Pose, typeof Bike> = {
  rijden: Bike,
  juichen: PartyPopper,
  sprinten: Zap,
  afzien: Frown,
  klimmen: Mountain,
  afdalen: TrendingDown,
};
const LIGHT_ICON: Record<Light, typeof Sun> = { zon: Sun, avond: Sunset, grijs: Cloud };

/**
 * De hoofdstukken van een eigen verhaal: per hoofdstuk de tekst en de keuzes
 * voor de 3D-scène. Het hoofdstuk waar het lid mee bezig is, staat in het
 * voorbeeld (`active`).
 */
export function SceneBuilder({
  scenes,
  active,
  onChange,
  onActivate,
}: {
  scenes: Scene[];
  active: number;
  onChange: (scenes: Scene[]) => void;
  onActivate: (index: number) => void;
}) {
  const update = (index: number, patch: Partial<Scene>) => {
    onChange(scenes.map((scene, at) => (at === index ? { ...scene, ...patch } : scene)));
    onActivate(index);
  };
  const move = (index: number, step: -1 | 1) => {
    const next = [...scenes];
    const [item] = next.splice(index, 1);
    next.splice(index + step, 0, item);
    onChange(next);
    onActivate(index + step);
  };
  const remove = (index: number) => {
    onChange(scenes.filter((_, at) => at !== index));
    onActivate(Math.max(0, Math.min(active, scenes.length - 2)));
  };
  const add = () => {
    // Een nieuw hoofdstuk begint met de keuzes van het vorige.
    const last = scenes[scenes.length - 1];
    onChange([...scenes, { ...last, text: "" }]);
    onActivate(scenes.length);
  };

  return (
    <div className="space-y-4">
      {scenes.map((scene, index) => (
        <section
          key={index}
          aria-label={`Hoofdstuk ${index + 1}`}
          onFocusCapture={() => onActivate(index)}
          onPointerDown={() => onActivate(index)}
          className={cn("space-y-4 rounded-lg border bg-card p-4 transition-colors", active === index && "border-primary ring-1 ring-primary")}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hoofdstuk {index + 1}</h2>
            <div className="flex gap-1">
              <IconButton label="Eerder" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton label="Later" disabled={index === scenes.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton label="Hoofdstuk weghalen" disabled={scenes.length === 1} onClick={() => remove(index)}>
                <X className="size-4" />
              </IconButton>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
              Tekst
              <span className="text-xs font-normal text-muted-foreground">
                {scene.text.trim().length}/{SCENE_TEXT_MAX}
              </span>
            </span>
            <textarea
              className={cn(field, "min-h-32")}
              value={scene.text}
              maxLength={SCENE_TEXT_MAX}
              onChange={(event) => update(index, { text: event.target.value })}
              required
            />
          </label>

          <Choice label="Shirt">
            {CHAPTERS.map((chapter) => (
              <Option key={chapter.id} selected={scene.kit === chapter.id} onClick={() => update(index, { kit: chapter.id })}>
                <span className="size-3.5 shrink-0 rounded-full border border-foreground/20" style={{ background: chapter.kit.swatch }} />
                <span className="text-left leading-tight">
                  {chapter.kit.name}
                  <span className="block text-[11px] font-normal text-muted-foreground">{chapter.era}</span>
                </span>
              </Option>
            ))}
          </Choice>

          <Choice label="Poppetje">
            {POSES.map((pose) => {
              const Icon = POSE_ICON[pose];
              return (
                <Option key={pose} selected={scene.pose === pose} onClick={() => update(index, { pose })}>
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {POSE_LABEL[pose]}
                </Option>
              );
            })}
          </Choice>

          <div className="grid gap-4 sm:grid-cols-2">
            <Choice label="Renners" compact>
              {Array.from({ length: RIDERS_MAX }, (_, i) => i + 1).map((riders) => (
                <Option key={riders} selected={scene.riders === riders} onClick={() => update(index, { riders })} square>
                  {riders}
                </Option>
              ))}
            </Choice>
            <Choice label="Moment" compact>
              {LIGHTS.map((light) => {
                const Icon = LIGHT_ICON[light];
                return (
                  <Option key={light} selected={scene.light === light} onClick={() => update(index, { light })}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {LIGHT_LABEL[light]}
                  </Option>
                );
              })}
            </Choice>
          </div>
        </section>
      ))}
      {scenes.length < SCENES_MAX && (
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm font-medium hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Hoofdstuk toevoegen
        </button>
      )}
    </div>
  );
}

function Choice({ label, compact, children }: { label: string; compact?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={label}>
      <span className="text-sm font-medium">{label}</span>
      <div className={cn("flex flex-wrap gap-1.5", !compact && "sm:grid sm:grid-cols-3")}>{children}</div>
    </div>
  );
}

function Option({ selected, onClick, square, children }: { selected: boolean; onClick: () => void; square?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
        square && "w-10 justify-center px-0",
        selected && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-md border hover:bg-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}
