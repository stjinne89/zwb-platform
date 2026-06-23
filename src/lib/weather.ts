// Open-Meteo wind+temperature forecast voor een lat/lon op een specifiek
// UTC-uur. Gratis, geen API-key nodig. Forecast tot 16 dagen vooruit.
// Bron: https://open-meteo.com/en/docs

export type WindForecast = {
  windSpeedKmh: number;
  windGustKmh: number | null;
  windDirectionFrom: number; // graden (0=N, 90=O, 180=Z, 270=W) — waar de wind vandaan komt
  temperatureC: number | null;
  precipitationMm: number | null;
  matchedHourUtc: string;
};

export async function fetchWindForecast(
  lat: number,
  lon: number,
  whenUtc: Date,
): Promise<WindForecast | null> {
  // Open-Meteo geeft alleen forecasts vanaf nu tot 16 dagen vooruit terug.
  const now = new Date();
  const sixteenDaysOut = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
  if (whenUtc < new Date(now.getTime() - 60 * 60 * 1000)) return null; // verleden
  if (whenUtc > sixteenDaysOut) return null;

  const targetHour = new Date(whenUtc);
  targetHour.setUTCMinutes(0, 0, 0);
  const targetIso = targetHour.toISOString().slice(0, 13) + ":00";

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set(
    "hourly",
    "wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,precipitation",
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("forecast_days", "16");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      next: { revalidate: 1800 }, // cache 30 min
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  type ApiResp = {
    hourly?: {
      time?: string[];
      wind_speed_10m?: number[];
      wind_gusts_10m?: number[];
      wind_direction_10m?: number[];
      temperature_2m?: number[];
      precipitation?: number[];
    };
  };

  const data = (await res.json()) as ApiResp;
  const times = data.hourly?.time ?? [];
  const idx = times.findIndex((t) => t === targetIso || t.startsWith(targetIso.slice(0, 13)));
  if (idx < 0) return null;

  return {
    windSpeedKmh: data.hourly?.wind_speed_10m?.[idx] ?? 0,
    windGustKmh: data.hourly?.wind_gusts_10m?.[idx] ?? null,
    windDirectionFrom: data.hourly?.wind_direction_10m?.[idx] ?? 0,
    temperatureC: data.hourly?.temperature_2m?.[idx] ?? null,
    precipitationMm: data.hourly?.precipitation?.[idx] ?? null,
    matchedHourUtc: times[idx],
  };
}

export type HourForecast = {
  timeUtc: string;
  windSpeedKmh: number;
  windGustKmh: number | null;
  windDirectionFrom: number;
  temperatureC: number | null;
  precipitationMm: number | null;
};

export type RoutePointForecast = {
  lat: number;
  lon: number;
  km: number;
  bearing: number;
  hours: HourForecast[];
};

type RouteSamplePoint = { lat: number; lon: number; km: number; bearing: number };

/**
 * Haalt in ÉÉN Open-Meteo-call de volledige uurforecast op voor meerdere
 * routepunten (komma-gescheiden coords). De client mapt zelf doorkomsttijd → uur,
 * dus we geven de hele uurreeks per punt terug. Null bij verleden/buiten 16 dagen/fout.
 */
export async function fetchRouteForecast(
  samples: RouteSamplePoint[],
  startUtc: Date,
): Promise<RoutePointForecast[] | null> {
  if (samples.length === 0) return null;
  const now = new Date();
  const sixteenDaysOut = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
  if (startUtc < new Date(now.getTime() - 60 * 60 * 1000)) return null;
  if (startUtc > sixteenDaysOut) return null;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", samples.map((s) => s.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", samples.map((s) => s.lon.toFixed(4)).join(","));
  url.searchParams.set(
    "hourly",
    "wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,precipitation",
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("forecast_days", "16");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  type Hourly = {
    time?: string[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    wind_direction_10m?: number[];
    temperature_2m?: number[];
    precipitation?: number[];
  };
  type Block = { hourly?: Hourly };

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  // Bij meerdere coords geeft Open-Meteo een array terug, bij één een object.
  const blocks: Block[] = Array.isArray(data) ? (data as Block[]) : [data as Block];
  if (blocks.length !== samples.length) return null;

  return samples.map((sample, i) => {
    const h = blocks[i]?.hourly;
    const times = h?.time ?? [];
    const hours: HourForecast[] = times.map((t, idx) => ({
      timeUtc: t,
      windSpeedKmh: h?.wind_speed_10m?.[idx] ?? 0,
      windGustKmh: h?.wind_gusts_10m?.[idx] ?? null,
      windDirectionFrom: h?.wind_direction_10m?.[idx] ?? 0,
      temperatureC: h?.temperature_2m?.[idx] ?? null,
      precipitationMm: h?.precipitation?.[idx] ?? null,
    }));
    return { lat: sample.lat, lon: sample.lon, km: sample.km, bearing: sample.bearing, hours };
  });
}

/**
 * Berekent of de wind tegen-/mee-/zijwind is t.o.v. de rijrichting.
 * @param windFromDeg waar wind vandaan komt (0=N, 90=O, 180=Z, 270=W)
 * @param rideBearingDeg waar je naartoe rijdt (0=N, 90=O, 180=Z, 270=W)
 */
export function classifyWind(
  windFromDeg: number,
  rideBearingDeg: number,
  windSpeedKmh: number,
): {
  category: "tegenwind" | "meewind" | "zijwind" | "stil";
  relativeAngle: number;
} {
  if (windSpeedKmh < 5) return { category: "stil", relativeAngle: 0 };
  // Diff tussen waar wind vandaan komt en waar je naartoe rijdt.
  // 0° = wind komt uit jouw rijrichting → tegenwind
  // 180° = wind komt van achter → meewind
  const diff = Math.abs(((windFromDeg - rideBearingDeg + 540) % 360) - 180);
  if (diff < 45) return { category: "tegenwind", relativeAngle: diff };
  if (diff > 135) return { category: "meewind", relativeAngle: diff };
  return { category: "zijwind", relativeAngle: diff };
}

/** Compass-letter voor weergave (NNO, ZW, etc.). */
export function compassDirection(deg: number): string {
  const dirs = ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO", "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
