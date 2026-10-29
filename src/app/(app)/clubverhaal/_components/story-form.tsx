"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SceneStage } from "@/app/verhaal/scene-stage";
import { defaultSpec, describeScene, type Scene } from "@/lib/clubverhaal/scenes";
import { CAPTION_MAX, EARLIEST_YEAR, PHOTOS_MAX, TITLE_MAX } from "@/lib/clubverhaal/story";
import { confirmStoryPhoto, requestStoryPhotoUpload, saveStory, submitStory } from "../_actions";
import { SceneBuilder } from "./scene-builder";

export type StoryFormInitial = {
  id: string;
  title: string;
  scenes: Scene[];
  happenedYear: number | null;
  bekerId: string | null;
  photos: Array<{ id: string; caption: string | null; url: string | null }>;
};

type PhotoItem =
  | { key: string; kind: "stored"; id: string; caption: string; url: string | null }
  | { key: string; kind: "new"; file: File; caption: string; url: string };

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

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
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("De foto kon niet worden omgezet."))), "image/jpeg", 0.82),
  );
}

/**
 * Een verhaal voor het clubverhaal op /verhaal (0288, 0289): een titel, eigen
 * hoofdstukken met elk een 3D-scène (met live voorbeeld), een jaar, een ZWBeker
 * en hooguit zes foto's met onderschrift. Met `initial` past het een bestaand
 * verhaal aan.
 */
export function StoryForm({
  bekers,
  year,
  initial,
  presetBeker,
}: {
  bekers: Array<{ id: string; title: string; day: string }>;
  year: number;
  initial?: StoryFormInitial;
  presetBeker?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Na een nieuw verhaal waarvan een foto mislukte: verder als aanpassen, geen tweede verhaal.
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [scenes, setScenes] = useState<Scene[]>(initial?.scenes ?? [{ ...defaultSpec("nu"), text: "" }]);
  const [active, setActive] = useState(0);
  const preview = scenes[Math.min(active, scenes.length - 1)];
  const [happenedYear, setHappenedYear] = useState(initial?.happenedYear ? String(initial.happenedYear) : "");
  const [bekerId, setBekerId] = useState(initial?.bekerId ?? presetBeker ?? "");
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (initial?.photos ?? []).map((photo) => ({ key: photo.id, kind: "stored", id: photo.id, caption: photo.caption ?? "", url: photo.url })),
  );

  const addPhotos = (files: FileList | null) => {
    setError(null);
    const chosen = [...(files ?? [])];
    if (chosen.some((file) => !file.type.startsWith("image/"))) return setError("Kies alleen foto's.");
    if (chosen.some((file) => file.size > MAX_INPUT_SIZE)) return setError("Een foto is te groot (hooguit 20 MB).");
    if (photos.length + chosen.length > PHOTOS_MAX) return setError(`Hooguit ${PHOTOS_MAX} foto's per verhaal.`);
    setPhotos((current) => [
      ...current,
      ...chosen.map((file, index) => ({ key: `new-${Date.now()}-${index}`, kind: "new" as const, file, caption: "", url: URL.createObjectURL(file) })),
    ]);
  };

  const move = (index: number, step: -1 | 1) =>
    setPhotos((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + step, 0, item);
      return next;
    });

  const uploadPhoto = async (storyId: string, file: File, caption: string) => {
    const target = await requestStoryPhotoUpload(storyId);
    if (!target.ok) throw new Error(target.error);
    const blob = await resizePhoto(file);
    const { error: uploadError } = await createClient()
      .storage.from("club-story-photos")
      .uploadToSignedUrl(target.data.path, target.data.token, blob, { contentType: "image/jpeg" });
    if (uploadError) throw new Error("Uploaden van een foto mislukte.");
    const attached = await confirmStoryPhoto(storyId, target.data.path, caption);
    if (!attached.ok) throw new Error(attached.error);
  };

  const submit = () => {
    setError(null);
    const stored = photos.filter((photo) => photo.kind === "stored");
    const input = {
      title,
      scenes,
      happenedYear: happenedYear ? Number(happenedYear) : null,
      bekerId: bekerId || null,
      photos: stored.map((photo) => ({ id: photo.id, caption: photo.caption })),
    };
    start(async () => {
      const saved = savedId ? await saveStory(savedId, input) : await submitStory(input);
      if (!saved.ok) return setError(saved.error);
      const storyId = saved.data.id;
      setSavedId(storyId);
      // Nieuwe foto's komen achter de bestaande; uploaden gaat een voor een.
      const fresh = photos.filter((photo) => photo.kind === "new");
      for (const photo of fresh) {
        try {
          await uploadPhoto(storyId, photo.file, photo.caption);
        } catch (failure) {
          return setError(`Het verhaal is opgeslagen, niet alle foto's: ${failure instanceof Error ? failure.message : "probeer het opnieuw"}`);
        }
        setPhotos((current) => current.filter((item) => item.key !== photo.key));
      }
      router.push("/clubverhaal");
      router.refresh();
    });
  };

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="min-w-0 space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className={sectionTitle}>Het verhaal</h2>
          <Field label="Titel" hint={`${title.trim().length}/${TITLE_MAX}`}>
            <input className={field} value={title} maxLength={TITLE_MAX} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <Field label="Jaar">
              <input
                className={field}
                type="number"
                inputMode="numeric"
                min={EARLIEST_YEAR}
                max={year}
                value={happenedYear}
                onChange={(event) => setHappenedYear(event.target.value)}
              />
            </Field>
            <Field label="ZWBeker">
              <select className={field} value={bekerId} onChange={(event) => setBekerId(event.target.value)}>
                <option value="">Geen</option>
                {bekers.map((beker) => (
                  <option key={beker.id} value={beker.id}>
                    {beker.day.slice(0, 4)} · {beker.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <SceneBuilder scenes={scenes} active={active} onChange={setScenes} onActivate={setActive} />

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitle}>Foto&apos;s</h2>
            <span className="text-xs text-muted-foreground">
              {photos.length}/{PHOTOS_MAX}
            </span>
          </div>
          {photos.length > 0 && (
            <ul className="space-y-3">
              {photos.map((photo, index) => (
                <li key={photo.key} className="grid gap-3 rounded-md border p-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center">
                  {photo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- een ondertekende of lokale url
                    <img src={photo.url} alt="" className="aspect-[4/3] w-full rounded object-cover sm:w-32" />
                  ) : (
                    <div className="aspect-[4/3] w-full rounded bg-muted sm:w-32" />
                  )}
                  <input
                    className={field}
                    value={photo.caption}
                    maxLength={CAPTION_MAX}
                    placeholder="Onderschrift"
                    aria-label={`Onderschrift foto ${index + 1}`}
                    onChange={(event) =>
                      setPhotos((current) => current.map((item) => (item.key === photo.key ? { ...item, caption: event.target.value } : item)))
                    }
                  />
                  <div className="flex gap-1">
                    <IconButton label="Eerder" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="Later" disabled={index === photos.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label="Foto weghalen" onClick={() => setPhotos((current) => current.filter((item) => item.key !== photo.key))}>
                      <X className="size-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {photos.length < PHOTOS_MAX && (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted">
              <ImagePlus className="size-4" aria-hidden />
              Foto&apos;s kiezen
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addPhotos(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </section>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {initial ? "Opslaan" : "Insturen"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
            Annuleren
          </Button>
        </div>
      </div>

      <aside className="order-first space-y-2 lg:sticky lg:top-20 lg:order-none" aria-label="Voorbeeld">
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-[#165e72] lg:aspect-[4/3]">
          <SceneStage spec={preview} frame="preview" />
        </div>
        <p className="text-xs text-muted-foreground">
          Hoofdstuk {Math.min(active, scenes.length - 1) + 1} · {describeScene(preview)}
        </p>
      </aside>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
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
