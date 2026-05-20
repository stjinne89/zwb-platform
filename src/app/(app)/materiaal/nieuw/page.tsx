import { NewPostForm } from "./_form";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuwe post</h1>
        <p className="mt-1 text-muted-foreground">
          Schrijf in markdown — kopjes met <code>#</code>, lijstjes met <code>-</code>,
          links met <code>[tekst](url)</code>.
        </p>
      </header>
      <NewPostForm />
    </div>
  );
}
