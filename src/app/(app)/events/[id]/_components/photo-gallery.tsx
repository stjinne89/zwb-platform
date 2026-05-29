"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEventPhoto } from "../_actions/photos";

export type EventPhotoData = {
  id: string;
  url: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  takenAt: string | null;
  uploaderId: string;
  uploaderName: string;
};

export function EventPhotoGallery({
  eventId,
  photos,
  currentUserId,
  isAdmin,
}: {
  eventId: string;
  photos: EventPhotoData[];
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(
    () =>
      setActiveIndex((i) =>
        i === null ? null : (i - 1 + photos.length) % photos.length,
      ),
    [photos.length],
  );
  const next = useCallback(
    () =>
      setActiveIndex((i) =>
        i === null ? null : (i + 1) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, close, prev, next]);

  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nog geen foto&apos;s — wees de eerste die er een toevoegt.
      </p>
    );
  }

  const active = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, idx) => (
          <li key={photo.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
            <button
              type="button"
              onClick={() => setActiveIndex(idx)}
              className="block h-full w-full"
              aria-label={`Foto van ${photo.uploaderName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? `Foto van ${photo.uploaderName}`}
                className="h-full w-full object-cover transition hover:scale-105"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <Lightbox
          photo={active}
          eventId={eventId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={close}
          onPrev={photos.length > 1 ? prev : undefined}
          onNext={photos.length > 1 ? next : undefined}
        />
      )}
    </>
  );
}

function Lightbox({
  photo,
  eventId,
  currentUserId,
  isAdmin,
  onClose,
  onPrev,
  onNext,
}: {
  photo: EventPhotoData;
  eventId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canDelete =
    isAdmin || (currentUserId !== null && currentUserId === photo.uploaderId);

  function onDelete() {
    if (!confirm("Deze foto verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteEventPhoto(photo.id, eventId);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption ?? `Foto van ${photo.uploaderName}`}
          className="max-h-[85vh] w-auto rounded-md"
        />

        <div className="mt-2 flex items-center justify-between text-xs text-white/80">
          <span>
            {photo.uploaderName}
            {photo.takenAt && (
              <>
                {" · "}
                {new Date(photo.takenAt).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Europe/Amsterdam",
                })}
              </>
            )}
          </span>
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onDelete}
              className="text-white/80 hover:text-white"
            >
              <Trash2 className="size-4" />
              Verwijder
            </Button>
          )}
        </div>
      </div>

      {onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:left-6"
          aria-label="Vorige"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:right-6"
          aria-label="Volgende"
        >
          <ChevronRight className="size-6" />
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:right-6 sm:top-6"
        aria-label="Sluiten"
      >
        <X className="size-6" />
      </button>
    </div>
  );
}
