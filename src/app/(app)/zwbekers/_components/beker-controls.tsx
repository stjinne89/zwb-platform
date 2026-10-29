"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CONGRATS_MAX, NOTE_MAX } from "@/lib/zwbekers/nomination";
import { congratulate, removeCongrats, reviewBeker, withdrawBeker } from "../_actions";

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Toekennen of terugsturen, voor wie keurt; terugsturen vraagt om een reden. */
export function ReviewPanel({ bekerId }: { bekerId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const decide = (decision: "toegekend" | "afgewezen") =>
    start(async () => {
      setError(null);
      const reply = await reviewBeker(bekerId, decision, note);
      if (!reply.ok) return setError(reply.error);
      router.refresh();
    });
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Notitie voor wie voordroeg</span>
        <textarea className={`${field} min-h-20`} value={note} maxLength={NOTE_MAX} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => decide("toegekend")} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Toekennen
        </Button>
        <Button type="button" variant="outline" onClick={() => decide("afgewezen")} disabled={pending || !note.trim()}>
          Terugsturen
        </Button>
      </div>
    </div>
  );
}

/** Aanpassen en intrekken voor wie voordroeg; verwijderen voor wie keurt. */
/**
 * Aanpassen, en weghalen: `intrekken` voor wie voordroeg (een open voordracht),
 * `verwijderen` voor wie keurt (ook uit de kast).
 */
export function BekerActions({
  bekerId,
  canEdit,
  remove: removal,
}: {
  bekerId: string;
  canEdit: boolean;
  remove: "intrekken" | "verwijderen" | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!canEdit && !removal) return null;
  const withdraw = removal === "intrekken";
  const remove = () => {
    const question = withdraw ? "Deze voordracht intrekken?" : "Deze beker uit de kast en van de profielen halen?";
    if (!window.confirm(question)) return;
    start(async () => {
      setError(null);
      const reply = await withdrawBeker(bekerId);
      if (!reply.ok) return setError(reply.error);
      router.push(withdraw ? "/zwbekers/voordrachten" : "/zwbekers");
      router.refresh();
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Link href={`/zwbekers/${bekerId}/bewerken`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Aanpassen
        </Link>
      )}
      {removal && (
        <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending} className="text-destructive hover:text-destructive">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
          {withdraw ? "Intrekken" : "Verwijderen"}
        </Button>
      )}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}

export type CongratsItem = {
  id: string;
  author: { id: string; name: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
};

/** Felicitaties onder een toegekende beker: lezen, schrijven en je eigen weghalen. */
export function Congrats({
  bekerId,
  items,
  viewerId,
  canModerate,
}: {
  bekerId: string;
  items: CongratsItem[];
  viewerId: string;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      setError(null);
      const reply = await congratulate(bekerId, body);
      if (!reply.ok) return setError(reply.error);
      setBody("");
      router.refresh();
    });
  const remove = (id: string) =>
    start(async () => {
      const reply = await removeCongrats(id);
      if (!reply.ok) return setError(reply.error);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <Avatar name={item.author.name} url={item.author.avatarUrl} />
              <div className="min-w-0 flex-1 rounded-lg bg-muted/60 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  {item.author.id ? (
                    <Link href={`/leden/${item.author.id}`} className="text-sm font-medium hover:underline">
                      {item.author.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{item.author.name}</span>
                  )}
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </time>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm">{item.body}</p>
                {(item.author.id === viewerId || canModerate) && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => remove(item.id)}
                    disabled={pending}
                  >
                    Weghalen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="block flex-1">
          <span className="sr-only">Felicitatie</span>
          <textarea
            className={`${field} min-h-11`}
            rows={2}
            placeholder="Gefeliciteerd!"
            value={body}
            maxLength={CONGRATS_MAX}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Feliciteren
        </Button>
      </form>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars komen van verschillende bronnen
    return <img src={url} alt="" className="size-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
