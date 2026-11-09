import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import {
  DEFAULT_FONT,
  PALETTE_KEYS,
  normalizeHex,
  resolveFont,
  type PaletteKey,
} from "@/lib/club-theme";
import { ClubImages } from "./_components/club-images";
import { FontPicker } from "./_components/font-picker";
import { HuisstijlEditor } from "./_components/huisstijl-editor";

export default async function HuisstijlPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const access = await getRequestAccess();
  if (!access.has("roles.manage_permissions")) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Geen toegang</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je hebt geen recht om de huisstijl van de club te beheren.
        </p>
      </div>
    );
  }

  // Vers uit de database, niet uit de gedeelde cache: wie hier opslaat, moet de
  // nieuwe stand zien. Alle kolommen, zodat de pagina ook vóór 0314 laadt.
  const supabase = await createClient();
  const { data, error } = await supabase.from("club_settings").select("*").maybeSingle();
  const row = (data ?? {}) as Record<string, unknown>;
  const stored = Object.fromEntries(
    PALETTE_KEYS.map((key) => [key, normalizeHex(row[`color_${key}`] as string | null)]),
  ) as Record<PaletteKey, string | null>;
  const font = resolveFont(row.font as string | null) ?? DEFAULT_FONT;
  const logoUrl = (row.logo_url as string | null) ?? null;
  const markUrl = (row.mark_url as string | null) ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Beheer</p>
        <h1 className="text-3xl font-semibold tracking-tight">Huisstijl</h1>
      </header>

      {error ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kon de huisstijl niet laden.
        </section>
      ) : (
        <>
          <HuisstijlEditor stored={stored} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FontPicker initial={font} />
            <ClubImages logoUrl={logoUrl} markUrl={markUrl} />
          </div>
        </>
      )}
    </div>
  );
}
