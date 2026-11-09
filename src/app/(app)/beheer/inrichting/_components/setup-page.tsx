import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";

/** Mag deze gebruiker de club inrichten? Zonder inlog naar /login. */
export async function canSetUpClub(): Promise<boolean> {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  return (await getRequestAccess()).has("roles.manage_permissions");
}

export function NoSetupAccess() {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Geen toegang</h1>
      <p className="mt-2 text-sm text-muted-foreground">Je hebt geen recht om de club in te richten.</p>
    </div>
  );
}

export function LoadError() {
  return (
    <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      Kon de clubinstellingen niet laden.
    </section>
  );
}

/** De kop van een stap, met de weg terug naar het overzicht. */
export function SetupHeader({ title, back = true }: { title: string; back?: boolean }) {
  return (
    <header className="space-y-2">
      {back ? (
        <Link
          href="/beheer/inrichting"
          className="inline-flex items-center gap-1 text-sm font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Inrichting
        </Link>
      ) : (
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Beheer</p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
    </header>
  );
}
