import { redirect } from "next/navigation";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBikeParts } from "@/lib/pacing/ride-context";
import { loadGarageRows } from "@/lib/pacing/zwift-garage";
import type { BikeKind } from "@/lib/pacing/zwift-setup";
import { ZwiftGarageForm } from "./_components/garage-form";

export const dynamic = "force-dynamic";

const KIND_ORDER: BikeKind[] = ["road", "tt", "gravel", "mtb"];

export default async function ZwiftGaragePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [parts, rows] = await Promise.all([loadBikeParts(createAdminClient()), loadGarageRows(supabase, user.id)]);

  const kinds = new Map<string, BikeKind>();
  for (const part of parts) if (part.part === "frame" && !kinds.has(part.name)) kinds.set(part.name, part.kind);
  const frames = [...kinds]
    .map(([name, kind]) => ({ name, kind }))
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name));
  const wheels = [...new Set(parts.filter((part) => part.part === "wheel").map((part) => part.name))].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <BackLink href="/mijn-garage" label="Mijn garage" />
      <PageHeader eyebrow="Mijn garage" title="Zwift-fietsen" />
      {frames.length === 0 ? (
        <EmptyState>De fietslijst is nog niet opgehaald.</EmptyState>
      ) : (
        <ZwiftGarageForm
          frames={frames}
          wheels={wheels}
          initialFrames={Object.fromEntries(rows.filter((row) => row.part === "frame").map((row) => [row.name, row.stage]))}
          initialWheels={rows.filter((row) => row.part === "wheel").map((row) => row.name)}
        />
      )}
    </div>
  );
}
