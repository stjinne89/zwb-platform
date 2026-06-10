"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteBirthdayPhoto } from "../_actions";

export type BirthdayPhoto = {
  id: string;
  url: string;
  uploaderProfileId: string;
  uploaderName: string;
  createdAt: string;
};

export function BirthdayPhotoGallery({
  birthdayProfileId,
  celebrationYear,
  currentUserId,
  isAdmin,
  photos,
}: {
  birthdayProfileId: string;
  celebrationYear: number;
  currentUserId: string;
  isAdmin: boolean;
  photos: BirthdayPhoto[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(photoId: string) {
    if (!confirm("Foto verwijderen?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBirthdayPhoto(
        photoId,
        birthdayProfileId,
        celebrationYear,
      );
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nog geen foto&apos;s gestuurd.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.id} className="group overflow-hidden rounded-lg border bg-background">
            <a href={photo.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`Verjaardagsfoto van ${photo.uploaderName}`}
                className="aspect-square w-full object-cover transition group-hover:opacity-90"
              />
            </a>
            <figcaption className="flex items-center justify-between gap-2 p-2 text-xs">
              <Link href={`/leden/${photo.uploaderProfileId}`} className="truncate hover:underline">
                {photo.uploaderName}
              </Link>
              {(isAdmin ||
                birthdayProfileId === currentUserId ||
                photo.uploaderProfileId === currentUserId) && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(photo.id)}
                  title="Foto verwijderen"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}
