import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { looksLikeMe } from "@/lib/text/normalize";
import { ZwbMark } from "@/components/zwb-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DesktopNav } from "./_components/desktop-nav";
import { AvatarMenu } from "./_components/avatar-menu";
import { MobileMenu } from "./_components/mobile-menu";
import { BackButton } from "./_components/back-button";
import { ZwiftIdDialog, type RosterClaim } from "./_components/zwift-id-dialog";
import { ADMIN_NAV, NAV_GROUPS, filterNavForPermissions } from "./_components/nav-config";

/**
 * Ongeclaimde ledenlijst-regels die op de naam van dit lid lijken en een
 * Zwift-ID dragen. Zelfde matching als de claimlijst op `/leden`, zodat een lid
 * op beide plekken dezelfde suggestie ziet.
 */
async function claimableRosterEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  displayName: string,
): Promise<RosterClaim[]> {
  if (!displayName) return [];
  const { data } = await supabase
    .from("roster_entries")
    .select("id, name, zwift_id, team_name")
    .is("claimed_by", null)
    .not("zwift_id", "is", null)
    .order("name");
  return (data ?? [])
    .filter((row) => looksLikeMe(row.name as string, displayName))
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      zwiftId: (row.zwift_id as string | null) ?? null,
      teamName: (row.team_name as string | null) ?? null,
    }));
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, access] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, zwift_id, zwift_opt_out, sex")
      .eq("id", user.id)
      .single(),
    getCurrentUserAccess(supabase),
  ]);

  const displayName = profile?.display_name ?? user.email ?? "";
  // Vragen tot het ingevuld is of tot het lid zegt niet te zwiften.
  const needsZwiftId = Boolean(profile && !profile.zwift_id && !profile.zwift_opt_out);

  // Staat het lid al in de ledenlijst, dan is claimen makkelijker dan een
  // nummer opzoeken: claim_roster_entry zet het Zwift-ID meteen op het profiel.
  // Alleen regels mét een Zwift-ID, anders lost de claim de vraag niet op en
  // komt de dialoog bij de volgende pagina gewoon terug. Alleen ophalen als de
  // vraag ook echt gesteld wordt — deze layout draait op elke pagina.
  const claims = needsZwiftId ? await claimableRosterEntries(supabase, displayName) : [];
  const adminItems = ADMIN_NAV.filter((item) => access.has(item.permission));
  const navNodes = filterNavForPermissions(
    NAV_GROUPS,
    (permission) => access.has(permission),
    (profile?.sex as string | null) ?? null,
  );

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="relative border-b border-border/80 bg-background/88 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 md:gap-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center"
            aria-label="ZWB Cycling Community"
          >
            <ZwbMark className="h-7 w-auto" />
          </Link>
          <BackButton />

          {/* Desktop nav (6 top-level slots, sommige met dropdown) */}
          <DesktopNav nodes={navNodes} />

          {/* Spacer voor mobiel zodat right-side rechts uitlijnt */}
          <div className="flex-1 md:hidden" />

          {/* Right side: avatar-dropdown + theme + mobile-hamburger */}
          <div className="flex items-center gap-2">
            <Link
              href="/hulp"
              className="hidden rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-primary md:inline-flex"
              aria-label="Hulp"
            >
              <CircleHelp className="size-4" />
            </Link>
            <AvatarMenu displayName={displayName} adminItems={adminItems} />
            <ThemeToggle />
            <MobileMenu displayName={displayName} adminItems={adminItems} nodes={navNodes} />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      {needsZwiftId && <ZwiftIdDialog claims={claims} />}
    </div>
  );
}
