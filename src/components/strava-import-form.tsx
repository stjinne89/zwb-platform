"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  finishMyStravaImport,
  importMyStravaFile,
} from "@/app/(app)/achievements/_actions";

type State =
  | { kind: "idle" }
  | { kind: "progress"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function StravaImportForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: "idle" });

  function submit(formData: FormData) {
    const files = formData
      .getAll("file")
      .filter((file): file is File => file instanceof File && file.size > 0);
    if (files.length === 0) {
      setState({ kind: "error", message: "Kies activities.csv of een of meer GPX-bestanden." });
      return;
    }

    setState({ kind: "idle" });
    startTransition(async () => {
      let imported = 0;
      let tracksAdded = 0;
      let skippedRows = 0;
      let skippedNonCycling = 0;
      const failed: string[] = [];

      // Eén bestand per aanroep: een bulkupload van tientallen GPX'en past niet
      // in de uploadlimiet van één server action, en één kapot bestand laat de
      // rest zo gewoon doorgaan.
      for (const [index, file] of files.entries()) {
        if (files.length > 1) {
          setState({
            kind: "progress",
            message: `${index + 1} van ${files.length}...`,
          });
        }
        const single = new FormData();
        single.set("file", file);
        const res = await importMyStravaFile(single).catch(() => null);
        if (!res?.ok) {
          failed.push(files.length > 1 ? `${file.name}: ${res?.error ?? "mislukt"}` : (res?.error ?? "Import faalde."));
          continue;
        }
        imported += res.imported;
        tracksAdded += res.tracksAdded;
        skippedRows += res.skippedRows;
        skippedNonCycling += res.skippedNonCycling;
      }

      if (imported === 0 && tracksAdded === 0) {
        formRef.current?.reset();
        if (failed.length === files.length) {
          setState({ kind: "error", message: failed[0] });
        } else if (failed.length > 0) {
          setState({
            kind: "error",
            message: `Niets nieuws. ${count(failed.length, "bestand", "bestanden")} mislukt, o.a. ${failed[0]}`,
          });
        } else {
          setState({ kind: "success", message: "Deze ritten stonden er al." });
        }
        return;
      }

      if (files.length > 1) setState({ kind: "progress", message: "Cols en badges bijwerken..." });
      const finish = await finishMyStravaImport().catch(() => null);

      const parts = [count(imported, "rit geïmporteerd", "ritten geïmporteerd")];
      if (tracksAdded > 0) parts.push(count(tracksAdded, "spoor aangevuld", "sporen aangevuld"));
      if (finish?.ok && finish.milestoneAwards > 0) {
        parts.push(count(finish.milestoneAwards, "nieuwe badge", "nieuwe badges"));
      }
      if (finish?.ok && finish.weekAwards > 0) {
        parts.push(`${finish.weekAwards} weekbadges bijgewerkt`);
      }
      if (skippedNonCycling > 0) parts.push(`${skippedNonCycling} niet-fiets overgeslagen`);
      if (skippedRows > 0) parts.push(`${skippedRows} al bekend of onleesbaar`);
      if (finish?.ok && finish.milestoneErrors.length > 0) {
        parts.push(`badgecheck: ${finish.milestoneErrors[0]}`);
      }
      if (!finish?.ok) parts.push("badges en cols volgen later");

      formRef.current?.reset();
      if (failed.length > 0) {
        setState({
          kind: "error",
          message: `${parts.join(" · ")}. ${count(failed.length, "bestand", "bestanden")} mislukt, o.a. ${failed[0]}`,
        });
      } else {
        setState({ kind: "success", message: `${parts.join(" · ")}.` });
      }
      // De lijst eromheen is server-gerenderd; zonder refresh staan de zojuist
      // geïmporteerde ritten er pas na een handmatige herlaadbeurt.
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end"
    >
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        {/* Het veld kreeg een vaste max-breedte en kapte daardoor zijn eigen
            bijschrift af tot "geen be...ecteerd". Op een telefoon krijgt het nu
            een eigen regel — de knop wrapt eronder — want naast die knop blijft
            er te weinig over: op 390px zou het veld op 132px uitkomen, nóg
            smaller dan de max-breedte die het probleem veroorzaakte. Vanaf sm is
            er wel ruimte naast elkaar en geldt de oude maat. */}
        <input
          type="file"
          name="file"
          multiple
          accept=".csv,.gpx,text/csv,application/gpx+xml"
          className="w-full min-w-0 text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium sm:w-auto sm:max-w-48"
          disabled={pending}
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={pending}
        >
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
      ) : state.kind === "success" || state.kind === "progress" ? (
        <p className="text-xs text-muted-foreground">{state.message}</p>
      ) : null}
    </form>
  );
}
