import { Wind } from "lucide-react";
import {
  classifyWind,
  compassDirection,
  type WindForecast,
} from "@/lib/weather";

const CATEGORY_LABEL = {
  tegenwind: "Tegenwind",
  meewind: "Meewind",
  zijwind: "Zijwind",
  stil: "Stil",
};

const CATEGORY_CLASS = {
  tegenwind: "bg-destructive/15 text-destructive border-destructive/30",
  meewind: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  zijwind: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  stil: "bg-secondary text-secondary-foreground border-foreground/15",
};

export function WindSummary({
  forecast,
  rideBearing,
}: {
  forecast: WindForecast;
  rideBearing: number | null;
}) {
  const cls =
    rideBearing !== null
      ? classifyWind(forecast.windDirectionFrom, rideBearing, forecast.windSpeedKmh)
      : null;

  const compass = compassDirection(forecast.windDirectionFrom);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Wind className="size-4 text-primary" />
            Weer + wind bij start
          </h3>
        </div>
        {cls && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${CATEGORY_CLASS[cls.category]}`}
            title={
              cls.category === "stil"
                ? "Wind onder 5 km/h — verwaarloosbaar"
                : `${Math.round(cls.relativeAngle)}° van rijrichting`
            }
          >
            {CATEGORY_LABEL[cls.category]}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
        {/* Wind-pijl die de richting waar wind vandaan komt visualiseert */}
        <div className="flex items-center justify-center">
          <svg
            viewBox="0 0 80 80"
            className="size-20"
            aria-label={`Wind uit ${compass}`}
          >
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
            <text x="40" y="13" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">N</text>
            <text x="68" y="44" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">O</text>
            <text x="40" y="73" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">Z</text>
            <text x="13" y="44" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">W</text>
            {/* Wind blaast IN de richting tegenovergesteld aan windFrom */}
            <g transform={`rotate(${forecast.windDirectionFrom + 180}, 40, 40)`}>
              <path
                d="M40 18 L46 32 L42 32 L42 56 L38 56 L38 32 L34 32 Z"
                fill="var(--color-zwb-gold)"
                stroke="var(--color-zwb-petrol-dark)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Windsnelheid</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {Math.round(forecast.windSpeedKmh)} km/h
              {forecast.windGustKmh && forecast.windGustKmh > forecast.windSpeedKmh + 4 ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  · vlagen {Math.round(forecast.windGustKmh)}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Vanuit</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {compass}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                · {Math.round(forecast.windDirectionFrom)}°
              </span>
            </dd>
          </div>
          {forecast.temperatureC !== null && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Temperatuur</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {forecast.temperatureC.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}°C
              </dd>
            </div>
          )}
          {forecast.precipitationMm !== null && forecast.precipitationMm > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Neerslag</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {forecast.precipitationMm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} mm
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
