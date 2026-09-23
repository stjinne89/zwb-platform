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
- [x] Externe cron teruggezet (2026-09-08/11): reconcile elk uur met `?limit=3`,
      webhookverwerking elke 5 min, opruiming dagelijks 05:40.
- [x] Minstens **7 dagen** laten draaien — webhooks live sinds 5 september, de
      volledige keten sinds 11 september.
- [x] Cijfers opgehaald en ingevuld (2026-09-23). Samenvatting:
      10 actieve koppelingen, 0 wachtend op opruiming, 180 webhook-events in 7
      dagen waarvan 173 ritdetail-calls, 0 onverwerkte events. Strava's eigen
      dashboard: **10 van 10 atleten** — de cap is vol.
- [ ] Oude bulletpunten, alleen nog relevant bij een volgende meetronde:
  - aantal gekoppelde atleten (`/beheer/strava` → *Gekoppeld*) tegenover de cap;
  - aantal opgeruimde koppelingen sinds de uitrol;
  - dagelijks callvolume vóór en na (`strava_api_usage.daily_used`, en de
    schatting uit `docs/runbook.md` §7 voor de oude situatie);
  - aantal ontvangen webhook-events (`strava_webhook_events`).
- [x] Health-check-bron `strava_webhook` staat op ok (0 onverwerkte events).
- [ ] Indienen via het Strava-formulier. **Niet** reageren op de afwijzingsmail:
      die reactie wordt volgens Strava niet als herindiening behandeld.

---

## De cijfers ophalen

Draai deze twee queries in de Supabase SQL-editor. De eerste geeft alle
kerngetallen, de tweede de dagcurve voor de tabel in de notitie.

```sql
-- 1. Kerngetallen
select 'gekoppelde atleten (actief)' as meting, count(*)::text as waarde
  from public.strava_connections where revoked_at is null
union all select 'wacht op opruiming', count(*)::text
  from public.strava_connections where revoked_at is not null
union all select 'webhook-events totaal (7d)', count(*)::text
  from public.strava_webhook_events where received_at >= now() - interval '7 days'
union all select 'ritdetail-calls (7d) = activity create+update', count(*)::text
  from public.strava_webhook_events
  where received_at >= now() - interval '7 days'
    and object_type = 'activity' and aspect_type in ('create','update')
union all select 'activity delete (7d, kost 0 calls)', count(*)::text
  from public.strava_webhook_events
  where received_at >= now() - interval '7 days'
    and object_type = 'activity' and aspect_type = 'delete'
union all select 'deauthorisaties via webhook (7d)', count(*)::text
  from public.strava_webhook_events
  where received_at >= now() - interval '7 days' and object_type = 'athlete'
union all select 'nog onverwerkte events', count(*)::text
  from public.strava_webhook_events where processed_at is null
union all select 'laatst waargenomen daily_used', coalesce(daily_used::text, '-')
  from public.strava_api_usage where id = 'strava'
union all select 'laatst waargenomen daily_limit', coalesce(daily_limit::text, '-')
  from public.strava_api_usage where id = 'strava'
union all select 'usage waargenomen op', coalesce(observed_at::text, '-')
  from public.strava_api_usage where id = 'strava';
```

```sql
-- 2. Events per dag
select date_trunc('day', received_at)::date as dag,
       count(*) filter (where object_type = 'activity'
                          and aspect_type in ('create','update')) as detail_calls,
       count(*) as events_totaal
  from public.strava_webhook_events
 where received_at >= now() - interval '14 days'
 group by 1 order by 1;
```

```sql
-- 3. Waar gaan de calls heen? (diagnose bij een hoog daily_used)
select 'segment-PRs bijgewerkt vandaag' as bron, count(*)::text as aantal
  from public.profile_completed_segments where updated_at >= current_date
union all select 'segment-PRs bijgewerkt (7d)', count(*)::text
  from public.profile_completed_segments where updated_at >= now() - interval '7 days'
union all select 'ritdetails opgehaald vandaag', count(*)::text
  from public.strava_activities where efforts_fetched_at >= current_date
union all select 'ritdetails opgehaald (7d)', count(*)::text
  from public.strava_activities where efforts_fetched_at >= now() - interval '7 days'
union all select 'coltijden bijgewerkt (7d)', count(*)::text
  from public.profile_climbed_cols where updated_at >= now() - interval '7 days';
```

```sql
-- 4. Zit het bij één lid? (dan is het de knop, niet een cron)
select profile_id, count(*) as ritdetails_vandaag
  from public.strava_activities
 where efforts_fetched_at >= current_date
 group by 1 order by 2 desc;
```

**Twee dingen komen niet uit de database.** Lees ze op
`https://www.strava.com/settings/api`:

- het **client id** van de app;
- het aantal **connected athletes dat Strava zelf telt**, en de cap.

Dat laatste is het belangrijkste getal van de hele aanvraag. Het is ook de toets
op ons opruimwerk: staat Strava's telling hoger dan "gekoppelde atleten (actief)"
uit query 1, dan zitten er nog grants vast die wij niet meer kennen.

**Beperkingen van de meting, eerlijk benoemd.** `strava_api_usage` bewaart één
rij die telkens wordt overschreven, dus er is géén historie van het dagverbruik —
alleen de laatste waarneming. En opgeruimde koppelingen worden verwijderd, dus
het aantal vrijgemaakte slots is achteraf niet uit de database te tellen; dat
blijkt alleen uit Strava's eigen telling. Beide zijn ontwerpkeuzes die bij een
volgende ronde de moeite van het herzien waard zijn.

---

## Notitie voor Strava (Engels)

> Vervang alle `<...>` door de gemeten waarden voordat je dit verstuurt.

---

**Application:** ZWB Cycling club platform (client id `222044`)
**Requested:** increase in connected athlete capacity

Thank you for the feedback on our previous request. We have reworked our
integration along both of the lines you described. Below is what changed, and the
numbers measured in production. The push subscription has been live since
5 September 2026 and the full pipeline — webhook processing, reconciliation and
the deauthorization sweep — since 11 September 2026.

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

Polling has not been removed entirely, but it is now a **reconciliation that
touches each athlete at most once per day**, limited to a 30-day window. It exists
only to catch renames and deletions that a missed webhook delivery would otherwise
leave stale. The job itself runs hourly and processes a small batch, but a
per-athlete guard means no athlete is fetched more than once in 24 hours. We will
consider removing it entirely once we have a longer track record of webhook
reliability.

We also removed a second, larger source of calls. Our reconciliation used to run a
per-athlete segment refresh that issued up to 100 `GET /segments/{id}` requests
each time, to keep personal records current. That work now happens only as a
by-product of a webhook: the single `GET /activities/{id}` we already make is
requested with `include_all_efforts=true`, so segment efforts arrive with the
activity instead of in a separate sweep.

Effect on daily request volume:

| | Before (previous configuration) | After (measured 16-23 Sept 2026) |
|---|---|---|
| Activity list requests | every connected athlete, up to 4 pages, every 15-30 minutes | about one page per athlete per day |
| Activity detail requests | 0 — we had disabled them to stay within the budget | **25 per day**, one per actual ride |
| Segment requests per reconciliation | up to 100 per athlete | 0 |
| Webhook events received | n/a | 180 in 7 days, of which 7 deletes that cost no call at all |

The "before" figures are what the previous configuration was set up to do; we did
not instrument request volume at the time, which is part of why we are confident
about the change but were not about the baseline.

One caveat so the numbers you may see on your side make sense: we are separately
running a **one-off historical backfill** of segment data for our existing
members, which currently accounts for the large majority of our daily requests.
That is deliberate, finite work, not steady-state traffic. The recurring cost of
the integration is the 25 activity detail requests per day shown above, plus about
one activity list request per athlete per day.

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

Since deploying this, connections that are no longer in use are deauthorized and
removed rather than left in place. No connection has needed releasing yet in the
period since deployment — every one of our current connections belongs to an
active member — but the mechanism is in place and runs nightly. The check that it
works is in section 4: our count of active connections matches the athlete count
on your dashboard exactly.

**3. Data handling**

When an athlete's authorization ends — by their action or ours — we delete the
Strava data we hold for them: activities, segment efforts, gear, and the athlete's
Strava profile image reference. Aggregate club statistics that members have earned
(badges, totals) are retained in a form that contains no Strava data.

**4. Current capacity**

Your own dashboard shows **10 of 10 athletes connected** — the application is at
its cap, which we understand to be the precondition for this request.

Two things about that number are worth pointing out.

First, our own database counts exactly **10 active connections** as well. That
match is the practical proof of section 2: we hold no grants that we have lost
track of. Before this work we had no way to make that claim, because a member who
disconnected in our app left a live grant behind on your side that we could no
longer see or release.

Second, the cap is now the binding constraint on the club. We are a cycling club
of roughly fifty members and only ten can connect. The rest upload a manual
activity export instead. That works, but it is a poor substitute: it is a one-off
snapshot the member has to repeat by hand, and it carries none of the live
updates, segment efforts or deletions that the API gives us — nor can we honour a
deletion on your side for data that arrived by file.

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
