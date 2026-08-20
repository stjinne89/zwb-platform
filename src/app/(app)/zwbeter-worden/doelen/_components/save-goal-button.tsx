"use client";

// De opslaanknop van het doelformulier.
//
// Stond hier een kale <button>, en dat leverde precies op wat je verwacht: vijf
// van de twintig doelen in de database zijn dubbelklikken, telkens twee seconden
// na de vorige. De server weigert een herhaling nu ook (zie createTrainingGoal),
// maar een knop die tijdens het verzenden gewoon blijft staan nodigt ertoe uit.

import { useFormStatus } from "react-dom";

export function SaveGoalButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
    >
      {pending ? "Bezig…" : "Doel opslaan"}
    </button>
  );
}
