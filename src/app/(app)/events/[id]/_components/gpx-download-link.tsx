import { Download } from "lucide-react";

/**
 * Download-icoon voor de GPX van een event. Staat onder de kaart en het
 * hoogteprofiel — daar kijkt iemand naar de route en wil hij hem meenemen.
 * De href is een signed URL met `download`, dus de browser slaat het bestand op.
 */
export function GpxDownloadLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      title="Download GPX"
      aria-label="Download GPX"
      className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <Download className="size-4" />
    </a>
  );
}
