"use client";

// Het doelformulier, met de opslaanknop en de foutmelding van de server.
//
// Tot 2026-10-18 hing createTrainingGoal via formAction() rechtstreeks aan het
// formulier. Die cast gooide het antwoord weg, dus een geweigerd doel (geen tijd
// per dag ingevuld) zag eruit als een gelukte opslag: de knop deed "Bezig…", het
// formulier leegde zich en er stond nergens een doel. Een lid wees zijn trainer
// aan, "maakte een doel" en de trainer zag niets.
//
// Verzenden gaat daarom via onSubmit in plaats van de action-prop: React leegt
// een formulier na elke action, ook een geweigerde, en dan moet het lid alles
// opnieuw invullen. Nu blijft het staan tot het doel er echt is.
//
// De knop staat uit tijdens het verzenden: vijf van de twintig doelen in de
// database waren ooit dubbelklikken, telkens twee seconden na de vorige. De
// server weigert een herhaling ook (zie createTrainingGoal).

import { useActionState, useRef, startTransition, type ReactNode } from "react";
import { createTrainingGoal } from "../../_actions";

type GoalFormState = { error: string | null };

export function GoalForm({ children }: { children: ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState<GoalFormState, FormData>(
    async (_previous, formData) => {
      const result = await createTrainingGoal(formData);
      if (!result.ok) return { error: result.error };
      formRef.current?.reset();
      return { error: null };
    },
    { error: null },
  );

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => dispatch(formData));
      }}
      className="rounded-lg border bg-card p-5"
    >
      {children}
      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Doel opslaan"}
      </button>
    </form>
  );
}
