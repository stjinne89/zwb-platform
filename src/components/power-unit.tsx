"use client";

// De keuze watt of W/kg, en de weergave die ernaar luistert.
//
// De layout van ZWBeter Worden leest de cookie en geeft hem als beginwaarde mee,
// zodat de eerste weergave al klopt. Omschakelen past de context meteen aan en
// schrijft de cookie voor de volgende keer; er hoeft niets opnieuw geladen te
// worden. Buiten een provider (bijvoorbeeld op het dashboard) is alles watt.
//
// Het gewicht komt uit de provider: dat van het lid zelf. Bekijkt een trainer een
// lid, dan zet <PowerWeight> daaromheen het gewicht van dat lid, want W/kg hoort
// bij de renner, niet bij wie er kijkt.

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
};

const PowerUnitContext = createContext<PowerUnitState>({
  unit: "w",
  setUnit: () => {},
  weightKg: null,
});

export function PowerUnitProvider({
  initialUnit,
  weightKg,
  children,
}: {
  initialUnit: PowerUnit;
  weightKg: number | null;
  children: ReactNode;
}) {
  const [unit, setUnitState] = useState<PowerUnit>(initialUnit);

  function setUnit(next: PowerUnit) {
    setUnitState(next);
    document.cookie = `${POWER_UNIT_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <PowerUnitContext.Provider value={{ unit, setUnit, weightKg }}>
      {children}
    </PowerUnitContext.Provider>
  );
}

/** Het gewicht van de renner om wie het gaat, voor alles hieronder. */
export function PowerWeight({
  weightKg,
  children,
}: {
  weightKg: number | null;
  children: ReactNode;
}) {
  const parent = useContext(PowerUnitContext);
  return (
    <PowerUnitContext.Provider value={{ ...parent, weightKg }}>{children}</PowerUnitContext.Provider>
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

/** Een doeltekst waarin de wattages in de gekozen eenheid staan. */
export function PowerText({ text, weightKg }: { text: string; weightKg?: number | null }) {
  const context = useContext(PowerUnitContext);
  return <>{convertPowerText(text, context.unit, weightKg ?? context.weightKg)}</>;
}

export function PowerUnitToggle({ className }: { className?: string }) {
  const { unit, setUnit } = useContext(PowerUnitContext);
  const options: Array<{ value: PowerUnit; label: string }> = [
    { value: "w", label: "Watt" },
    { value: "wkg", label: "W/kg" },
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
