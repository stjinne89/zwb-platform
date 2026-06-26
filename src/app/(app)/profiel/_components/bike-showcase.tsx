"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Eye, EyeOff, ImageOff, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  bikeBrandModel,
  bikeName,
  bikeShownOnProfile,
  formatBikeDistance,
  hasBikeDistance,
  type StravaBikeRow,
} from "@/lib/strava/bikes";
import {
  addManualBike,
  deleteManualBike,
  updateBikeDetails,
} from "../_actions/bikes";

const MAX_DIMENSION = 1024; // px aan de langste zijde
const JPEG_QUALITY = 0.85;
const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

async function resizeToJpegBlob(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar in deze browser.");
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Kon afbeelding niet converteren.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function parseBikeStoragePath(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/bikes\/(.+?)(?:\?|$)/);
  return m ? m[1] : null;
}

export function BikeShowcase({ bikes }: { bikes: StravaBikeRow[] }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Mijn fietsen
      </h2>
      {bikes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Voeg hieronder handmatig een fiets toe, of koppel Strava zodat je
          fietsen automatisch verschijnen.
        </p>
      ) : (
        <ul className="space-y-3">
          {bikes.map((b) => (
            <BikeRow key={b.id} bike={b} />
          ))}
        </ul>
      )}
      <AddManualBikeForm />
    </section>
  );
}

function BikeRow({ bike }: { bike: StravaBikeRow }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"upload" | "toggle" | "remove" | null>(
    null,
  );
  const [actionPending, startAction] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = bikeShownOnProfile(bike);
  const isManual = bike.source === "manual";
  const brandModel = bikeBrandModel(bike);
  const busy = pending !== null || actionPending;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setPending("upload");
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Kies een afbeeldingsbestand.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Bestand is te groot (max 10 MB).");
      }

      const blob = await resizeToJpegBlob(file);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessie verlopen — log opnieuw in.");

      const path = `${user.id}/${bike.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("bikes")
        .upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) throw new Error(`Upload mislukt: ${upErr.message}`);

      const {
        data: { publicUrl },
      } = supabase.storage.from("bikes").getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("strava_bikes")
        .update({ image_url: publicUrl })
        .eq("id", bike.id);
      if (updErr) throw new Error(updErr.message);

      const oldPath = parseBikeStoragePath(bike.image_url);
      if (oldPath) await supabase.storage.from("bikes").remove([oldPath]);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload faalde.");
    } finally {
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeImage() {
    setError(null);
    setPending("remove");
    try {
      const supabase = createClient();
      const oldPath = parseBikeStoragePath(bike.image_url);
      if (oldPath) await supabase.storage.from("bikes").remove([oldPath]);
      const { error: updErr } = await supabase
        .from("strava_bikes")
        .update({ image_url: null })
        .eq("id", bike.id);
      if (updErr) throw new Error(updErr.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen faalde.");
    } finally {
      setPending(null);
    }
  }

  async function toggleShown() {
    setError(null);
    setPending("toggle");
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from("strava_bikes")
        .update({ show_on_profile: !shown })
        .eq("id", bike.id);
      if (updErr) throw new Error(updErr.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan faalde.");
    } finally {
      setPending(null);
    }
  }

  function saveEdit(formData: FormData) {
    setError(null);
    startAction(async () => {
      const res = await updateBikeDetails(formData);
      if (!res.ok) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm("Deze fiets verwijderen?")) return;
    setError(null);
    startAction(async () => {
      const res = await deleteManualBike(bike.id);
      if (!res.ok) setError(res.error);
    });
  }

  if (editing) {
    return (
      <li className="rounded-lg border bg-background p-3">
        <form action={saveEdit} className="space-y-3">
          <input type="hidden" name="bike_id" value={bike.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            {isManual && (
              <div className="sm:col-span-1">
                <label className={LABEL}>Naam</label>
                <input
                  name="name"
                  required
                  defaultValue={bike.name ?? ""}
                  className={FIELD}
                />
              </div>
            )}
            <div>
              <label className={LABEL}>Merk/model</label>
              <input
                name="brand_model"
                defaultValue={bike.brand_model ?? ""}
                className={FIELD}
              />
            </div>
            {isManual && (
              <div>
                <label className={LABEL}>Afstand (km)</label>
                <input
                  name="distance_km"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={
                    hasBikeDistance(bike.distance_m)
                      ? Math.round(Number(bike.distance_m) / 1000)
                      : ""
                  }
                  className={FIELD}
                />
              </div>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={actionPending}>
              {actionPending ? "Opslaan…" : "Opslaan"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={actionPending}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Annuleren
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {bike.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bike.image_url}
            alt={bikeName(bike)}
            className="size-full object-cover"
          />
        ) : (
          <Bike className="size-6 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {bikeName(bike)}
          {bike.retired && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (gearchiveerd)
            </span>
          )}
        </p>
        {brandModel && (
          <p className="text-sm text-muted-foreground">{brandModel}</p>
        )}
        {hasBikeDistance(bike.distance_m) && (
          <p className="text-sm text-muted-foreground">
            {formatBikeDistance(bike.distance_m)}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          {pending === "upload" ? "Uploaden…" : bike.image_url ? "Vervang" : "Foto"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        {bike.image_url && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={removeImage}
            aria-label="Foto verwijderen"
          >
            <ImageOff className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={shown ? "outline" : "ghost"}
          disabled={busy}
          onClick={toggleShown}
        >
          {shown ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {shown ? "Zichtbaar" : "Verborgen"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => setEditing(true)}
          aria-label="Fiets bewerken"
        >
          <Pencil className="size-4" />
        </Button>
        {isManual && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={remove}
            aria-label="Fiets verwijderen"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

function AddManualBikeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addManualBike(formData);
      if (!res.ok) setError(res.error);
      else {
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Fiets handmatig toevoegen
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-3 rounded-lg border border-dashed bg-background p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className={LABEL}>Naam</label>
          <input name="name" required placeholder="Bv. Racefiets" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Merk/model (optioneel)</label>
          <input name="brand_model" placeholder="Bv. Trek Émonda" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Afstand (km, optioneel)</label>
          <input
            name="distance_km"
            type="number"
            min={0}
            inputMode="numeric"
            className={FIELD}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Toevoegen…" : "Toevoegen"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
