import Link from "next/link";

export const metadata = {
  title: "Privacyverklaring — ZWB Cycling",
  description:
    "Hoe ZWB Cycling met je persoonsgegevens omgaat: welke data we verwerken, waarom, hoe lang en welke rechten je hebt.",
};

const UPDATED = "31 mei 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Privacyverklaring</h1>
        <p className="text-sm text-muted-foreground">
          Laatst bijgewerkt: {UPDATED}. Deze verklaring legt uit hoe het
          ZWB Cycling-platform met je persoonsgegevens omgaat, conform de Algemene
          Verordening Gegevensbescherming (AVG/GDPR).
        </p>
      </header>

      <Section title="1. Wie verwerkt je gegevens?">
        <p>
          ZWB Cycling (de wielerclub en haar bestuur) is verwerkings­verantwoordelijke
          voor de gegevens die via dit platform worden verwerkt. Vragen over
          privacy of een verzoek over je gegevens? Mail naar{" "}
          <a href="mailto:info@zwbcycling.nl" className="text-primary underline">
            info@zwbcycling.nl
          </a>
          .
        </p>
      </Section>

      <Section title="2. Welke gegevens we verwerken">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account- en profielgegevens:</strong> naam, e-mailadres,
            profielfoto, regio, ZRL-categorie, Zwift-/Strava-ID, FTP en gewicht
            (voor zover je die invult), biografie en zichtbaarheids­voorkeuren.
          </li>
          <li>
            <strong>Gezondheids­gerelateerde data (alleen met opt-in):</strong>{" "}
            herstel-/wellnessgegevens uit intervals.icu zoals rusthartslag, HRV,
            slaap en readiness. Deze worden alléén gesynchroniseerd als je daar
            expliciet toestemming voor geeft, en zijn alleen voor jou (en een door
            jou aangewezen trainer) zichtbaar.
          </li>
          <li>
            <strong>Locatiegegevens (alleen tijdens live tracking):</strong> als je
            een live rit start, worden je GPS-positie, snelheid en hoogte gedeeld
            met clubleden. Dit is per rit opt-in en stopt automatisch.
          </li>
          <li>
            <strong>Activiteiten- en koppelingsgegevens:</strong> Strava-ritten en
            intervals.icu-trainingsdata, gekoppeld via jouw toestemming.
          </li>
          <li>
            <strong>Door jou geplaatste inhoud:</strong> RSVP&apos;s, chatberichten,
            ritverslagen, reacties, polls en geüploade foto&apos;s.
          </li>
        </ul>
      </Section>

      <Section title="3. Waarom en op welke grondslag">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Uitvoering van het lidmaatschap</strong> (gerechtvaardigd belang
            / overeenkomst): kalender, teams, uitslagen, community en het tonen van
            je profiel aan andere leden.
          </li>
          <li>
            <strong>Toestemming</strong> (art. 6 lid 1a, en art. 9 voor
            gezondheidsdata): wellness-synchronisatie en live tracking gebeuren
            alleen na jouw uitdrukkelijke opt-in. Je kunt die toestemming altijd
            intrekken.
          </li>
          <li>
            <strong>Wettelijke verplichting / beveiliging:</strong> beperkte
            logging en een audit-log voor gevoelige wijzigingen.
          </li>
        </ul>
      </Section>

      <Section title="4. Hoe lang we gegevens bewaren">
        <ul className="list-disc space-y-1 pl-5">
          <li>Live GPS-posities worden na 30 dagen automatisch verwijderd.</li>
          <li>
            Profiel-, activiteiten- en communityinhoud bewaren we zolang je lid
            bent. Bij het verwijderen van je account worden deze gegevens gewist.
          </li>
          <li>
            Je kunt je intervals.icu- of Strava-koppeling op elk moment verbreken;
            de bijbehorende gesynchroniseerde data wordt dan opgeruimd.
          </li>
        </ul>
      </Section>

      <Section title="5. Met wie we gegevens delen (verwerkers)">
        <p>
          We verkopen je gegevens nooit. Voor het functioneren van het platform
          gebruiken we dienstverleners die als verwerker optreden:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — database, authenticatie en opslag (hosting
            in de EU).
          </li>
          <li>
            <strong>Netlify</strong> — hosting van de webapplicatie.
          </li>
          <li>
            <strong>Strava</strong> en <strong>intervals.icu</strong> — alleen als
            je deze koppelt, voor je eigen activiteiten- en trainingsdata.
          </li>
          <li>
            <strong>OpenAI</strong> — voor het genereren van concept-trainings­schema&apos;s
            (alleen relevante trainingscontext, geen directe identificatiegegevens
            waar vermijdbaar).
          </li>
          <li>
            <strong>Mapbox/OpenStreetMap</strong> (kaarten), <strong>Resend</strong>{" "}
            (e-mail), <strong>Mollie</strong> (eventuele betalingen),
            web-push-diensten (notificaties), en embeds van YouTube/Spotify.
          </li>
        </ul>
      </Section>

      <Section title="6. Beveiliging">
        <p>
          We beschermen je gegevens met toegangsbeveiliging op rij-niveau
          (RLS), versleuteling at rest van gekoppelde tokens/sleutels,
          beveiligings-headers, bescherming tegen misbruik (rate limiting) en een
          audit-log voor gevoelige wijzigingen. Toegang tot gevoelige data is
          beperkt tot jezelf en, waar van toepassing, een door jou aangewezen
          trainer of een beheerder.
        </p>
      </Section>

      <Section title="7. Je rechten">
        <p>Je hebt op grond van de AVG het recht om:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            je gegevens <strong>in te zien en te downloaden</strong> — via{" "}
            <Link href="/profiel" className="text-primary underline">
              je profiel
            </Link>{" "}
            (&ldquo;Download mijn gegevens&rdquo;);
          </li>
          <li>
            je gegevens te laten <strong>corrigeren</strong> — pas je profiel aan;
          </li>
          <li>
            je account en gegevens te laten <strong>verwijderen</strong> (recht op
            vergetelheid) — via je profiel;
          </li>
          <li>
            <strong>toestemming in te trekken</strong> voor wellness-sync of live
            tracking, en <strong>bezwaar</strong> te maken tegen verwerking.
          </li>
        </ul>
        <p>
          Ook kun je een klacht indienen bij de Autoriteit Persoonsgegevens.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Dit platform gebruikt alleen functionele cookies die nodig zijn om
          ingelogd te blijven. We gebruiken geen tracking- of advertentiecookies,
          dus er is geen cookietoestemmingsbanner nodig.
        </p>
      </Section>

      <footer className="border-t pt-6 text-sm">
        <Link href="/" className="text-primary underline">
          ← Terug
        </Link>
      </footer>
    </main>
  );
}
