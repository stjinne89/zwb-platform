"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarPlus, Check, Copy, RotateCw, ShieldOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

import { calendarFeedUrls, type CalendarFeedUrls } from "@/lib/calendar/feed-urls";
import {
  createCalendarFeedToken,
  revokeCalendarFeedToken,
} from "../_actions/calendar-feed";

const linkButton = buttonVariants({ variant: "outline", size: "sm" });

export type CalendarFeedStatus = {
  token: string;
  last_fetched_at: string | null;
};

export function CalendarFeed({ initial }: { initial: CalendarFeedStatus | null }) {
  const [status, setStatus] = useState(initial);
  const [urls, setUrls] = useState<CalendarFeedUrls | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // De link volgt het adres waarop het lid de app gebruikt; pas na de eerste
  // render bekend, zodat server en browser hetzelfde tonen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(status ? calendarFeedUrls(window.location.origin, status.token) : null);
  }, [status]);

  function create() {
    if (status && !window.confirm("De huidige link stopt dan met werken. Doorgaan?")) return;
    setError(null);
    startTransition(async () => {
      const res = await createCalendarFeedToken();
      if (!res.ok) setError(res.error);
      else setStatus({ token: res.token, last_fetched_at: null });
    });
  }

  function revoke() {
    if (!window.confirm("Je agenda krijgt dan geen ZWB-items meer. Doorgaan?")) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeCalendarFeedToken();
      if (!res.ok) setError(res.error);
      else setStatus(null);
    });
  }

  async function copy() {
    if (!urls) return;
    try {
      await navigator.clipboard.writeText(urls.https);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Kopiëren lukte niet. Selecteer de link handmatig.");
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Agenda-abonnement
        </h2>
      </header>

      {!status ? (
        <Button type="button" size="sm" onClick={create} disabled={pending}>
          <CalendarPlus className="size-4" />
          Zet ZWB in je agenda
        </Button>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              aria-label="Agendalink"
              value={urls?.https ?? ""}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!urls}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Gekopieerd" : "Kopieer"}
            </Button>
          </div>

          {urls && (
            <div className="flex flex-wrap gap-2">
              <a href={urls.webcal} className={linkButton}>
                Apple Agenda / Outlook-app
              </a>
              <a href={urls.google} target="_blank" rel="noreferrer" className={linkButton}>
                Google Agenda
              </a>
              <a href={urls.outlook} target="_blank" rel="noreferrer" className={linkButton}>
                Outlook.com
              </a>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {status.last_fetched_at
              ? `Laatst opgehaald ${new Date(status.last_fetched_at).toLocaleString("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                })}`
              : "Nog niet opgehaald"}
          </p>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={create} disabled={pending}>
              <RotateCw className="size-4" />
              Nieuwe link
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={revoke} disabled={pending}>
              <ShieldOff className="size-4" />
              Stoppen
            </Button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
