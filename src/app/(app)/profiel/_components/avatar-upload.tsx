"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 512; // px aan de langste zijde
const JPEG_QUALITY = 0.85;

/**
 * Client-side resize naar JPEG zodat we niet 5MB foto's naar Supabase
 * Storage uploaden. Werkt via createImageBitmap → canvas → blob.
 */
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
      (blob) => (blob ? resolve(blob) : reject(new Error("Kon afbeelding niet converteren."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function parseAvatarStoragePath(url: string | null): string | null {
  if (!url) return null;
  // Match Supabase Storage publieke URL pattern:
  // .../storage/v1/object/public/avatars/<userId>/<filename>
  const m = url.match(/\/storage\/v1\/object\/public\/avatars\/(.+?)(?:\?|$)/);
  return m ? m[1] : null;
}

export function AvatarUpload({
  currentAvatarUrl,
}: {
  currentAvatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasOwnUpload = Boolean(parseAvatarStoragePath(currentAvatarUrl));

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
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

      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) throw new Error(`Upload mislukt: ${upErr.message}`);

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw new Error(updErr.message);

      // Best-effort: verwijder oude eigen-upload uit storage
      const oldPath = parseAvatarStoragePath(currentAvatarUrl);
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      setMessage("Foto bijgewerkt.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload faalde.");
    } finally {
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm("Eigen foto verwijderen? Je krijgt weer de Strava-foto of initials.")) return;
    setError(null);
    setMessage(null);
    setPending("delete");

    try {
      const supabase = createClient();
      const oldPath = parseAvatarStoragePath(currentAvatarUrl);
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessie verlopen.");

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (updErr) throw new Error(updErr.message);

      setMessage("Eigen foto verwijderd. Klik 'Vernieuw foto' onder Strava-koppeling om de Strava-foto terug te halen.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen faalde.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Profielfoto
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload je eigen foto, of laat de foto vanuit Strava staan. Eigen
        upload heeft voorrang op de Strava-foto en wordt automatisch
        verkleind naar 512px.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          {pending === "upload" ? "Uploaden…" : hasOwnUpload ? "Vervang foto" : "Upload foto"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        {hasOwnUpload && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending !== null}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            {pending === "delete" ? "Verwijderen…" : "Verwijder eigen foto"}
          </Button>
        )}
      </div>

      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
