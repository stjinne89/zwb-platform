import { NewPostForm } from "./_form";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw bericht plaatsen</h1>
        <p className="mt-1 text-muted-foreground">
          Bied iets aan, zoek materiaal, stel een vraag of deel een tip met de
          ZWB-community.
        </p>
      </header>
      <NewPostForm />
    </div>
  );
}
