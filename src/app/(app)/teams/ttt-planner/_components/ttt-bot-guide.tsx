// Handleiding voor de TTT-bot, inklapbaar onderaan de TTT Planner (keuze van de
// eigenaar, 2026-11-17: bij de planner en niet op /hulp). Geschreven op
// groep 8-niveau, zodat een lid de bot zonder hulp kan installeren. Het
// installatiebestand staat in public/downloads en haalt bot/installeren.ps1 van
// GitHub.

import type { ReactNode } from "react";
import { Bot, ChevronDown, Download } from "lucide-react";

const DOWNLOAD = "/downloads/ZWB-TTT-bot-installeren.bat";

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2 text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>;
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

export function TttBotGuide() {
  return (
    <details id="ttt-bot" className="group scroll-mt-20 rounded-lg border bg-card/90">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold transition hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <Bot className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="flex-1">TTT-bot installeren</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>

      <div className="space-y-5 px-4 pb-5">
        <p className="text-sm text-muted-foreground">
          De TTT-bot zit met je ploeg in een spraakkanaal op Discord. Hij zegt wie op kop moet,
          hoeveel watt en hoe lang. Kijkt Sauce for Zwift mee, dan hoort hij ook wie er echt op
          kop rijdt en wie er lost.
        </p>

        <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Wat heb je nodig?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Een Windows-pc die tijdens de race aanstaat. Het mag de pc zijn waarop je Zwift rijdt.</li>
            <li>Een Discord-account.</li>
            <li>Iemand die op onze Discord-server bots mag toevoegen (een beheerder).</li>
            <li>Ongeveer een kwartier.</li>
          </ul>
        </div>

        <ol className="space-y-5">
          <Step number={1} title="Installeer Sauce for Zwift">
            <p>
              Sauce laat de bot zien wat er in Zwift gebeurt. Download het gratis op{" "}
              <Link href="https://www.sauce.llc">sauce.llc</Link> en installeer het op de pc
              waarop je Zwift rijdt.
            </p>
            <p>
              Open Sauce en kijk bij <strong>Instellingen</strong> of de <strong>Web Server</strong> aan
              staat. Laat de poort op 1080 staan.
            </p>
            <p>Zonder Sauce werkt de bot ook. Dan roept hij alleen de kopbeurten op de klok om.</p>
          </Step>

          <Step number={2} title="Maak je eigen Discord-bot">
            <p>
              Iedereen maakt een eigen bot. Twee bots met dezelfde sleutel zitten elkaar in de weg.
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Ga naar <Link href="https://discord.com/developers/applications">discord.com/developers</Link>{" "}
                en log in met je Discord-account.
              </li>
              <li>
                Klik op <strong>New Application</strong>. Geef je bot een naam, bijvoorbeeld{" "}
                <em>TTT-bot</em> met de naam van je team erachter.
              </li>
              <li>
                Klik links op <strong>Bot</strong> en dan op <strong>Reset Token</strong>. Kopieer de
                lange code die je ziet. Dat is je <strong>token</strong>.
              </li>
              <li>
                Bewaar het token goed, bijvoorbeeld in een kladblok. Het werkt als een wachtwoord:
                deel het met niemand.
              </li>
            </ol>
          </Step>

          <Step number={3} title="Laat je bot toevoegen aan de Discord-server">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Klik links op <strong>OAuth2</strong>. Zet bij <strong>Scopes</strong> een vinkje bij{" "}
                <Code>bot</Code> en <Code>applications.commands</Code>.
              </li>
              <li>
                Er komen nu rechten bij. Vink <strong>Send Messages</strong>, <strong>Connect</strong> en{" "}
                <strong>Speak</strong> aan.
              </li>
              <li>Kopieer de link onderaan de pagina.</li>
              <li>
                Stuur die link naar een beheerder van de Discord-server. Die opent hem en kiest de
                server. Dan staat je bot erin.
              </li>
            </ol>
          </Step>

          <Step number={4} title="Installeer de bot op je pc">
            <a
              href={DOWNLOAD}
              download
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Download className="size-4" aria-hidden />
              Installatiebestand downloaden
            </a>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Dubbelklik op het bestand dat je hebt gedownload.</li>
              <li>
                Zegt Windows dat het je pc heeft beschermd? Klik dan op <strong>Meer info</strong> en
                daarna op <strong>Toch uitvoeren</strong>.
              </li>
              <li>
                Er gaat een zwart venster open dat alles voor je installeert. Vraagt Windows of het
                iets mag installeren, klik dan op <strong>Ja</strong>.
              </li>
              <li>
                Vraagt het venster om je token? Klik met de <strong>rechtermuisknop</strong> in het
                venster om het te plakken, en druk op Enter.
              </li>
              <li>
                Daarna vraagt het of Zwift en Sauce op deze pc staan. Typ <Code>j</Code> en druk op
                Enter. Staan ze op een andere pc, typ dan <Code>n</Code> en het IP-adres van die pc.
              </li>
              <li>
                Staat er <strong>Klaar!</strong>? Dan staat op je bureaublad een snelkoppeling{" "}
                <strong>TTT-bot</strong>.
              </li>
            </ol>
            <p>
              De installatie zet ook de Sauce-mod <strong>ZWB ZRL Live</strong> klaar. Die laat
              tijdens een ZRL-race de puntenstand zien. Start Sauce opnieuw en zet hem aan bij{" "}
              <strong>Instellingen</strong> → <strong>Mods</strong>.
            </p>
          </Step>

          <Step number={5} title="Op de racedag">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Dubbelklik op <strong>TTT-bot</strong> op je bureaublad. Laat het zwarte venster de
                hele race open. Staat er <em>Ingelogd als</em>, dan is de bot er.
              </li>
              <li>
                Laad het plan. Klik op{" "}
                <Link href="https://zwiftgopher.com/TTT">zwiftgopher.com/TTT</Link> op{" "}
                <strong>Export Link</strong> en typ in Discord <Code>/ttt plan</Code>. Of open je plan
                in de TTT Planner, klik op <strong>Botlink</strong> en plak de link achter{" "}
                <Code>/ttt plan</Code>.
              </li>
              <li>
                Ga in het spraakkanaal van je ploeg zitten en typ <Code>/ttt start</Code>.
              </li>
              <li>Laat Zwift meekijken met iemand uit je ploeg.</li>
              <li>
                Bij een klim druk je op <strong>Klim</strong>. Dan rijdt iedereen zijn eigen tempo en
                zwijgt de bot. Boven druk je op <strong>Hervat rotatie</strong>.
              </li>
              <li>Na de finish stopt de bot vanzelf. Je kunt ook op <strong>Stop</strong> drukken.</li>
            </ol>
          </Step>
        </ol>

        <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Werkt het niet?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>De bot reageert niet.</strong> Kijk of het zwarte venster nog open is. Is het
              dicht, dubbelklik dan opnieuw op TTT-bot.
            </li>
            <li>
              <strong>Er staat dat Discord het token weigert.</strong> Maak bij <strong>Bot</strong>{" "}
              een nieuw token met Reset Token. Open dan het bestand <Code>.env</Code> in de map{" "}
              <Code>%LOCALAPPDATA%\ZWB-TTT-bot</Code> met Kladblok en zet het nieuwe token achter{" "}
              <Code>DISCORD_TOKEN=</Code>.
            </li>
            <li>
              <strong>Je ziet geen /ttt in Discord.</strong> Je bot is nog niet aan de server
              toegevoegd. Zie stap 3.
            </li>
            <li>
              <strong>De bot hoort niet wie er op kop rijdt.</strong> Kijk of Sauce open is en of Zwift
              meekijkt met iemand uit je ploeg.
            </li>
            <li>
              <strong>Een nieuwe versie?</strong> Dubbelklik nog een keer op het installatiebestand.
              Je token blijft bewaard.
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}
