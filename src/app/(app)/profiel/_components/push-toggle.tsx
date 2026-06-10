"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpLink } from "@/components/app-ui";
import {
  deletePushSubscription,
  savePushSubscription,
  updateNotificationPreferences,
} from "../_actions/push";

type Props = {
  vapidPublicKey: string | null;
  initialPreferences: {
    on_new_event: boolean;
    on_live_started: boolean;
    on_new_badge: boolean;
    on_training_plan: boolean;
    on_event_reminder: boolean;
    on_admin_broadcast: boolean;
  };
  hasSubscriptionInDb: boolean;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) buffer[i] = rawData.charCodeAt(i);
  return buffer;
}

export function PushToggle({
  vapidPublicKey,
  initialPreferences,
  hasSubscriptionInDb,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [subscribed, setSubscribed] = useState(hasSubscriptionInDb);
  const [pending, setPending] = useState(false);
  const [savingPrefs, startSavingPrefs] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Browser-only capability check. Keeping the initial server/client render
  // identical avoids hydration text mismatches in production.
  useEffect(() => {
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  async function enable() {
    if (!vapidPublicKey) {
      setError(
        "Push-notificaties zijn nog niet geconfigureerd op de server (VAPID-keys ontbreken).",
      );
      return;
    }
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Toestemming voor notificaties is geweigerd.");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/sw-push.js",
      );
      // Wacht tot 'm actief is.
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast naar BufferSource — TS narrowt anders te streng op
        // Uint8Array<SharedArrayBuffer> vs ArrayBuffer.
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!subscription.endpoint || !p256dh || !auth) {
        throw new Error("Meldingen konden niet worden ingesteld.");
      }

      const res = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent,
      });
      if (!res.ok) throw new Error(res.error);

      setSubscribed(true);
      setMessage("Notificaties zijn aan op dit apparaat.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon niet aanmelden.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(
        "/sw-push.js",
      );
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notificaties uit op dit apparaat.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Afmelden faalde.");
    } finally {
      setPending(false);
    }
  }

  function onPrefSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    setError(null);
    startSavingPrefs(async () => {
      const res = await updateNotificationPreferences(fd);
      if (!res.ok) setError(res.error);
      else setMessage("Voorkeuren opgeslagen.");
    });
  }

  if (!supported) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Notificaties
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Push werkt niet in deze browser.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Notificaties
        </h2>
        <HelpLink href="/hulp#privacy" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {subscribed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={disable}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BellOff className="size-4" />
            )}
            Notificaties uit op dit apparaat
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={enable}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bell className="size-4" />
            )}
            Notificaties aanzetten op dit apparaat
          </Button>
        )}
        {permission === "denied" && (
          <span className="text-xs text-destructive">
            Geblokkeerd in browser-instellingen.
          </span>
        )}
      </div>

      <form onSubmit={onPrefSubmit} className="space-y-2 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">
          Waarvoor wil je een melding?
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="on_new_event"
            defaultChecked={initialPreferences.on_new_event}
          />
          Nieuw event op de kalender
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="on_live_started"
            defaultChecked={initialPreferences.on_live_started}
          />
          Iemand start een live-rit waar ik mee fiets
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="on_new_badge"
            defaultChecked={initialPreferences.on_new_badge}
          />
          Ik haal een nieuwe badge
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="on_training_plan"
            defaultChecked={initialPreferences.on_training_plan}
          />
          Trainingsschema of coach-update
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="on_event_reminder"
            defaultChecked={initialPreferences.on_event_reminder}
          />
          Herinnering 24u en 2u voor een event (als ik ja/misschien zeg)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="on_admin_broadcast"
            defaultChecked={initialPreferences.on_admin_broadcast}
          />
          Aankondiging vanuit het bestuur
        </label>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={savingPrefs}>
            {savingPrefs ? "Opslaan…" : "Voorkeuren opslaan"}
          </Button>
        </div>
      </form>

      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
