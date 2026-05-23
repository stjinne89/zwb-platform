"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareLiveButton({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/live/${eventId}`
        : `/live/${eventId}`;

    // Probeer eerst de native share-sheet (Android Chrome, iOS Safari, etc.)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "ZWB live volgen",
          text: "Volg ons live tijdens deze rit",
          url,
        });
        return;
      } catch {
        // gebruiker annuleerde share-sheet, val terug op clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // laatste redmiddel: open in nieuwe tab zodat URL zichtbaar is
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={onShare}>
      {copied ? (
        <>
          <Check className="size-3.5" />
          Gekopieerd
        </>
      ) : (
        <>
          <Share2 className="size-3.5" />
          Deel publieke link
        </>
      )}
    </Button>
  );
}
