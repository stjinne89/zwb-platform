import Link from "next/link";
import {
  Navigation,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  START_STEPS,
  OVERVIEW,
} from "../_data";

export function BeginnenHelp() {
  return (
    <>
      <section className="grid gap-3 md:grid-cols-4">
        {START_STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="jersey-panel rounded-lg border bg-card/90 p-4 transition hover:border-primary/40"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <h2 className="mt-3 font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border bg-card/90 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Net begonnen of werkt iets niet meer?</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Loop de welkomstrondleiding opnieuw door. Die neemt je stap voor
              stap mee langs je profiel, de Strava-/intervals-koppeling en
              meldingen.
            </p>
            <Link
              href="/welkom"
              className="mt-3 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Navigation className="size-4 text-primary" />
              Open de welkomstrondleiding
            </Link>
          </div>
        </div>
      </section>

      <section
        id="webapp-installeren"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWB als app op je telefoon</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Zet de webapp op je beginscherm voor snelle toegang zonder App
              Store of Play Store.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">iPhone of iPad</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open ZWB in Safari.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Tik op Delen.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Kies Zet op beginscherm en daarna Voeg toe.</span>
              </li>
            </ol>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Android</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open ZWB in Chrome.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Tik op het menu met drie puntjes.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Kies Toevoegen aan startscherm of Installeren.</span>
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Wat vind je waar?</h2>
        <p className="text-sm text-muted-foreground">
          Een korte wegwijzer door de app. Tik op een onderdeel om er meteen
          naartoe te gaan.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border bg-card/90 p-3 transition hover:border-primary/40"
            >
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
