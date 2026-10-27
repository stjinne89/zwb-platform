"use client";

// Het racebriefje aanpassen: per blok regels wijzigen, weghalen, toevoegen of
// markeren, en terug naar het voorstel van de app. Alleen wat afwijkt van het
// voorstel wordt bewaard (lib/race-briefing/sheet.ts), zodat een blok dat je niet
// aanraakt met de data meegroeit.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { diffOverride, sanitizeOverride, type SheetContent, type SheetSection, type SketchMark } from "@/lib/race-briefing/sheet";
import { saveRaceSheet } from "../_actions";

const FIELD =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

// Tijdens het typen zijn kilometers tekst ("21,5"); bij opslaan worden het getallen.
type Draft = {
  sketch: Array<{ fromKm: string; toKm: string; text: string; style: SketchMark["style"] }>;
  moments: Array<{ km: string; what: string; todo: string; key: boolean }>;
  rules: Array<{ value: string; text: string; key: boolean }>;
  watch: Array<{ name: string; note: string }>;
  notes: string[];
};

const kmText = (value: number) => String(value).replace(".", ",");

function toDraft(content: SheetContent): Draft {
  return {
    sketch: content.sketch.map((m) => ({ fromKm: kmText(m.fromKm), toKm: kmText(m.toKm), text: m.text, style: m.style })),
    moments: content.moments.map((m) => ({ km: kmText(m.km), what: m.what, todo: m.todo, key: Boolean(m.key) })),
    rules: content.rules.map((r) => ({ value: r.value, text: r.text, key: Boolean(r.key) })),
    watch: content.watch.map((w) => ({ ...w })),
    notes: [...content.notes],
  };
}

/** Het concept als volledige inhoud, door dezelfde opschoning als de server. */
function fromDraft(draft: Draft): SheetContent {
  const clean = sanitizeOverride(draft);
  return { sketch: clean.sketch ?? [], moments: clean.moments ?? [], rules: clean.rules ?? [], watch: clean.watch ?? [], notes: clean.notes ?? [] };
}

const SECTION_TITLES: Record<SheetSection, string> = {
  sketch: "Profiel",
  moments: "Momenten",
  rules: "Onthouden",
  watch: "Volgen",
  notes: "Let op",
};

const STYLE_LABELS: Record<SketchMark["style"], string> = {
  markeer: "markeerstift",
  cirkel: "omcirkeld",
  label: "label",
  boog: "boog",
  sprint: "sprint",
  ronde: "ronde",
};

const EMPTY: { [K in SheetSection]: Draft[K][number] } = {
  sketch: { fromKm: "", toKm: "", text: "", style: "label" },
  moments: { km: "", what: "", todo: "", key: false },
  rules: { value: "", text: "", key: false },
  watch: { name: "", note: "" },
  notes: "",
};

function RemoveButton({ onClick, label, push }: { onClick: () => void; label: string; push?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon" className={cn("size-11 shrink-0", push && "ml-auto sm:ml-0")} onClick={onClick} aria-label={label}>
      <X className="size-4" />
    </Button>
  );
}

function Check({ checked, onChange, label, push }: { checked: boolean; onChange: (value: boolean) => void; label: string; push?: boolean }) {
  return (
    <label className={cn("flex min-h-11 shrink-0 items-center gap-1.5 text-sm", push && "ml-auto sm:ml-0")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" />
      {label}
    </label>
  );
}

export function SheetEditor({ eventId, defaults, current }: { eventId: string; defaults: SheetContent; current: SheetContent }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const typed = fromDraft(draft);
  const differs = (section: SheetSection) => JSON.stringify(typed[section]) !== JSON.stringify(defaults[section]);

  function update<K extends SheetSection>(section: K, rows: Draft[K]) {
    setDraft((d) => ({ ...d, [section]: rows }));
    setStatus("idle");
  }
  function patch<K extends Exclude<SheetSection, "notes">>(section: K, index: number, change: Partial<Draft[K][number]>) {
    update(section, draft[section].map((row, i) => (i === index ? { ...row, ...change } : row)) as Draft[K]);
  }
  function remove<K extends SheetSection>(section: K, index: number) {
    update(section, draft[section].filter((_, i) => i !== index) as Draft[K]);
  }
  function add<K extends SheetSection>(section: K) {
    update(section, [...draft[section], EMPTY[section]] as Draft[K]);
  }
  function reset<K extends SheetSection>(section: K) {
    update(section, toDraft(defaults)[section]);
  }

  function save() {
    startTransition(async () => {
      const result = await saveRaceSheet(eventId, diffOverride(typed, defaults));
      setStatus(result.ok ? "saved" : "error");
      if (result.ok) router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        Briefje bewerken
      </Button>
    );
  }

  const block = (section: SheetSection, children: React.ReactNode) => (
    <fieldset className="space-y-2">
      <legend className="flex w-full flex-wrap items-center justify-between gap-2 text-base font-medium">
        {SECTION_TITLES[section]}
        {differs(section) && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => reset(section)}>
            Voorstel terugzetten
          </Button>
        )}
      </legend>
      {children}
      <Button type="button" variant="outline" className="min-h-11" onClick={() => add(section)}>
        <Plus className="size-3.5" />
        Regel toevoegen
      </Button>
    </fieldset>
  );

  // Op de telefoon: korte velden, vinkje en kruisje bovenaan, tekstvelden eronder.
  const row = "flex flex-wrap items-center gap-2 border-b border-border/60 pb-2 sm:flex-nowrap sm:border-0 sm:pb-0";
  const below = "order-last basis-full sm:order-none sm:basis-auto";

  return (
    <section className="space-y-5 rounded-lg border bg-card p-3" aria-label="Briefje bewerken">
      {block(
        "moments",
        draft.moments.map((m, i) => (
          <div key={i} className={row}>
            <input aria-label="Km" inputMode="decimal" value={m.km} onChange={(e) => patch("moments", i, { km: e.target.value })} className={cn(FIELD, "w-20 shrink-0")} />
            <input aria-label="Wat" value={m.what} onChange={(e) => patch("moments", i, { what: e.target.value })} className={cn(FIELD, below)} />
            <input aria-label="Doen" value={m.todo} onChange={(e) => patch("moments", i, { todo: e.target.value })} className={cn(FIELD, below)} />
            <Check checked={m.key} onChange={(key) => patch("moments", i, { key })} label="markeer" push />
            <RemoveButton onClick={() => remove("moments", i)} label="Regel weghalen" />
          </div>
        )),
      )}
      {block(
        "sketch",
        draft.sketch.map((m, i) => (
          <div key={i} className={row}>
            <input aria-label="Van km" inputMode="decimal" value={m.fromKm} onChange={(e) => patch("sketch", i, { fromKm: e.target.value })} className={cn(FIELD, "w-20 shrink-0")} />
            <input aria-label="Tot km" inputMode="decimal" value={m.toKm} onChange={(e) => patch("sketch", i, { toKm: e.target.value })} className={cn(FIELD, "w-20 shrink-0")} />
            <input aria-label="Tekst" value={m.text} onChange={(e) => patch("sketch", i, { text: e.target.value })} className={cn(FIELD, below)} />
            <select aria-label="Stijl" value={m.style} onChange={(e) => patch("sketch", i, { style: e.target.value as SketchMark["style"] })} className={cn(FIELD, below, "sm:w-36 sm:shrink-0")}>
              {(Object.keys(STYLE_LABELS) as SketchMark["style"][]).map((style) => (
                <option key={style} value={style}>
                  {STYLE_LABELS[style]}
                </option>
              ))}
            </select>
            <RemoveButton onClick={() => remove("sketch", i)} label="Regel weghalen" push />
          </div>
        )),
      )}
      {block(
        "rules",
        draft.rules.map((r, i) => (
          <div key={i} className={row}>
            <input aria-label="Kort" value={r.value} onChange={(e) => patch("rules", i, { value: e.target.value })} className={cn(FIELD, "flex-1 sm:w-48 sm:flex-none")} />
            <input aria-label="Betekenis" value={r.text} onChange={(e) => patch("rules", i, { text: e.target.value })} className={cn(FIELD, below)} />
            <Check checked={r.key} onChange={(key) => patch("rules", i, { key })} label="omcirkel" push />
            <RemoveButton onClick={() => remove("rules", i)} label="Regel weghalen" />
          </div>
        )),
      )}
      {block(
        "watch",
        draft.watch.map((w, i) => (
          <div key={i} className={row}>
            <input aria-label="Naam" value={w.name} onChange={(e) => patch("watch", i, { name: e.target.value })} className={cn(FIELD, "flex-1 sm:w-56 sm:flex-none")} />
            <input aria-label="Notitie" value={w.note} onChange={(e) => patch("watch", i, { note: e.target.value })} className={cn(FIELD, below)} />
            <RemoveButton onClick={() => remove("watch", i)} label="Regel weghalen" />
          </div>
        )),
      )}
      {block(
        "notes",
        draft.notes.map((note, i) => (
          <div key={i} className={row}>
            <input aria-label="Let op" value={note} onChange={(e) => update("notes", draft.notes.map((n, j) => (j === i ? e.target.value : n)))} className={FIELD} />
            <RemoveButton onClick={() => remove("notes", i)} label="Regel weghalen" />
          </div>
        )),
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="min-h-11" onClick={save} disabled={pending}>
          Briefje opslaan
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)}>
          Sluiten
        </Button>
        {status === "saved" && <p className="text-sm text-muted-foreground">Opgeslagen.</p>}
        {status === "error" && <p className="text-sm text-destructive">Opslaan lukte niet. Probeer het opnieuw.</p>}
      </div>
    </section>
  );
}
