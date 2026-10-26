import { CheckCircle2, MapPinned, MessageSquare } from "lucide-react";
import {
  GARMIN_LIVETRACK_STEPS,
  WAHOO_LIVETRACK_STEPS,
  LIVETRACK_NOTES,
  RIDE_MESSAGE_GARMIN_STEPS,
  RIDE_MESSAGE_WAHOO_STEPS,
  RIDE_MESSAGE_NOTES,
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
        id="ritberichten"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <MessageSquare className="mt-0.5 size-5 shrink-0 text-primary" />
          <h2 className="font-semibold">Berichten op je fietscomputer</h2>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { title: "Garmin", steps: RIDE_MESSAGE_GARMIN_STEPS },
            { title: "Wahoo ELEMNT", steps: RIDE_MESSAGE_WAHOO_STEPS },
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
          {RIDE_MESSAGE_NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

    </>
  );
}
