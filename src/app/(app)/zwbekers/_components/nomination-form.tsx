"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TrophyPreview } from "@/components/zwbekers/trophy-preview";
import {
  DEFAULT_DESIGN,
  GRAVURE_MAX,
  LABELS,
  LINT_COLOR,
  LINTEN,
  METALEN,
  METAL_COLOR,
  OREN,
  SILHOUETTEN,
  SOKKELS,
  SOKKEL_COLOR,
  VOETEN,
  VORMEN,
  gravureFromTitle,
  relevant,
  type BekerDesign,
} from "@/lib/zwbekers/design";
import { STORY_MAX, TITLE_MAX, type BekerKind } from "@/lib/zwbekers/nomination";
import { confirmPhoto, deletePhoto, requestPhotoUpload, saveNomination, submitNomination } from "../_actions";

export type FormOptions = {
  members: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; members: string[] }>;
  events: Array<{ id: string; title: string; day: string }>;
  zrlRounds: Array<{ key: string; label: string; lastDay: string }>;
};

export type FormInitial = {
  id: string;
  kind: BekerKind;
  title: string;
  story: string;
  achievedOn: string;
  winners: string[];
  teamId: string | null;
  eventId: string | null;
  zrlRound: string | null;
  resultUrl: string | null;
  design: BekerDesign;
  photoUrl: string | null;
};

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

/** In de keuzelijst "Erbij" staat een ZRL-ronde als "zrl:2026/27 R1", een event als zijn id. */
const ROUND_PREFIX = "zrl:";

const MAX_LONGEST_SIDE = 1920;
const MAX_INPUT_SIZE = 20 * 1024 * 1024;

/** Verkleint een foto tot hooguit 1920 px aan de lange kant, als JPEG. */
async function resizePhoto(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LONGEST_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Deze browser kan de foto niet verkleinen.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("De foto kon niet worden omgezet."))), "image/jpeg", 0.85),
  );
}

/**
 * Een voordracht voor een ZWBeker, met de beker die het lid erbij ontwerpt (wens
 * eigenaar, 2026-10-28). Het voorbeeld verandert bij elke keuze mee. Nieuw of
 * aanpassen: met `initial` past het een bestaande voordracht aan.
 */
export function NominationForm({ options, today, initial }: { options: FormOptions; today: string; initial?: FormInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Na een nieuwe voordracht waarvan de foto mislukte: verder als aanpassen, geen tweede voordracht.
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);

  const [kind, setKind] = useState<BekerKind>(initial?.kind ?? "individueel");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [story, setStory] = useState(initial?.story ?? "");
  const [achievedOn, setAchievedOn] = useState(initial?.achievedOn ?? today);
  const [winner, setWinner] = useState(initial?.kind === "individueel" ? (initial.winners[0] ?? "") : "");
  const [teamId, setTeamId] = useState(initial?.teamId ?? "");
  const [riders, setRiders] = useState<string[]>(initial?.kind === "team" ? initial.winners : []);
  const [linked, setLinked] = useState(
    initial?.zrlRound ? `${ROUND_PREFIX}${initial.zrlRound}` : (initial?.eventId ?? ""),
  );
  const [resultUrl, setResultUrl] = useState(initial?.resultUrl ?? "");
  const [design, setDesign] = useState<BekerDesign>(initial?.design ?? DEFAULT_DESIGN);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photoUrl ?? null);
  const [dropPhoto, setDropPhoto] = useState(false);

  const names = useMemo(() => new Map(options.members.map((member) => [member.id, member.name])), [options.members]);
  const team = options.teams.find((item) => item.id === teamId) ?? null;
  // Eerst wie in het team zit, dan wie er al bij staat zonder in het team te zitten.
  const riderChoices = useMemo(() => {
    const ids = new Set([...(team?.members ?? []), ...riders]);
    return [...ids].filter((id) => names.has(id)).sort((a, b) => names.get(a)!.localeCompare(names.get(b)!, "nl"));
  }, [team, riders, names]);
  const others = options.members.filter((member) => !riderChoices.includes(member.id));
  const show = relevant(design.vorm);

  const set = <K extends keyof BekerDesign>(key: K, value: BekerDesign[K]) => setDesign((current) => ({ ...current, [key]: value }));

  // De gravure volgt de titel, tot het lid hem zelf verandert.
  const changeTitle = (next: string) => {
    setDesign((current) =>
      current.gravure === gravureFromTitle(title) ? { ...current, gravure: gravureFromTitle(next) } : current,
    );
    setTitle(next);
  };

  const chooseLinked = (value: string) => {
    setLinked(value);
    // Een ronde is geleverd op de dag van de laatste race.
    const round = options.zrlRounds.find((item) => `${ROUND_PREFIX}${item.key}` === value);
    if (round) setAchievedOn(round.lastDay);
  };

  const chooseTeam = (id: string) => {
    setTeamId(id);
    // Een nieuw team: standaard reed iedereen uit dat team mee, uitvinken kan.
    const chosen = options.teams.find((item) => item.id === id);
    setRiders(chosen ? chosen.members.filter((member) => names.has(member)) : []);
  };

  const choosePhoto = (file: File | null) => {
    setError(null);
    if (file && !file.type.startsWith("image/")) return setError("Kies een foto.");
    if (file && file.size > MAX_INPUT_SIZE) return setError("Die foto is te groot (hooguit 20 MB).");
    setPhoto(file);
    setDropPhoto(false);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadPhoto = async (bekerId: string, file: File) => {
    const target = await requestPhotoUpload(bekerId);
    if (!target.ok) throw new Error(target.error);
    const blob = await resizePhoto(file);
    const { error: uploadError } = await createClient()
      .storage.from("zwbeker-photos")
      .uploadToSignedUrl(target.data.path, target.data.token, blob, { contentType: "image/jpeg" });
    if (uploadError) throw new Error("Uploaden van de foto mislukte.");
    const attached = await confirmPhoto(bekerId, target.data.path);
    if (!attached.ok) throw new Error(attached.error);
  };

  const submit = () => {
    setError(null);
    const input = {
      kind,
      title,
      story,
      achievedOn,
      winners: kind === "individueel" ? (winner ? [winner] : []) : riders,
      teamId: kind === "team" ? teamId || null : null,
      eventId: linked && !linked.startsWith(ROUND_PREFIX) ? linked : null,
      zrlRound: linked.startsWith(ROUND_PREFIX) ? linked.slice(ROUND_PREFIX.length) : null,
      resultUrl,
      design,
    };
    start(async () => {
      const saved = savedId ? await saveNomination(savedId, input) : await submitNomination(input);
      if (!saved.ok) return setError(saved.error);
      const bekerId = saved.data.id;
      setSavedId(bekerId);
      try {
        if (photo) await uploadPhoto(bekerId, photo);
        else if (dropPhoto && initial?.photoUrl) {
          const removed = await deletePhoto(bekerId);
          if (!removed.ok) throw new Error(removed.error);
        }
      } catch (failure) {
        return setError(
          `De voordracht is opgeslagen, de foto niet: ${failure instanceof Error ? failure.message : "probeer het opnieuw"}`,
        );
      }
      router.push(`/zwbekers/${bekerId}`);
      router.refresh();
    });
  };

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className={sectionTitle}>De prestatie</h2>
          <Segmented
            label="Soort"
            value={kind}
            options={[
              ["individueel", "Individueel"],
              ["team", "Team"],
            ]}
            onChange={(value) => setKind(value as BekerKind)}
          />
          <Field label="Titel" hint={`${title.trim().length}/${TITLE_MAX}`}>
            <input className={field} value={title} maxLength={TITLE_MAX} onChange={(event) => changeTitle(event.target.value)} required />
          </Field>
          <Field label="Datum">
            <input className={field} type="date" max={today} min="2000-01-01" value={achievedOn} onChange={(event) => setAchievedOn(event.target.value)} required />
          </Field>
          <Field label="Waarom" hint={`${story.trim().length}/${STORY_MAX}`}>
            <textarea className={cn(field, "min-h-32")} value={story} maxLength={STORY_MAX} onChange={(event) => setStory(event.target.value)} required />
          </Field>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className={sectionTitle}>{kind === "team" ? "Het team" : "De winnaar"}</h2>
          {kind === "individueel" ? (
            <Field label="Winnaar">
              <select className={field} value={winner} onChange={(event) => setWinner(event.target.value)} required>
                <option value="">Kies een lid</option>
                {options.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Team">
                <select className={field} value={teamId} onChange={(event) => chooseTeam(event.target.value)} required>
                  <option value="">Kies een team</option>
                  {options.teams.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              {teamId && (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm font-medium">Reden mee</legend>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {riderChoices.map((id) => (
                      <li key={id}>
                        <label className="flex min-h-9 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={riders.includes(id)}
                            onChange={(event) =>
                              setRiders((current) => (event.target.checked ? [...current, id] : current.filter((rider) => rider !== id)))
                            }
                          />
                          {names.get(id)}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <select
                    className={cn(field, "mt-1")}
                    value=""
                    aria-label="Renner toevoegen"
                    onChange={(event) => event.target.value && setRiders((current) => [...current, event.target.value])}
                  >
                    <option value="">Renner toevoegen…</option>
                    {others.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </fieldset>
              )}
            </>
          )}
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className={sectionTitle}>Erbij</h2>
          <Field label="Event of ZRL-ronde">
            <select className={field} value={linked} onChange={(event) => chooseLinked(event.target.value)}>
              <option value="">Geen</option>
              {options.zrlRounds.length > 0 && (
                <optgroup label="ZRL-rondes">
                  {options.zrlRounds.map((round) => (
                    <option key={round.key} value={`${ROUND_PREFIX}${round.key}`}>
                      {round.label}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Events">
                {options.events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.day.split("-").reverse().join("-")} · {item.title}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label="Link naar de uitslag">
            <input
              className={field}
              type="url"
              inputMode="url"
              placeholder="https://"
              value={resultUrl}
              onChange={(event) => setResultUrl(event.target.value)}
            />
          </Field>
          <div className="space-y-2">
            <span className="text-sm font-medium">Foto</span>
            {photoPreview && !dropPhoto ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- een ondertekende of lokale url */}
                <img src={photoPreview} alt="" className="max-h-48 rounded-md border object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-background/90 shadow"
                  aria-label="Foto weghalen"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                    setDropPhoto(true);
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted">
                <ImagePlus className="size-4" aria-hidden />
                Foto kiezen
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20">
        <TrophyPreview design={design} />
        <section className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className={sectionTitle}>Ontwerp</h2>
          <Choices label="Vorm" options={VORMEN} labels={LABELS.vorm} value={design.vorm} onChange={(value) => set("vorm", value)} />
          <Choices
            label="Metaal"
            options={METALEN}
            labels={LABELS.metaal}
            value={design.metaal}
            onChange={(value) => set("metaal", value)}
            swatch={(value) => METAL_COLOR[value].hex}
          />
          {show.silhouet && (
            <Choices label="Silhouet" options={SILHOUETTEN} labels={LABELS.silhouet} value={design.silhouet} onChange={(value) => set("silhouet", value)} />
          )}
          {show.oren && <Choices label="Oren" options={OREN} labels={LABELS.oren} value={design.oren} onChange={(value) => set("oren", value)} />}
          {show.voet && <Choices label="Voet" options={VOETEN} labels={LABELS.voet} value={design.voet} onChange={(value) => set("voet", value)} />}
          {show.lint && (
            <Choices
              label="Lint"
              options={LINTEN}
              labels={LABELS.lint}
              value={design.lint}
              onChange={(value) => set("lint", value)}
              swatch={(value) => LINT_COLOR[value]}
            />
          )}
          <Choices
            label="Sokkel"
            options={SOKKELS}
            labels={LABELS.sokkel}
            value={design.sokkel}
            onChange={(value) => set("sokkel", value)}
            swatch={(value) => SOKKEL_COLOR[value]}
          />
          {show.gravure && (
            <Field label="Gravure" hint={`${design.gravure.length}/${GRAVURE_MAX}`}>
              <input
                className={field}
                value={design.gravure}
                maxLength={GRAVURE_MAX}
                onChange={(event) => set("gravure", event.target.value)}
              />
            </Field>
          )}
          {show.regioPeriode && (
            <>
              <Field label="Regio" hint={`${design.regio.length}/${GRAVURE_MAX}`}>
                <input
                  className={field}
                  value={design.regio}
                  maxLength={GRAVURE_MAX}
                  list="zwbeker-regio"
                  onChange={(event) => set("regio", event.target.value)}
                />
                <datalist id="zwbeker-regio">
                  <option value="Wereld" />
                </datalist>
              </Field>
              <Field label="Periode" hint={`${design.periode.length}/${GRAVURE_MAX}`}>
                <input
                  className={field}
                  value={design.periode}
                  maxLength={GRAVURE_MAX}
                  onChange={(event) => set("periode", event.target.value)}
                />
              </Field>
            </>
          )}
        </section>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
            Annuleren
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {savedId ? "Opslaan" : "Voordragen"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal tabular-nums text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex rounded-md border p-0.5">
        {options.map(([key, text]) => (
          <label
            key={key}
            className={cn(
              "flex min-h-9 cursor-pointer items-center rounded px-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input type="radio" className="sr-only" name={label} value={key} checked={value === key} onChange={() => onChange(key)} />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Choices<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  swatch,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  swatch?: (value: T) => string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === option ? "border-primary bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input type="radio" className="sr-only" name={`ontwerp-${label}`} value={option} checked={value === option} onChange={() => onChange(option)} />
            {swatch && <span aria-hidden className="size-3.5 rounded-full border border-black/15" style={{ background: swatch(option) }} />}
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
