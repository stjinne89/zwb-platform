import { EventForm } from "./_form";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw event</h1>
        <p className="mt-1 text-muted-foreground">
          Plan een rit, race of social. GPX is optioneel — als je er één
          toevoegt, rekenen we afstand en hoogtemeters automatisch uit.
        </p>
      </header>
      <EventForm />
    </div>
  );
}
