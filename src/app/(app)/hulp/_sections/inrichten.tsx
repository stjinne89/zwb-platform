import type { ReactNode } from "react";
import { CheckCircle2, Settings2 } from "lucide-react";

function Step({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <article id={id} className="scroll-mt-20 rounded-md border bg-background p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{children}</ul>
    </article>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

/** Naslag bij Beheer → Inrichting (fase 6 van de generieke versie). */
export function InrichtenHelp() {
  return (
    <section id="inrichten" className="scroll-mt-20 rounded-lg border bg-card/90 p-5">
      <header className="flex items-start gap-2">
        <Settings2 className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h2 className="font-semibold">De app inrichten voor je club</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Onder Beheer → Inrichting, voor wie de rechten van de club beheert.
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Step id="inrichten-stappen" title="De stappen">
          <Item>Elke stap is later weer aan te passen; de inrichting zit niet vast.</Item>
          <Item>
            Achter elke stap staat Eigen, Standaard of Open. Standaard betekent dat de neutrale namen en
            kleuren gelden, en dat is prima. Alleen de clubnaam moet echt ingevuld zijn.
          </Item>
          <Item>
            Zolang de inrichting niet af is, staat er een balk op het dashboard van beheerders. Met
            Inrichting afronden verdwijnt die.
          </Item>
        </Step>

        <Step id="inrichten-club" title="Club">
          <Item>De naam staat in het menu, in tabtitels, meldingen en de privacyverklaring.</Item>
          <Item>
            De korte naam staat waar de volledige naam te lang is, zoals in meldingen en labels. Zonder
            eigen eventmarkers of teamtag herkent de app de club ook aan de korte naam.
          </Item>
          <Item>Lid en Leden: hoe een lid heet. Leeg is &ldquo;lid&rdquo; en &ldquo;leden&rdquo;.</Item>
          <Item>
            Het e-mailadres staat in de privacyverklaring en de voorwaarden, als adres voor vragen en
            verzoeken over gegevens.
          </Item>
        </Step>

        <Step id="inrichten-huisstijl" title="Huisstijl">
          <Item>
            Vijf kleuren: primair, secundair, neutraal, accent en donkere inkt. Het voorbeeld laat licht en
            donker zien; de donkere stand volgt vanzelf uit de kleuren.
          </Item>
          <Item>Slecht leesbaar betekent dat tekst te weinig contrast heeft met zijn achtergrond.</Item>
          <Item>Het lettertype kies je uit een vaste lijst.</Item>
          <Item>
            Logo en beeldmerk: PNG of JPG, maximaal 2 MB. De app maakt er zelf de iconen voor het
            beginscherm van.
          </Item>
        </Step>

        <Step id="inrichten-modules" title="Modules">
          <Item>
            Een module die uit staat, verdwijnt uit het menu, het dashboard, de hulp en het beheer, en zijn
            geplande taken lopen niet.
          </Item>
          <Item>
            Heeft een module een andere nodig, dan gaat hij mee uit als die andere uit staat. Dat staat
            onder de module.
          </Item>
        </Step>

        <Step id="inrichten-namen" title="Namen en woorden">
          <Item>Per module een eigen naam. Leeg is de neutrale naam die in het veld staat.</Item>
          <Item>Appnaam: hoe de app heet in teksten, zoals de wekelijkse app-update. Leeg is de korte naam met -app.</Item>
          <Item>Dagadvies: de naam van het advies van de dag bij Training.</Item>
          <Item>Betaalmiddel: waarmee leden inzetten bij het voorspelspel, enkelvoud en meervoud.</Item>
          <Item>Beker: één prijs in de prijzenkast.</Item>
          <Item>Beter-woord: het woord voor de pijlers van de training, zoals &ldquo;Beter racen&rdquo;.</Item>
        </Step>

        <Step id="inrichten-herkenning" title="Herkenning en koppelingen">
          <Item>
            Eventmarkers zijn woorden in de titel van een Zwift-event die het tot een event van de club
            maken. Scheid ze met komma&apos;s. Leeg is de korte naam.
          </Item>
          <Item>
            De teamtag is de tag achter een rennersnaam, zoals [TAG]. Daarmee vindt de app clubleden in
            uitslagen en live standen. Leeg is de korte naam.
          </Item>
          <Item>Instagram en YouTube: de accountnaam van de club, met of zonder @.</Item>
          <Item>
            Env-variabelen zijn de geheimen van de installatie, zoals wachtwoorden en sleutels. Ze staan bij
            de hosting, niet in de app. Hier zie je alleen of ze gezet zijn, nooit de waarde. Na een
            wijziging bij de hosting moet de site opnieuw gebouwd worden.
          </Item>
        </Step>

        <Step id="inrichten-afronden" title="Controle en afronden">
          <Item>De controle vat alle stappen samen.</Item>
          <Item>Afronden kan zodra de naam en de korte naam van de club zijn ingevuld.</Item>
        </Step>
      </div>
    </section>
  );
}
