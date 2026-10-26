import {
  Bike,
  CheckCircle2,
  CircleHelp,
  Download,
  Lightbulb,
  Monitor,
  Navigation,
  Zap,
} from "lucide-react";
import {
  WAHOO_STEPS,
  ZWIFT_STEPS,
  ZWIFT_NOTES,
  ZWIFT_MATCH_FACTORS,
  ZWIFT_MATCH_NOTES,
  OUTDOOR_ROUTE_NOTES,
} from "../_data";

export function WorkoutsHelp() {
  return (
    <>
      <section
        id="fit-export"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              Workout op je fietscomputer (Wahoo / Garmin)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Een gepubliceerd schema staat automatisch in intervals.icu. Hoe je
              het op je fietscomputer krijgt, verschilt per merk.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="size-4 text-primary" />
              Wahoo ELEMNT / BOLT / ROAM
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Wahoo importeert geplande workouts <strong>niet</strong> uit een
              los bestand. Dan krijg je de melding &ldquo;geen geldige
              GPX&rdquo;, omdat de app het als route probeert te lezen. Geplande
              workouts komen binnen via een koppeling. Koppel intervals.icu één
              keer aan Wahoo, daarna synct het schema vanzelf:
            </p>
            <ol className="mt-3 space-y-3">
              {WAHOO_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Download className="size-4 text-primary" />
                Garmin
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Klik bij de workout op <strong>Download FIT</strong> en
                    importeer het bestand in Garmin Connect (of zet het in de
                    map NewFiles op het toestel).
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Of koppel intervals.icu aan Garmin Connect in de
                    intervals-instellingen, dan synct het schema ook automatisch.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CircleHelp className="size-4 text-primary" />
                Goed om te weten
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                De <strong>Download FIT</strong>-knop is bedoeld voor Garmin en
                andere apparaten die losse workout-bestanden accepteren. Voor
                Wahoo gebruik je de cloudkoppeling hierboven. Wordt een training
                aangepast, dan staat de nieuwe versie vanzelf in intervals.icu;
                een FIT-bestand download je dan opnieuw.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="zwift-workout"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Monitor className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Workout in Zwift</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Koppel Zwift één keer aan intervals.icu, daarna staat de training
              van de dag vanzelf in Zwift klaar.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Zwift koppelen
            </h3>
            <ol className="mt-3 space-y-3">
              {ZWIFT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4 text-primary" />
              Goed om te weten
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_NOTES.map((note) => (
                <li key={note} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="zwift-voorstellen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Zwift-events bij je training</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bij een geplande training kunnen maximaal drie Zwift-events staan
              die erbij passen, met een percentage erachter.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Waar het percentage op slaat
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_MATCH_FACTORS.map((factor) => (
                <li key={factor.title} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <strong className="text-foreground">{factor.title}</strong>{" "}
                    {factor.text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Weten we iets niet, dan telt dat punt niet mee in plaats van dat
              het aftrek geeft. Een event scoort dus nooit lager omdat Zwift een
              veld niet meestuurt; het is dan alleen op minder punten
              vergeleken.
            </p>
          </div>

          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4 text-primary" />
              Goed om te weten
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_MATCH_NOTES.map((note) => (
                <li key={note} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="routevoorstellen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Navigation className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Rondjes voor buiten</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bij een geplande training kun je drie rondjes laten voorstellen
              vanaf je eigen vertrekpunt, afgestemd op de duur, de intensiteit en
              de wind van die dag.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2">
          {OUTDOOR_ROUTE_NOTES.map((note) => (
            <li key={note} className="flex gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
