import Link from "next/link";
import {
  CheckCircle2,
  MapPinned,
  Navigation,
  Smartphone,
  Zap,
} from "lucide-react";
import {
  GARMIN_LIVETRACK_STEPS,
  WAHOO_LIVETRACK_STEPS,
  LIVETRACK_NOTES,
  OWNTRACKS_STEPS,
  OWNTRACKS_QUALITY_TIPS,
} from "../_data";

export function LiveVolgenHelp() {
  return (
    <>
      <section
        id="livetrack"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <MapPinned className="mt-0.5 size-5 shrink-0 text-primary" />
          <h2 className="font-semibold">Live volgen met je Garmin of Wahoo</h2>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { title: "Garmin Edge", steps: GARMIN_LIVETRACK_STEPS },
            { title: "Wahoo ELEMNT", steps: WAHOO_LIVETRACK_STEPS },
          ].map((device) => (
            <div key={device.title} className="rounded-md border bg-background p-4">
              <h3 className="text-sm font-semibold">{device.title}</h3>
              <ol className="mt-3 space-y-3">
                {device.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {LIVETRACK_NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="owntracks"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <MapPinned className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Live tracking instellen (OwnTracks)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Volg deze stappen één keer goed, dan zie je elkaar betrouwbaar op
              de kaart tijdens een rit.
            </p>
          </div>
        </header>

        <ol className="mt-4 space-y-3">
          {OWNTRACKS_STEPS.map((step, index) => (
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

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Voor een strak spoor zonder gaten
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {OWNTRACKS_QUALITY_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Smartphone className="size-4 text-primary" />
                Belangrijkste instellingen
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Mode:</strong> Private HTTP
                </li>
                <li>
                  <strong className="text-foreground">URL:</strong> je
                  persoonlijke koppellink van Samen fietsen
                </li>
                <li>
                  <strong className="text-foreground">Locatie:</strong> Altijd +
                  precies/nauwkeurig
                </li>
                <li>
                  <strong className="text-foreground">Modus tijdens rit:</strong>{" "}
                  iPhone Actie · Android Beweging (strak spoor). Significant /
                  Grootte wijzigingen mag ook: zuiniger, iets minder nauwkeurig.
                </li>
              </ul>
            </div>
            <Link
              href="/live"
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Navigation className="size-4 text-primary" />
              Naar Samen fietsen
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
