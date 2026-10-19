import { redirect } from "next/navigation";
import { HeaderHelpLink } from "./_components/header-help-link";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import { looksLikeMe } from "@/lib/text/normalize";
import { ZwbMark } from "@/components/zwb-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DesktopNav } from "./_components/desktop-nav";
import { AvatarMenu } from "./_components/avatar-menu";
import { MobileMenu } from "./_components/mobile-menu";
import { BackButton } from "./_components/back-button";
import { NavProgress } from "./_components/nav-progress";
import { PrivacyConsentDialog } from "./_components/privacy-consent-dialog";
import { ZwiftIdDialog, type RosterClaim } from "./_components/zwift-id-dialog";
import {
  ADMIN_NAV,
  NAV_GROUPS,
  beheerCategoriesFor,
  filterNavForPermissions,
} from "./_components/nav-config";
import { TegelsShell } from "./_components/tegels-shell";
import { SponsorFooter } from "./_components/sponsor-footer";
import { DesignSwitch } from "./_components/design-switch";
import { DESIGN_PREVIEW_PERMISSION, getDesign } from "@/lib/design";
import { countUnreadThreads } from "@/lib/zwbieb/queries";
import { WeekReviewLauncher } from "@/components/weekoverzicht/launcher";
import { reviewPeriod } from "@/lib/weekly-review/period";

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
  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  if (!user) redirect("/login");

  const [{ data: profile }, access, unreadThreads] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, zwift_id, zwift_opt_out, sex, privacy_accepted_at, privacy_accepted_version")
      .eq("id", user.id)
      .single(),
    getRequestAccess(),
    // ZWBieb: alleen een icoon als er iets ongelezen is.
    countUnreadThreads(supabase, user.id).catch(() => 0),
  ]);

  const displayName = profile?.display_name ?? user.email ?? "";

  // Twee redenen om het te vragen. Nooit getekend: leden van vóór het
  // toestemmingsvinkje (`0063`) en leden die via een magic link binnenkwamen —
  // `0138` liet die bewust leeg, want een datum invullen die niemand heeft
  // gegeven is de administratie vervalsen. Of wél getekend, maar op een tekst
  // die daarna inhoudelijk is gewijzigd; die toestemming dekt de nieuwe
  // verwerking niet. Elke sessie opnieuw tot het akkoord er staat.
  const consentVersion = (profile?.privacy_accepted_version as string | null) ?? null;
  const signedBefore = Boolean(profile?.privacy_accepted_at);
  const needsPrivacyConsent = Boolean(profile) && !privacyConsentIsCurrent(consentVersion);

  // Vragen tot het ingevuld is of tot het lid zegt niet te zwiften. Nooit
  // tegelijk met de toestemmingsvraag: twee dialogen over elkaar heen is geen
  // keuze meer, en toestemming gaat voor.
  const needsZwiftId = Boolean(
    profile && !profile.zwift_id && !profile.zwift_opt_out && !needsPrivacyConsent,
  );

  // Staat het lid al in de ledenlijst, dan is claimen makkelijker dan een
  // nummer opzoeken: claim_roster_entry zet het Zwift-ID meteen op het profiel.
  // Alleen regels mét een Zwift-ID, anders lost de claim de vraag niet op en
  // komt de dialoog bij de volgende pagina gewoon terug. Alleen ophalen als de
  // vraag ook echt gesteld wordt — deze layout draait op elke pagina.
  const claims = needsZwiftId ? await claimableRosterEntries(supabase, displayName) : [];

  // Het weekoverzicht: zondagavond tot en met woensdag, en nooit boven op een
  // van de twee vragen hierboven. Of er echt iets klaarstaat vraagt de launcher
  // zelf na, zodat deze layout er geen query voor doet.
  const period = reviewPeriod();
  const weekReview =
    period.inPopupWindow && !needsPrivacyConsent && !needsZwiftId ? (
      <WeekReviewLauncher weekStart={period.weekStart} />
    ) : null;
  const adminItems = ADMIN_NAV.filter((item) => access.has(item.permission));
  const navNodes = filterNavForPermissions(
    NAV_GROUPS,
    (permission) => access.has(permission),
    (profile?.sex as string | null) ?? null,
  );

  const canPreviewDesign = access.has(DESIGN_PREVIEW_PERMISSION);
  const design = await getDesign();

  if (design === "tegels") {
    return (
      <TegelsShell
        before={<NavProgress />}
        back={<BackButton className="size-11 hover:bg-transparent" />}
        actions={
          <>
            <UnreadMessagesLink
              count={unreadThreads}
              className="inline-flex size-11 items-center justify-center text-muted-foreground transition hover:text-primary"
              iconClassName="size-5"
            />
            <HeaderHelpLink
              className="inline-flex size-11 items-center justify-center text-muted-foreground transition hover:text-primary"
              iconClassName="size-5"
            />
            <AvatarMenu
              displayName={displayName}
              adminItems={[]}
              beheerPage={beheerCategoriesFor((permission) => access.has(permission)).length > 0}
              avatarUrl={(profile?.avatar_url as string | null) ?? null}
              showOnMobile
            />
            <ThemeToggle className="size-11 px-0 text-muted-foreground hover:bg-transparent hover:text-primary [&_svg]:size-5!" />
          </>
        }
        after={
          <>
            {needsPrivacyConsent && <PrivacyConsentDialog updated={signedBefore} />}
            {needsZwiftId && <ZwiftIdDialog claims={claims} />}
            {weekReview}
          </>
        }
      >
        {children}
        <SponsorFooter />
        {canPreviewDesign && <DesignSwitch design={design} />}
      </TegelsShell>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <NavProgress />
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
            <UnreadMessagesLink
              count={unreadThreads}
              className="inline-flex rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-primary"
              iconClassName="size-4"
            />
            <HeaderHelpLink
              className="inline-flex rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-primary"
              iconClassName="size-4"
            />
            <AvatarMenu displayName={displayName} adminItems={adminItems} />
            <ThemeToggle />
            <MobileMenu displayName={displayName} adminItems={adminItems} nodes={navNodes} />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
        <SponsorFooter />
        {canPreviewDesign && <DesignSwitch design={design} />}
      </main>
      {needsPrivacyConsent && <PrivacyConsentDialog updated={signedBefore} />}
      {needsZwiftId && <ZwiftIdDialog claims={claims} />}
      {weekReview}
    </div>
  );
}

/** Icoon naar de gesprekken van ZWBieb, alleen bij iets ongelezens. */
function UnreadMessagesLink({
  count,
  className,
  iconClassName,
}: {
  count: number;
  className: string;
  iconClassName: string;
}) {
  if (count <= 0) return null;
  return (
    <Link
      href="/zwbieb/gesprekken"
      className={`relative ${className}`}
      aria-label={`${count} ongelezen ${count === 1 ? "gesprek" : "gesprekken"}`}
    >
      <MessagesSquare className={iconClassName} />
      <span className="absolute top-0 right-0 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
        {count}
      </span>
    </Link>
  );
}
