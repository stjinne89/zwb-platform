"use client";

// Het racebriefje als plaatje voor de teamchat. De browser tekent precies het
// papier dat je ziet (handschrift, gescheurde rand, plakband) naar een PNG op
// een donkere ondergrond, zodat het in WhatsApp loskomt. Op de telefoon opent
// het deelmenu, elders wordt het plaatje gedownload.

import { useRef, useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ondergrond van het plaatje: tegelinkt uit DESIGN.md. */
const BACKDROP = "#0a2b34";
const PAD_X = 18;
const PAD_Y = 22;

export function ShareableSheet({ children, fileName, title }: { children: React.ReactNode; fileName: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function share() {
    const node = ref.current;
    if (!node || state === "busy") return;
    setState("busy");
    try {
      const { domToBlob } = await import("modern-screenshot");
      await document.fonts.ready;
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      const options = {
        scale: 2,
        backgroundColor: BACKDROP,
        width: width + 2 * PAD_X,
        height: height + 2 * PAD_Y,
        style: { width: `${width}px`, padding: `${PAD_Y}px ${PAD_X}px`, boxSizing: "content-box", margin: "0" },
      };
      const blob = await domToBlob(node, options);
      if (!blob) throw new Error("leeg");
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title });
        } catch (error) {
          // Wegtikken van het deelmenu is geen fout.
          if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <div ref={ref}>{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state === "error" && <p className="text-sm text-destructive">Het plaatje lukte niet. Probeer het opnieuw.</p>}
        <Button type="button" variant="outline" className="min-h-11" onClick={share} disabled={state === "busy"}>
          {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
          Deel als plaatje
        </Button>
      </div>
    </div>
  );
}
