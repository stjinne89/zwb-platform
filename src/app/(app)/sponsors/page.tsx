import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { SponsorCard, type SponsorCardData } from "./_components/sponsor-card";
import { BenefitCard, type BenefitCardData } from "./_components/benefit-card";
import {
  SponsorAdmin,
  type SponsorAdminRow,
} from "./_components/sponsor-admin";
import {
  BenefitAdmin,
  type BenefitAdminRow,
} from "./_components/benefit-admin";

type SponsorRow = SponsorAdminRow;

type BenefitRow = {
  id: string;
  sponsor_id: string | null;
  title: string;
  description_md: string | null;
  discount_code: string | null;
  redeem_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  display_order: number;
  sponsors:
    | { name: string; slug: string; logo_url: string | null }
    | { name: string; slug: string; logo_url: string | null }[]
    | null;
};

const TIER_ORDER: SponsorCardData["tier"][] = [
  "hoofd",
  "sub",
  "team",
  "web",
  "vriend",
];

const TIER_HEADINGS: Record<SponsorCardData["tier"], string> = {
  hoofd: "Hoofdsponsor",
  sub: "Sub-sponsor",
  team: "Team sponsors",
  web: "Web sponsor",
  vriend: "Vrienden van ZWB",
};

const TIER_GRID: Record<SponsorCardData["tier"], string> = {
  hoofd: "grid-cols-1",
  sub: "grid-cols-1 sm:grid-cols-2",
  team: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  web: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  vriend: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
};

function singleSponsor(rel: BenefitRow["sponsors"]) {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export default async function SponsorsPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  // Sponsors zijn publiek leesbaar (RLS); admins zien ook inactieve.
  const { data: sponsorRows } = await supabase
    .from("sponsors")
    .select(
      "id, name, slug, logo_url, website_url, description_md, contact_email, tier, display_order, active",
    )
    .order("tier")
    .order("display_order");

  const sponsors = (sponsorRows ?? []) as SponsorRow[];
  const visibleSponsors = sponsors.filter((s) => s.active);
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    sponsors: visibleSponsors.filter((s) => s.tier === tier),
  })).filter((g) => g.sponsors.length > 0);

  // Voordelen alleen voor ingelogde leden (RLS doet dit, maar dubbel check
  // voorkomt dat we de gated sectie tonen aan publiek).
  let benefits: BenefitRow[] = [];
  if (access.user) {
    const { data: benefitRows } = await supabase
      .from("member_benefits")
      .select(
        "id, sponsor_id, title, description_md, discount_code, redeem_url, valid_from, valid_until, active, display_order, sponsors(name, slug, logo_url)",
      )
      .order("display_order");
    benefits = (benefitRows ?? []) as unknown as BenefitRow[];
  }
  const visibleBenefits = benefits.filter((b) => b.active);

  const canManage = access.has("sponsors.manage");

  // Admin views krijgen ook inactieve rijen (gefilterd uit RLS via is_admin
  // policy of via service-role op de admin-action; voor de admin-list hier
  // tonen we wat publiek-leesbaar is plus eventuele admin-only rijen later).
  // Voor nu: admin werkt met dezelfde lijst die hierboven al geladen is.
  const benefitCards: BenefitCardData[] = visibleBenefits.map((b) => ({
    id: b.id,
    title: b.title,
    description_md: b.description_md,
    discount_code: b.discount_code,
    redeem_url: b.redeem_url,
    valid_from: b.valid_from,
    valid_until: b.valid_until,
    sponsor: (() => {
      const s = singleSponsor(b.sponsors);
      return s ? { name: s.name, slug: s.slug, logo_url: s.logo_url } : null;
    })(),
  }));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Sponsors & ledenvoordeel
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          ZWB Cycling rijdt dankzij onze sponsors en partners. Hieronder
          de bedrijven die ons mogelijk maken. Ben je lid? Scroll naar
          beneden voor exclusieve <strong>ledenvoordelen</strong> en
          kortingscodes.
        </p>
      </header>

      {/* Sponsor showcase per tier */}
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen sponsors zichtbaar.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ tier, sponsors: list }) => (
            <section key={tier} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {TIER_HEADINGS[tier]}
              </h2>
              <div className={`grid gap-4 ${TIER_GRID[tier]}`}>
                {list.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={{
                      id: sponsor.id,
                      name: sponsor.name,
                      slug: sponsor.slug,
                      logo_url: sponsor.logo_url,
                      website_url: sponsor.website_url,
                      description_md: sponsor.description_md,
                      tier: sponsor.tier,
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Ledenvoordeel — alleen voor ingelogde leden */}
      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold tracking-tight">
            Ledenvoordeel
          </h2>
          <p className="text-sm text-muted-foreground">
            Kortingscodes en aanbiedingen voor ZWB-leden, ingebracht via
            sponsors of door bestuur toegevoegd.
          </p>
        </header>

        {!access.user ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Log in om de ledenvoordelen + kortingscodes te zien.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block rounded-md border px-3 py-1 text-sm font-medium hover:bg-accent"
            >
              Inloggen
            </Link>
          </div>
        ) : benefitCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Op dit moment zijn er geen actieve ledenvoordelen. Hou deze
            pagina in de gaten — er komen nieuwe aanbiedingen aan.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {benefitCards.map((b) => (
              <BenefitCard key={b.id} benefit={b} />
            ))}
          </div>
        )}
      </section>

      {/* Worden-sponsor CTA */}
      <section className="rounded-lg border bg-muted/30 p-6 text-center">
        <h2 className="text-lg font-semibold">Zelf ook ZWB-sponsor worden?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We staan open voor sponsoring in allerlei vormen: hoofdsponsor,
          team-sponsor, materiaal- of dienstverlening, of als vriend van
          ZWB.
        </p>
        <a
          href="mailto:info@zwbcycling.nl"
          className="mt-3 inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Mail het bestuur
        </a>
      </section>

      {/* Admin beheer-panels */}
      {canManage && (
        <div className="space-y-6 border-t pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Beheer (alleen zichtbaar voor bestuur / community-managers)
          </p>
          <SponsorAdmin sponsors={sponsors} />
          <BenefitAdmin
            benefits={benefits.map((b) => ({
              id: b.id,
              sponsor_id: b.sponsor_id,
              title: b.title,
              description_md: b.description_md,
              discount_code: b.discount_code,
              redeem_url: b.redeem_url,
              valid_from: b.valid_from,
              valid_until: b.valid_until,
              display_order: b.display_order,
              active: b.active,
            })) as BenefitAdminRow[]}
            sponsors={sponsors.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      )}
    </div>
  );
}
