"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  finishMyStravaImport,
  importMyStravaFiles,
  syncMyBlocks,
} from "@/app/(app)/achievements/_actions";

type State =
  | { kind: "idle" }
  | { kind: "progress"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

// De map met ritten uit een Strava-export telt al gauw meer dan duizend
// bestanden. Vijf per aanroep blijft binnen de tijdslimiet van de server en ruim
// onder de uploadlimiet van Netlify (~6 MB).
const BATCH_FILES = 5;
const BATCH_BYTES = 4 * 1024 * 1024;
// 500 ritten per ronde; ruim genoeg voor een historie van tienduizend ritten.
const MAX_BLOCK_ROUNDS = 20;

function uploadBatches(files: File[]): File[][] {
  const batches: File[][] = [];
  let batch: File[] = [];
  let bytes = 0;
  for (const file of files) {
    if (batch.length > 0 && (batch.length >= BATCH_FILES || bytes + file.size > BATCH_BYTES)) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(file);
    bytes += file.size;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

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
      setState({ kind: "error", message: "Kies activities.csv of een of meer GPX- of FIT-bestanden." });
      return;
    }

    setState({ kind: "idle" });
    startTransition(async () => {
      let imported = 0;
      let tracksAdded = 0;
      let segmentEfforts = 0;
      let skippedRows = 0;
      let skippedNoTrack = 0;
      let skippedNonCycling = 0;
      const failed: string[] = [];

      // Een paar bestanden per aanroep: alles tegelijk past niet in de
      // uploadlimiet van één server action, en per bestand komt er een eigen
      // uitkomst terug, zodat één kapot bestand de rest niet tegenhoudt.
      let done = 0;
      for (const batch of uploadBatches(files)) {
        if (files.length > 1) {
          setState({ kind: "progress", message: `${done + 1} van ${files.length}...` });
        }
        const formData = new FormData();
        for (const file of batch) formData.append("file", file);
        const res = await importMyStravaFiles(formData).catch(() => null);
        done += batch.length;
        batch.forEach((file, index) => {
          const result = res?.ok ? res.results[index] : res;
          if (!result?.ok) {
            failed.push(files.length > 1 ? `${file.name}: ${result?.error ?? "mislukt"}` : (result?.error ?? "Import faalde."));
            return;
          }
          imported += result.imported;
          tracksAdded += result.tracksAdded;
          segmentEfforts += result.segmentEfforts;
          skippedRows += result.skippedRows;
          skippedNoTrack += result.skippedNoTrack;
          skippedNonCycling += result.skippedNonCycling;
        });
      }

      // Wat er niet in kwam, en waarom. Zonder dit las een map vol overgeslagen
      // bestanden als "stonden er al".
      const skipped: string[] = [];
      if (skippedNonCycling > 0) skipped.push(`${skippedNonCycling} niet-fiets overgeslagen`);
      if (skippedNoTrack > 0) skipped.push(`${skippedNoTrack} zonder GPS overgeslagen`);
      if (skippedRows > 0) skipped.push(`${skippedRows} al bekend of onleesbaar`);

      if (imported === 0 && tracksAdded === 0) {
        formRef.current?.reset();
        if (failed.length === files.length) {
          setState({ kind: "error", message: failed[0] });
        } else if (failed.length > 0) {
          setState({
            kind: "error",
            message: `Niets nieuws${skipped.length > 0 ? ` (${skipped.join(" · ")})` : ""}. ${count(failed.length, "bestand", "bestanden")} mislukt, o.a. ${failed[0]}`,
          });
        } else {
          setState({
            kind: "success",
            message:
              skippedNonCycling > 0 || skippedNoTrack > 0
                ? `Niets nieuws: ${skipped.join(" · ")}.`
                : "Deze ritten stonden er al.",
          });
        }
        return;
      }

      if (files.length > 1) setState({ kind: "progress", message: "Cols en badges bijwerken..." });
      const finish = await finishMyStravaImport().catch(() => null);

      // Een grote import levert meer ritten op dan ZWBlokken in één aanroep
      // doorrekent. Hier afmaken; er is geen achtergrondtaak die het overneemt.
      let blocksDone = false;
      for (let round = 0; round < MAX_BLOCK_ROUNDS && !blocksDone; round++) {
        setState({ kind: "progress", message: "ZWBlokken bijwerken..." });
        const blocks = await syncMyBlocks().catch(() => null);
        if (!blocks?.ok) break;
        blocksDone = !blocks.remaining;
      }

      const parts = [count(imported, "rit geïmporteerd", "ritten geïmporteerd")];
      if (tracksAdded > 0) parts.push(count(tracksAdded, "spoor aangevuld", "sporen aangevuld"));
      if (segmentEfforts > 0) parts.push(count(segmentEfforts, "segmenttijd gemeten", "segmenttijden gemeten"));
      if (finish?.ok && finish.milestoneAwards > 0) {
        parts.push(count(finish.milestoneAwards, "nieuwe badge", "nieuwe badges"));
      }
      if (finish?.ok && finish.weekAwards > 0) {
        parts.push(`${finish.weekAwards} weekbadges bijgewerkt`);
      }
      parts.push(...skipped);
      if (finish?.ok && finish.milestoneErrors.length > 0) {
        parts.push(`badgecheck: ${finish.milestoneErrors[0]}`);
      }
      if (!finish?.ok) parts.push("badges en cols volgen later");
      if (!blocksDone) parts.push("ZWBlokken nog niet compleet");

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
          accept=".csv,.gpx,.fit,.gz,text/csv,application/gpx+xml"
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
          {pending ? "Importeren..." : "Importeer ritten"}
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
