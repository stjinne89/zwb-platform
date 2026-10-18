import Link from "next/link";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Download,
  ExternalLink,
  CalendarPlus,
  Upload,
  UserCircle,
} from "lucide-react";
import { ConnectWithStrava } from "@/components/strava-brand";
import {
  INTERVALS_RIDE_STEPS,
  INTERVALS_RIDE_NOTES,
} from "../_data";

export function KoppelenHelp() {
  return (
    <>
      <section
        id="strava-rechten"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava opnieuw koppelen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              ZWB heeft activiteitenrecht nodig om je ritten, badges, cols,
              fietsen en statistieken bij te werken.
            </p>
          </div>
        </header>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <span>Ga naar Profiel of het dashboard en kies Opnieuw koppelen.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <span>Zet bij Strava het vinkje voor activiteiten aan.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <span>Start daarna op het dashboard een Strava-sync.</span>
          </li>
        </ol>
        <ConnectWithStrava reconnect className="mt-4" />
      </section>

      <section
        id="ritten-via-intervals"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Bike className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Ritten via intervals.icu</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Het aantal Strava-koppelingen is beperkt. Zonder Strava komen je
              ritten automatisch binnen via intervals.icu, gratis en voor bijna
              elk merk fietscomputer of trainingsapp.
            </p>
          </div>
        </header>

        <ol className="mt-4 space-y-3">
          {INTERVALS_RIDE_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {INTERVALS_RIDE_NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        <a
          href="https://intervals.icu/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          intervals.icu Settings
          <ExternalLink className="size-3.5" />
        </a>
      </section>

      <section
        id="strava-import"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava-ritten importeren zonder koppeling</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Geen plek voor een Strava-koppeling of wil je die niet gebruiken?
              Laat je ritten dan binnenkomen via intervals.icu (hierboven), of
              upload ze zelf op het dashboard: je hele historie in één keer via
              activities.csv, of ritten met hun spoor via GPX of FIT.
            </p>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              De koppeling haalt eerst de laatste vijf jaar op en daarna, beetje
              bij beetje, je oudere ritten. Records, badges, ZWBlokken en
              segmenten gaan pas over je hele historie als die helemaal binnen
              is.
            </p>
          </div>
        </header>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hele historie (activities.csv)</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>
                  Vraag op{" "}
                  <a
                    href="https://www.strava.com/athlete/download_my_account"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Strava.com je accountdownload
                  </a>{" "}
                  aan (Instellingen → Mijn account → Download of verwijder je
                  account → Verzoek je archief).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Strava mailt je (soms pas na een paar uur) een link naar een
                  ZIP-archief.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Pak de ZIP uit. Het bestand activities.csv staat in de
                  hoofdmap van het archief.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>
                  Upload activities.csv op het dashboard met Importeer ritten.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              De taal van je Strava-account maakt niet uit — Nederlandse,
              Engelse en andere kolomnamen worden herkend. Alleen fietsritten
              (ook virtueel, gravel, MTB en e-bike) worden geïmporteerd; de
              rest wordt automatisch overgeslagen. Opnieuw importeren kan
              altijd, ritten worden niet dubbel geteld.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Ritten met spoor (GPX)</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open je rit op Strava.com (website, niet de app).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Klik op het moersleutel-icoon (⋯) links en kies Exporteer
                  GPX.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Upload de GPX-bestanden op het dashboard met Importeer
                  ritten. Je kunt er meerdere tegelijk kiezen.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Gebruik de GPX van een gereden rit (met tijden), geen route-GPX.
              Afstand, hoogtemeters en rijtijd worden uit het bestand berekend.
              Met het spoor tellen cols, ZWB Segments en ZWBlokken mee, en meet
              ZWB je tijd op cols en uitgekozen segmenten. Die staat met GPS in
              de ranglijst.
              Staat de rit al binnen via activities.csv, dan krijgt die het
              spoor erbij. Dezelfde rit twee keer uploaden is geen probleem.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4 md:col-span-2">
            <h3 className="text-sm font-semibold">
              Alle ritten met spoor, ook Zwift (FIT)
            </h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>
                  Upload eerst activities.csv, zoals hierboven. Daar komen de
                  namen van je ritten uit.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Open in het uitgepakte archief de map activities. Daar staat
                  elke rit als bestand (.fit.gz of .gpx).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Kies met Importeer ritten alle bestanden in die map. Uitpakken
                  hoeft niet. Bij een grote map duurt dit een paar minuten; laat
                  het tabblad open.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Elke rit uit activities.csv krijgt zo zijn spoor. Zwift-ritten
              tellen daarna mee in de Zwift-werelden van ZWBlokken, buitenritten
              voor cols, ZWB Segments en ZWBlokken buiten. Andere sporten,
              ritten zonder GPS en TCX-bestanden worden overgeslagen. Een los
              FIT-bestand van Zwift, Garmin of Wahoo werkt ook.
            </p>
          </article>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://www.strava.com/athlete/download_my_account"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Download className="size-4 text-primary" />
            Strava-data downloaden
          </a>
          <Link
            href="/dashboard#strava-sync"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Upload className="size-4 text-primary" />
            Naar het dashboard
          </Link>
        </div>
      </section>

      <section
        id="externe-profielen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ExternalLink className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Doorklikken naar je andere profielen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Vul je ID&apos;s in op Profiel en er verschijnen knoppen naar
              ZwiftPower, ZwiftRacing.app, Strava en intervals.icu — op jouw
              profiel en op je ledenprofiel. Per ID kies je zelf of het zichtbaar
              is.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article
            id="zwift-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Zwift-ID</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in op my.zwift.com en open je profiel: het nummer in de
              adresbalk is je Zwift-ID. Staat ook in je ZwiftPower-adres, achter
              z=. Dit ene nummer verzorgt zowel ZwiftPower als
              ZwiftRacing.app.
            </p>
          </article>

          <article
            id="strava-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Strava</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Open je Strava-profiel in een browser. Het laatste stuk van het
              adres — strava.com/athletes/… — is wat je invult. Zowel het nummer
              als je gebruikersnaam werkt.
            </p>
          </article>

          <article
            id="intervals-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">intervals.icu</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Open in intervals.icu <strong className="text-foreground">Settings</strong>
              {" "}en daarna <strong className="text-foreground">Developer Settings</strong>.
              Daar staat je Athlete ID: een i gevolgd door cijfers. Vul dat
              i-nummer in. In de adresbalk staat het bij je eigen account niet
              altijd. Je gegevens daar zijn standaard privé, dus anderen zien
              alleen wat je vrijgeeft.
            </p>
          </article>
        </div>

        <Link
          href="/profiel?weergave=bewerken"
          className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
        >
          <UserCircle className="size-4 text-primary" />
          Naar je profiel
        </Link>
      </section>

      <section
        id="agenda"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <CalendarPlus className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWB in je eigen agenda</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Met een persoonlijke link zie je in je gewone agenda de events waar
              je ja op zei, de teamraces waarvoor je bent opgesteld en je eigen
              trainingen. Een training staat als hele dag, zonder tijd. Het werkt
              één kant op: wat je in je agenda verandert, komt niet terug in ZWB.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Apple Agenda en Outlook-app</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tik op Profiel bij Agenda-abonnement op{" "}
              <strong className="text-foreground">Apple Agenda / Outlook-app</strong>{" "}
              en bevestig het abonnement. Lukt dat niet, kopieer dan de link en
              kies in de app Nieuw agenda-abonnement (Apple) of Agenda toevoegen,
              Abonneren vanaf internet (Outlook).
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Google Agenda</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Kies <strong className="text-foreground">Google Agenda</strong> en
              bevestig met Toevoegen. Of kopieer de link en kies op
              calendar.google.com bij Andere agenda&apos;s het plusje en Via URL.
              Op de telefoon verschijnt hij daarna vanzelf in de Google
              Agenda-app.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Andere apps</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thunderbird, Proton Calendar, Samsung Agenda en de meeste andere
              agenda&apos;s kunnen zich abonneren op een internetagenda (ICS).
              Plak daar de gekopieerde link.
            </p>
          </article>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Je agenda-app bepaalt hoe vaak hij ververst. Apple en Outlook doen
              dat ongeveer elk uur tot elke paar uur, Google soms pas na een dag.
              Een verzet event kan daar dus even op de oude tijd staan.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Wie de link heeft, ziet je aanmeldingen en trainingen. Deel hem
              niet. Gedeeld per ongeluk? Kies Nieuwe link: de oude werkt dan niet
              meer, en je voegt de nieuwe opnieuw toe aan je agenda.
            </span>
          </li>
        </ul>

        <Link
          href="/profiel?weergave=bewerken#agenda"
          className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
        >
          <UserCircle className="size-4 text-primary" />
          Naar je agendalink
        </Link>
      </section>
    </>
  );
}
