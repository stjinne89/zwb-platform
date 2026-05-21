import { NewPostForm } from "./_form";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw item plaatsen</h1>
        <p className="mt-1 text-muted-foreground">
          Bied iets aan of plaats een vraag. Andere leden zien je item op
          Vraag en Aanbod en kunnen reageren.
        </p>
      </header>
      <NewPostForm />
    </div>
  );
}
