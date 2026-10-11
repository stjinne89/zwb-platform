"use client";

// De keuze watt, W/kg of % FTP, en de weergave die ernaar luistert.
//
// De layout van ZWBeter Worden leest de cookie en geeft hem als beginwaarde mee,
// zodat de eerste weergave al klopt. Omschakelen past de context meteen aan en
// schrijft de cookie voor de volgende keer; er hoeft niets opnieuw geladen te
// worden. Buiten een provider (bijvoorbeeld op het dashboard) is alles watt.
//
// Het gewicht komt uit de provider: dat van het lid zelf. Bekijkt een trainer een
// lid, dan zet <PowerWeight> daaromheen het gewicht van dat lid, want W/kg hoort
// bij de renner, niet bij wie er kijkt. Voor de FTP geldt hetzelfde: die rekent
// een bloksdoel om tussen watt en % FTP.

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  convertPowerText,
  formatPower,
  POWER_UNIT_COOKIE,
  type PowerUnit,
} from "@/lib/training/power-unit";
import { cn } from "@/lib/utils";

type PowerUnitState = {
  unit: PowerUnit;
  setUnit: (unit: PowerUnit) => void;
  weightKg: number | null;
  ftpWatts: number | null;
};

const PowerUnitContext = createContext<PowerUnitState>({
  unit: "w",
  setUnit: () => {},
  weightKg: null,
  ftpWatts: null,
});

export function PowerUnitProvider({
  initialUnit,
  weightKg,
  ftpWatts = null,
  children,
}: {
  initialUnit: PowerUnit;
  weightKg: number | null;
  ftpWatts?: number | null;
  children: ReactNode;
}) {
  const [unit, setUnitState] = useState<PowerUnit>(initialUnit);

  function setUnit(next: PowerUnit) {
    setUnitState(next);
    document.cookie = `${POWER_UNIT_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <PowerUnitContext.Provider value={{ unit, setUnit, weightKg, ftpWatts }}>
      {children}
    </PowerUnitContext.Provider>
  );
}

/** Het gewicht (en de FTP) van de renner om wie het gaat, voor alles hieronder. */
export function PowerWeight({
  weightKg,
  ftpWatts,
  children,
}: {
  weightKg: number | null;
  ftpWatts?: number | null;
  children: ReactNode;
}) {
  const parent = useContext(PowerUnitContext);
  return (
    <PowerUnitContext.Provider
      value={{ ...parent, weightKg, ftpWatts: ftpWatts === undefined ? parent.ftpWatts : ftpWatts }}
    >
      {children}
    </PowerUnitContext.Provider>
  );
}

export function usePowerUnit() {
  return useContext(PowerUnitContext);
}

/**
 * Een wattage in de gekozen eenheid. `weightKg` gaat voor op het gewicht uit de
 * context: een rit rekent met het gewicht van toen, als dat is vastgelegd.
 */
export function Power({ watts, weightKg }: { watts: number | null | undefined; weightKg?: number | null }) {
  const context = useContext(PowerUnitContext);
  return <>{formatPower(watts, context.unit, weightKg ?? context.weightKg)}</>;
}

/** Een doeltekst waarin het vermogen in de gekozen eenheid staat. */
export function PowerText({
  text,
  weightKg,
  ftpWatts,
}: {
  text: string;
  weightKg?: number | null;
  ftpWatts?: number | null;
}) {
  const context = useContext(PowerUnitContext);
  return (
    <>
      {convertPowerText(
        text,
        context.unit,
        weightKg ?? context.weightKg,
        ftpWatts ?? context.ftpWatts,
      )}
    </>
  );
}

/**
 * `percent` zet % FTP erbij. Dat hoort alleen waar bloksdoelen staan; bij de
 * teams bestaat het niet en telt die keuze daar als watt.
 */
export function PowerUnitToggle({
  className,
  percent = false,
}: {
  className?: string;
  percent?: boolean;
}) {
  const context = useContext(PowerUnitContext);
  const { setUnit } = context;
  const unit: PowerUnit = !percent && context.unit === "pct" ? "w" : context.unit;
  const options: Array<{ value: PowerUnit; label: string }> = [
    { value: "w", label: "Watt" },
    { value: "wkg", label: "W/kg" },
    ...(percent ? [{ value: "pct" as const, label: "% FTP" }] : []),
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Vermogen tonen in"
      className={cn("inline-flex rounded-md border bg-background p-0.5", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={unit === option.value}
          onClick={() => setUnit(option.value)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition",
            unit === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
