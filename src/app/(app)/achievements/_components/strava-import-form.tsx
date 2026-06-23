"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importMyStravaCsv } from "../_actions";

type State =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function StravaImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: "idle" });

  function submit(formData: FormData) {
    setState({ kind: "idle" });
    startTransition(async () => {
      const res = await importMyStravaCsv(formData);
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }

      const parts = [`${res.imported} ritten geimporteerd`];
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
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="max-w-48 text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium"
          disabled={pending}
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <Upload data-icon="inline-start" />
          {pending ? "Importeren..." : "Importeer CSV"}
        </Button>
      </div>
      {state.kind !== "idle" && (
        <p
          className={
            state.kind === "error"
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
