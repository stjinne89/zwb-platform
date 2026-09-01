import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const LINK =
  "inline-flex min-h-10 items-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent";

export function ZrlContextNotice({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <h2 className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" />
        Controleer je ZRL-opbouw
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/zwbeter-worden/doelen" className={LINK}>
          Doel bekijken
        </Link>
        <Link href="/zwbeter-worden/jaarplan" className={LINK}>
          Jaarplan bekijken
        </Link>
      </div>
    </section>
  );
}
