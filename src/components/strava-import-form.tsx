"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importMyStravaFile } from "@/app/(app)/achievements/_actions";

type State =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function StravaImportForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: "idle" });

  function submit(formData: FormData) {
    setState({ kind: "idle" });
    startTransition(async () => {
      const res = await importMyStravaFile(formData);
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }

      const parts = [
        res.imported === 1
          ? "1 rit geimporteerd"
          : `${res.imported} ritten geimporteerd`,
      ];
      if (res.milestoneAwards > 0) {
        parts.push(`${res.milestoneAwards} nieuwe badges`);
      }
      if (res.weekAwards > 0) {
        parts.push(`${res.weekAwards} weekbadges bijgewerkt`);
      }
      if (res.skippedNonCycling > 0) {
        parts.push(`${res.skippedNonCycling} niet-fiets overgeslagen`);
      }
      if (res.skippedRows > 0) {
        parts.push(`${res.skippedRows} regels overgeslagen`);
      }
      if (res.milestoneErrors.length > 0) {
        parts.push(`badgecheck: ${res.milestoneErrors[0]}`);
      }

      formRef.current?.reset();
      setState({ kind: "success", message: `${parts.join(" · ")}.` });
      // De lijst eromheen is server-gerenderd; zonder refresh staan de zojuist
      // geïmporteerde ritten er pas na een handmatige herlaadbeurt.
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          type="file"
          name="file"
          accept=".csv,.gpx,text/csv,application/gpx+xml"
          className="max-w-48 text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium"
          disabled={pending}
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <Upload data-icon="inline-start" />
          {pending ? "Importeren..." : "Importeer CSV of GPX"}
        </Button>
      </div>
      {state.kind === "error" ? (
        <p className="text-xs text-destructive">
          {state.message}{" "}
          <Link href="/hulp#strava-import" className="font-medium underline">
            Hulp
          </Link>
        </p>
      ) : state.kind === "success" ? (
        <p className="text-xs text-muted-foreground">{state.message}</p>
      ) : null}
    </form>
  );
}
