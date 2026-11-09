"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export type FieldDef = {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "email";
  required?: boolean;
  maxLength?: number;
};

export type FieldSection = { title?: string; fields: FieldDef[] };

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; msg: string };

/** Een formulier met tekstvelden en één opslaanknop voor een stap van de inrichting. */
export function SettingsForm({
  sections,
  action,
  submitLabel = "Opslaan",
}: {
  sections: FieldSection[];
  action: (values: Record<string, string>) => Promise<{ ok: true } | { ok: false; error: string }>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(sections.flatMap((section) => section.fields.map((field) => [field.name, field.value]))),
  );
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function save(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await action(values);
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", msg: res.error });
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {sections.map((section, index) => (
        <section key={section.title ?? index} className="rounded-lg border bg-card p-4">
          {section.title && <h2 className="mb-3 font-semibold">{section.title}</h2>}
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field.name}>
                <label htmlFor={`f-${field.name}`} className={LABEL}>
                  {field.label}
                </label>
                <input
                  id={`f-${field.name}`}
                  type={field.type ?? "text"}
                  value={values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  required={field.required}
                  maxLength={field.maxLength}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setStatus({ kind: "idle" });
                    setValues((current) => ({ ...current, [field.name]: value }));
                  }}
                  className={FIELD}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex items-center justify-end gap-3">
        {status.kind === "saved" && <span className="text-sm text-green-600 dark:text-green-400">Opgeslagen</span>}
        {status.kind === "error" && <span className="max-w-72 text-sm text-destructive">{status.msg}</span>}
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
