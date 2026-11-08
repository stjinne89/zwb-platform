import Link from "next/link";
import { HoudingMeting } from "@/components/houding/houding-meting";
import { requireViewer } from "../../_data";

// Houding en bikefit uit live video, bèta voor leden (2026-11-08). Zonder
// advies in letters of millimeters tot de lettertest van de meetproef het
// draagt. Het beeld blijft op het toestel; niets wordt opgeslagen. Het
// camerarecht staat per pad in next.config.ts.

export const dynamic = "force-dynamic";

export default async function HoudingPage() {
  await requireViewer();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Houding</h2>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">bèta</span>
        <Link href="/hulp/kennis#houding" className="ml-auto text-sm text-primary hover:underline">
          Uitleg
        </Link>
      </div>
      <HoudingMeting />
    </div>
  );
}
