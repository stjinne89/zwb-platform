"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MAX_LONGEST_SIDE = 1920;
const MAX_INPUT_SIZE = 20 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

async function resizePhoto(file: File) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LONGEST_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas niet beschikbaar.");
  context.drawImage(image, 0, 0, width, height);
  image.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Kon de afbeelding niet converteren.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
  return { blob, width, height };
}

export function BirthdayPhotoUploader({
  birthdayProfileId,
  celebrationYear,
}: {
  birthdayProfileId: string;
  celebrationYear: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessie verlopen. Log opnieuw in.");

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_INPUT_SIZE) {
          throw new Error(`${file.name} is te groot (maximaal 20 MB).`);
        }

        const { blob, width, height } = await resizePhoto(file);
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/\.[^.]+$/, "")
          .slice(0, 80);
        const storagePath =
          `${birthdayProfileId}/${celebrationYear}/${user.id}/` +
          `${Date.now()}-${safeName || "verjaardag"}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("birthday-photos")
          .upload(storagePath, blob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw new Error(`Upload mislukt: ${uploadError.message}`);

        const { error: insertError } = await supabase.from("birthday_photos").insert({
          birthday_profile_id: birthdayProfileId,
          uploader_profile_id: user.id,
          celebration_year: celebrationYear,
          storage_path: storagePath,
          width,
          height,
        });
        if (insertError) {
          await supabase.storage.from("birthday-photos").remove([storagePath]);
          throw new Error(insertError.message);
        }
      }

      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload mislukt.",
      );
    } finally {
      setPending(false);
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
        {pending ? "Uploaden..." : "Foto sturen"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={upload}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
