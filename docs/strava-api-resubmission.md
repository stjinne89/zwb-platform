# Strava — herindiening capaciteitsverhoging

Dit document heeft twee delen: de **checklist** (wat er af moet vóór we opnieuw
indienen, in het Nederlands) en de **notitie** die letterlijk naar Strava gaat, in
het Engels.

Strava's afwijzing noemde drie voorwaarden:

1. De app moet zijn huidige atletencapaciteit bereikt hebben.
2. Webhooks in plaats van polling.
3. Stale en gedeauthoriseerde atleten actief beheren.

Punt 2 en 3 zijn gebouwd. Punt 1 moet gemeten worden — en let op: het opruimen uit
punt 3 kan het aantal eerst *omlaag* brengen. Dat is geen tegenslag maar precies
het gedrag waar Strava om vraagt; het moet alleen wél in de notitie staan, anders
lijkt het alsof we juist verder van de cap af zijn geraakt.

---

## Checklist vóór indienen

- [x] `STRAVA_WEBHOOK_VERIFY_TOKEN` gezet in Netlify (en niet meer wijzigen).
- [x] Migraties `0148` t/m `0151` gedraaid op productie.
- [x] Gedeployd, daarna op `/beheer/strava` → **Webhooks** → **Aanmaken**.
      Subscription **371417**, callback
      `https://zwb-platform.netlify.app/api/strava/webhook` (2026-09-05).
- [ ] Externe cron (cron-job.org) voor `/api/strava/sync` teruggezet van elke
      15-30 minuten naar **1x per dag**.
- [ ] Minstens **7 dagen** laten draaien.
- [ ] Daarna invullen in de notitie hieronder:
  - aantal gekoppelde atleten (`/beheer/strava` → *Gekoppeld*) tegenover de cap;
  - aantal opgeruimde koppelingen sinds de uitrol;
  - dagelijks callvolume vóór en na (`strava_api_usage.daily_used`, en de
    schatting uit `docs/runbook.md` §7 voor de oude situatie);
  - aantal ontvangen webhook-events (`strava_webhook_events`).
- [ ] Controleren dat de health-check-bron `strava_webhook` op ok staat.
- [ ] Indienen via het Strava-formulier. **Niet** reageren op de afwijzingsmail:
      die reactie wordt volgens Strava niet als herindiening behandeld.

---

## Notitie voor Strava (Engels)

> Vervang alle `<...>` door de gemeten waarden voordat je dit verstuurt.

---

**Application:** ZWB Cycling club platform (`<client id>`)
**Requested:** increase in connected athlete capacity

Thank you for the feedback on our previous request. We have reworked our
integration along both of the lines you described. Below is what changed, and the
numbers we measured after `<n>` days running the new implementation in
production.

**1. Webhooks replace polling**

We previously polled `GET /athlete/activities` for every connected athlete on a
15-30 minute cron, regardless of whether the athlete had ridden. That was the bulk
of our API usage and almost all of it returned no new data.

We now run a single push subscription (id `371417`, callback
`https://zwb-platform.netlify.app/api/strava/webhook`). Activity events are queued on receipt and
processed out-of-band, so the callback always answers well within the two-second
window. Each `create`/`update` event results in exactly one
`GET /activities/{id}` call for that specific activity; `delete` events need no
API call at all.

Polling has not been removed entirely, but it is now a **once-daily
reconciliation** limited to a 30-day window. It exists only to catch renames and
deletions that a missed webhook delivery would otherwise leave stale. We consider
removing it entirely once we have a longer track record of webhook reliability.

Measured effect on daily request volume:

| | Before | After |
|---|---|---|
| Activity list requests | `<before>` | `<after>` |
| Activity detail requests | 0 (disabled to stay within budget) | `<after>` |
| Total `/api/v3` requests per day | `<before>` | `<after>` |

We also added an application-wide rate limit budget. We read the
`X-RateLimit-Usage` and `X-RateLimit-Limit` headers on every response and persist
the latest observation, so that our scheduled jobs — which run as stateless
serverless functions — know what previous runs have already consumed. Jobs stop
at 70% of the 15-minute window and 90% of the daily limit rather than running
into a 429.

**2. Managing stale and deauthorized athletes**

Our previous implementation never called `POST /oauth/deauthorize`. When a member
disconnected in our app or deleted their account, we only removed our local
record, so the grant remained active on Strava's side and the athlete kept
occupying one of our slots. We also had no handling for athletes who revoked
access on strava.com: the refresh token simply failed on every subsequent cron
run, indefinitely.

All three paths are now handled:

- **Member disconnects in our app** — we call `POST /oauth/deauthorize` first, then
  delete the connection. If the call fails, the connection is flagged, ignored by
  the application, and retried by a nightly job until it succeeds.
- **Member deletes their account** — the same deauthorization runs before the
  account is removed.
- **Athlete revokes on strava.com** — we receive the `athlete` /
  `updates.authorized = "false"` webhook event and mark the connection dead
  immediately.
- **Refresh token rejected** — treated as a revoked grant, flagged and cleaned up
  rather than retried forever.

In addition, we now apply an inactivity policy. A connection that has produced no
activity and whose owner has not signed in for 12 months is flagged, the member is
notified, and if nothing changes within 30 days the connection is deauthorized and
removed. The intent is exactly what you describe: we do not want to hold athlete
slots that no longer serve anyone.

Since deploying this we have released `<n>` athlete slots that were previously
occupied by connections that were no longer in use.

**3. Data handling**

When an athlete's authorization ends — by their action or ours — we delete the
Strava data we hold for them: activities, segment efforts, gear, and the athlete's
Strava profile image reference. Aggregate club statistics that members have earned
(badges, totals) are retained in a form that contains no Strava data.

**4. Current capacity**

We currently have `<connected>` connected athletes against a cap of `<cap>`.
Members who cannot connect because of the cap use a manual activity export upload
instead, which is a poor substitute for the real integration.

We confirm that our application complies with the Strava API Agreement and the
Strava API Policy, including the brand guidelines (Powered by Strava attribution,
the Connect with Strava button, and links back to Strava on all screens that
display Strava data).

---

## Waar het in de code zit

| Onderdeel | Bestand |
|---|---|
| Callback (handshake + wachtrij) | `src/app/api/strava/webhook/route.ts` |
| Eventverwerking | `src/lib/strava/webhook-processor.ts` |
| Eén rit ophalen | `src/lib/strava/ingest-activity.ts` |
| Subscriptionbeheer | `src/lib/strava/subscription.ts` |
| Deauthorisatie | `src/lib/strava/deauthorize.ts` |
| Toestandsmachine koppeling | `src/lib/strava/lifecycle.ts` |
| Nachtelijke opruiming | `src/lib/strava/sweep.ts` |
| Dataretentie | `src/lib/strava/retention.ts` |
| Rate-limit-budget | `src/lib/strava/rate-limit-budget.ts` |
| Dagelijkse reconcile | `src/app/api/strava/sync/route.ts` |

Bediening en storingsafhandeling: `docs/runbook.md` §7.
