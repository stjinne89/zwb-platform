"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_LONGEST_SIDE = 1920;
const JPEG_QUALITY = 0.85;
const MAX_INPUT_SIZE = 20 * 1024 * 1024; // 20 MB per file

async function resizePhoto(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_LONGEST_SIDE / Math.max(img.width, img.height),
  );
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar.");
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("Kon afbeelding niet converteren naar JPEG.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
  return { blob, width: w, height: h };
}

export function EventPhotoUploader({ eventId }: { eventId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPending(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessie verlopen — log opnieuw in.");

      let done = 0;
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          done++;
          setProgress({ done, total: files.length });
          continue;
        }
        if (file.size > MAX_INPUT_SIZE) {
          throw new Error(`${file.name} is te groot (max 20 MB per foto).`);
        }

        const { blob, width, height } = await resizePhoto(file);
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .slice(0, 80);
        const path = `${eventId}/${user.id}/${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.jpg`;

        const { error: upErr } = await supabase.storage
          .from("event-photos")
          .upload(path, blob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });
        if (upErr) throw new Error(`Upload mislukt: ${upErr.message}`);

        const takenAt = file.lastModified
          ? new Date(file.lastModified).toISOString()
          : null;

        const { error: insErr } = await supabase.from("event_photos").insert({
          event_id: eventId,
          profile_id: user.id,
          storage_path: path,
          width,
          height,
          taken_at: takenAt,
        });
        if (insErr) {
          // Probeer storage op te ruimen om weeshuis te voorkomen
          await supabase.storage.from("event-photos").remove([path]);
          throw new Error(insErr.message);
        }

        done++;
        setProgress({ done, total: files.length });
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload faalde.");
    } finally {
      setPending(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {pending
          ? progress
            ? `Uploaden ${progress.done}/${progress.total}…`
            : "Uploaden…"
          : "Foto's toevoegen"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
