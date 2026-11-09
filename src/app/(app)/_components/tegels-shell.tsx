import Link from "next/link";
import type { ReactNode } from "react";
import { tegelsFontVariables } from "@/components/tegels/font";
import type { PlaceId } from "@/lib/design-places";
import { getClub } from "@/lib/club";
import { ClubLogo } from "@/components/tegels/club-logo";
import { TegelsTabs } from "./tegels-tabs";
import { clubCommunity } from "@/lib/club-texts";

/** De schil van het design "tegels": het originele logo bovenin, de vier
 * plekken onderin (telefoon) of bovenin (breed scherm). */
export async function TegelsShell({
  before,
  back,
  actions,
  children,
  after,
  hiddenPlaces,
}: {
  before?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  after?: ReactNode;
  /** Plekken waarvan de module bij deze club uit staat. */
  hiddenPlaces?: PlaceId[];
}) {
  const clubTexts = (await getClub()).texts;
  return (
    <div
      data-design="tegels"
      className={`app-shell flex min-h-screen flex-col bg-background ${tegelsFontVariables}`}
    >
      {before}
      <header className="relative">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 pt-3 md:gap-6">
          <Link
            href="/dashboard"
            className="tg-logo flex shrink-0 items-center"
            aria-label={clubCommunity(clubTexts)}
          >
            <ClubLogo />
          </Link>
          {back}
          <TegelsTabs position="top" hiddenPlaces={hiddenPlaces} />
          <div className="flex-1 md:hidden" />
          <div className="flex items-center gap-2">{actions}</div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-5">{children}</main>
      <TegelsTabs position="bottom" hiddenPlaces={hiddenPlaces} />
      {after}
    </div>
  );
}
