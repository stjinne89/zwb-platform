# ZWB Platform — Ops Runbook

Onderhoudsgids voor het draaiende platform: welke geautomatiseerde jobs er
lopen, welke credentials verlopen, en wat te doen als een integratie stilvalt.
Bedoeld zodat het platform niet afhankelijk is van tribal knowledge van één
persoon.

> Zie ook: `AGENTS.md` (werkwijze), `PLAN.md` (status/roadmap),
> `docs/security-review.md` (securityreview).

---

## 1. Hosting & deploy

- **Host**: Netlify (auto-deploy bij elke push naar `main`, build `npm run build`).
- **DB/Auth/Storage**: Supabase (Postgres + RLS).
- **Netlify-credits zijn beperkt** → lokaal werken is default; push/deploy alleen
  op expliciet verzoek (zie `AGENTS.md`).
- **Env-variabelen** staan in Netlify (Site settings → Environment), met
  placeholders in `.env.local.example`. Nooit echte secrets in de repo.

---

## 2. Cron-inventaris

Twee soorten geplande jobs:

- **Netlify scheduled functions** (`netlify/functions/*.mjs`, schema via
  `export const config = { schedule }`).
- **Externe cron** (cron-job.org e.d.) die een beveiligde API-route aanroept met
  `Authorization: Bearer <SECRET>`.

| Job | Type | Schema | Endpoint | Secret-env |
|---|---|---|---|---|
| Live-data opruimen | Netlify function | `*/15 * * * *` | `POST /api/live/cleanup` | `LIVE_CLEANUP_SECRET` |
| Integratie-health-check | Netlify function | `0 * * * *` (elk uur) | `POST /api/health/integrations` | `HEALTHCHECK_SECRET` |
| Strava-reconcile | Externe cron | **1x/dag** (was elke 15-30 min) | `POST /api/strava/sync` | `STRAVA_SYNC_SECRET` |
| ↳ ritten komen sinds de webhooks realtime binnen; deze run kijkt alleen het venster van 30 dagen na op hernoemingen en op Strava verwijderde ritten | | | | |
| ↳ zet ook de ZWBeter Worden-samenvatting in de Strava-beschrijving van net gereden ritten (zie sectie 3) | | | | |
| Strava-webhookverwerking | Netlify function | `*/5 * * * *` | `POST /api/strava/webhook/process` | `STRAVA_SYNC_SECRET` |
| Strava-koppelingen opruimen | Netlify function | `40 3 * * *` | `POST /api/strava/lifecycle` | `STRAVA_SYNC_SECRET` |
| Event-reminders (24u/2u) | Externe cron | elke 15 min | `POST /api/events/reminders` | `EVENT_REMINDER_SECRET` |
| Event-scan (Zwift/MyWhoosh) | Externe cron | elke 24u | `POST /api/events/scan` | `EVENT_SCAN_SECRET` |
| Training-adaptaties (drafts) | Netlify function | `30 8 * * *` | `POST /api/training/adaptations/daily` | `TRAINING_ADAPTATION_SECRET` |
| ↳ herziet ook het schema van leden met een openstaand verzoek in `training_replan_requests` (max. 5 per run, synchrone generatie: deze route mag dus minuten duren) | | | | |
| ↳ maakt daarnaast AI-generaties af die zijn blijven hangen doordat niemand ze ophaalde (max. 10 per run); zonder deze stap bleef een kwart van alle generaties onafgemaakt | | | | |
| Team-resultaten sync | Externe cron | naar wens | `POST /api/team-results/sync` | `TEAM_RESULTS_SYNC_SECRET` |
| Achievements finalize | Externe cron | naar wens | `POST /api/achievements/finalize` | `ACHIEVEMENTS_SYNC_SECRET` |
| ZWBlokken-backfill | Handmatig | eenmalig na uitrol | `POST /api/zwblokken/backfill` | `STRAVA_SYNC_SECRET` |
| ↳ regio's op bestaande blokken (eenmalig na migratie 0112): `?regions=1` | | | | |

**Als een cron faalt**: alle routes zijn idempotent en mogen veilig opnieuw
worden aangeroepen. Test handmatig met:

```sh
curl -X POST https://<site>/api/<route> -H "Authorization: Bearer <SECRET>"
```

(De meeste routes hebben `GET = POST` als alias zodat je ze ook in de browser
kunt testen.)

---

## 3. Credentials die verlopen (belangrijkste onderhoudspunt)

Deze breken **stil** — de feature levert dan gewoon niets meer op zonder
zichtbare fout. De integratie-health-check (sectie 5) is bedoeld om dit op te
vangen, maar weet hier hoe je ze ververst:

| Credential | Gebruikt voor | Vervalt? | Vernieuwen |
|---|---|---|---|
| `LADDER_COOKIE` | Club-ladder/graveyard scraper (`ladder.cycleracing.club`) | Ja, sessiecookie | Inloggen, `connect.sid`-cookie kopiëren via DevTools → Application → Cookies |
| `WTRL_COOKIE` | ZRL/WTRL-data voor sommige endpoints | Ja, sessiecookie | Inloggen bij WTRL, sessiecookie kopiëren |
| `ZWIFT_USERNAME` / `ZWIFT_PASSWORD` | Zwift-club-serviceaccount (event-feed + entrants) | Wachtwoord/lockout | Eigen ZWB-serviceaccount; bij lockout wachtwoord resetten. Verifieer met "Test clubkoppeling" op `/beheer/event-scan` |
| `STRAVA_CLIENT_SECRET` | Strava OAuth | Nee (tenzij geroteerd) | Strava API-dashboard |
| `OPENAI_API_KEY` | Trainings-AI | Bij rotatie/quota | OpenAI-dashboard |
| `INSTAGRAM_ACCESS_TOKEN` | `/media` Instagram-sync | Ja, long-lived token (~60 dgn) | Meta/Instagram Graph API token verlengen |
| `ZWIFTGOPHER_API_KEY` | TTT-planner | Bij rotatie | `zwiftgopher.com/api/dashboard.php` |
| `YOUTUBE_API_KEY` | `/media` YouTube-sync | Quota/rotatie | Google Cloud Console |

Overige secrets (`SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, VAPID-keys,
cron-secrets) zijn statisch en hoeven alleen bij een bewuste rotatie aangepast.

### Strava-scope: alle leden moeten één keer opnieuw koppelen

De gevraagde OAuth-scope bevat sinds de ZWBeter Worden-samenvatting ook
`activity:write` (`src/lib/strava/client.ts`). Tokens die vóór die wijziging zijn
afgegeven missen dat recht; die leden worden voor het schrijven **stil
overgeslagen** en houden verder alles (sync, badges, cols, segmenten). Ze moeten
één keer opnieuw koppelen via `/profiel` → **Opnieuw koppelen**.

Wie dat nog niet deed, zie je op `/beheer/strava`: de teller "Moet opnieuw
koppelen" en een badge per lid.

Twee environment-variabelen horen bij deze functie:

- `STRAVA_ZWB_SUMMARY_SINCE` — ISO-datum. Ritten die eerder zijn gestart krijgen
  nooit een samenvatting. **Leeg = functie uit.** Zet dit op de dag van
  livegang; het is de zekering die voorkomt dat een `fullBackfill`-run of een
  nieuw gekoppeld lid jaren historie herschrijft.
- `STRAVA_SYNC_ZWB_SUMMARY_MAX_WRITES` — writes per profiel per run (default 1).
  Elke write kost 2 Strava-calls, en Strava's rate limit geldt per applicatie.

---

## 4. Externe integraties & fragiliteit

Veel features leunen op niet-officiële of scraped bronnen die zonder
waarschuwing kunnen wijzigen:

| Feature | Bron | Type | Breekt bij |
|---|---|---|---|
| ZRL-standings | WTRL | scraper + cookie | cookie verlopen / HTML-wijziging |
| Club-ladder | ladder.cycleracing.club | scraper + cookie | cookie verlopen / HTML-wijziging |
| Event-scan Zwift | Zwift publieke + member-feed API | onofficiële API | endpoint/structuur-wijziging |
| Event-scan MyWhoosh | mywhoosh.com HTML + detail-API | scraper | HTML/markup-wijziging |
| Uitslag-scraper | ChronoRace / RaceResult / generieke HTML | scraper/JSON-API | site-wijziging |
| ZwiftPower-uitslag | zwiftpower.com | alleen link (geen scrape) | n.v.t. (link blijft werken) |
| TTT-planner | ZwiftGopher API | API + key | key/endpoint-wijziging |
| Training-AI | OpenAI | API + key | quota/model-wijziging |
| Strava | officiële OAuth API | API | rate-limit / app-cap |

**Strava app-cap**: de eerste aanvraag voor een hogere atletenlimiet is
**afgewezen**. Strava stelde twee voorwaarden: webhooks in plaats van polling, en
actief beheer van stale en gedeauthoriseerde atleten. Beide zijn nu gebouwd (zie
sectie 6). Het herindieningsdossier staat in
`docs/strava-api-resubmission.md`; dat moet nog worden ingediend, ná een periode
meten op productie.

---

## 5. Integratie-health-check

`POST /api/health/integrations` (bearer `HEALTHCHECK_SECRET`) draait lichte
probes per bron en schrijft het resultaat naar de tabel `integration_health`
(laatste status + tijd per bron). Bij een **transitie van ok → faalt** stuurt de
route een push naar admins via trigger `on_admin_broadcast`.

- **Schema**: elk uur (Netlify function `netlify/functions/integrations-healthcheck.mjs`).
- **Statusoverzicht**: zichtbaar voor beheerders op `/beheer` (groen/rood + tijd
  van laatste check).
- **Handmatig draaien**:
  ```sh
  curl -X POST https://<site>/api/health/integrations -H "Authorization: Bearer <HEALTHCHECK_SECRET>"
  ```
- **Let op**: de push-alert leunt op admin-opt-in voor `on_admin_broadcast`. Het
  `integration_health`-dashboard is de betrouwbare bron; de push is de
  attentie-laag. Zorg dat minstens één beheerder die opt-in aan heeft.

Een rode status betekent meestal: zie sectie 3 (credential verlopen) of sectie 4
(bron gewijzigd).

---

## 6. Veelvoorkomende storingen

- **"Uitslag/standings leeg"** → cookie verlopen (sectie 3) of bron-HTML
  gewijzigd (sectie 4). Check health-check-status.
- **"Event-scan vindt niets"** → Zwift-serviceaccount-login mislukt; test via
  "Test clubkoppeling" op `/beheer/event-scan`.
- **"Geen push-notificaties"** → VAPID-keys ontbreken of subscription verlopen
  (wordt automatisch geprunet bij 404/410).
- **"Live-kaart loopt vol/oud"** → controleer of de `live-cleanup`-function nog
  draait (Netlify → Functions → logs).
- **Cron draait niet** → controleer in cron-job.org of het secret en de URL nog
  kloppen; test handmatig met curl (sectie 2).
- **"ZWBlokken-kaart is leeg of loopt achter"** → de backfill is per aanroep
  begrensd op `limit` profielen × `maxActivities` ritten. Roep hem herhaald aan
  tot het antwoord `"remaining": false` geeft; daarna houdt de Strava-sync het
  bij. Klopt de berekening niet meer, dan is
  `update public.strava_activities set blocks_processed_at = null;` (eventueel
  met `where profile_id = …`) de reset — de blokken worden dan opnieuw
  opgebouwd.
- **"ZWB-samenvatting verschijnt niet in Strava"** → loop deze vijf langs:
  1. `STRAVA_ZWB_SUMMARY_SINCE` is gezet en ligt vóór de rit (leeg = uit).
  2. `STRAVA_SYNC_ZWB_SUMMARY_MAX_WRITES` staat niet op 0.
  3. `strava_connections.scope` van het lid bevat `activity:write` — anders
     opnieuw koppelen (sectie 3).
  4. Het lid heeft een `intervals_connections`-rij; zonder intervals.icu slaan we
     de rit bewust over.
  5. `strava_activity_summaries.last_error` voor die `activity_id`. Staat er
     "Wacht op belasting uit intervals.icu", dan heeft intervals de rit nog niet
     verwerkt — dat lost zich in een volgende run op.

  Let op: heeft een lid het blok zelf uit de beschrijving gehaald, dan plakken we
  het niet terug. `written_at` in `strava_activity_summaries` leegmaken forceert
  een nieuwe poging.

---

## 6. Strava-webhooks en koppelingbeheer

### Waarom dit zo werkt

Strava wees onze capaciteitsaanvraag af met twee eisen: gebruik webhooks in plaats
van polling, en beheer stale en gedeauthoriseerde atleten actief. De app pollde
elk kwartier alle koppelingen ongeacht of er gereden was, riep
`POST /oauth/deauthorize` nergens aan, en liet dode koppelingen eindeloos
opnieuw proberen. Alle drie zijn opgelost.

### De subscription

Eén per applicatie. Beheer zit op **`/beheer/strava`** → paneel *Webhooks*:

- **Status** — vraagt bij Strava op of er een subscription staat.
- **Aanmaken** — zet 'm. Strava valideert dan live onze callback met een
  GET-handshake, dus dit werkt **alleen tegen productie** en alleen als
  `STRAVA_WEBHOOK_VERIFY_TOKEN` en `NEXT_PUBLIC_SITE_URL` (https) gezet zijn.
- **Verwijderen** — nodig vóór een domeinwijziging; daarna opnieuw aanmaken.

Callback-URL: `https://<site>/api/strava/webhook`. Die route staat in
`PUBLIC_PATHS` (`src/lib/supabase/middleware.ts`) omdat Strava niet inlogt.

### De verwerkingsketen

1. Strava POST → `/api/strava/webhook` schrijft het event in
   `strava_webhook_events` en antwoordt meteen. **Altijd 200**, ook bij een fout
   aan onze kant: een 5xx kost ons de subscription.
2. Netlify function `strava-webhook-process` (elke 5 minuten) roept
   `/api/strava/webhook/process` aan. Die verwerkt max. 25 events per run en stopt
   na ~8s (Netlify-timeout). Elke tik kost twee Netlify-invocaties, vandaar niet
   elke minuut; een rit staat dus binnen ~5 minuten in de app.
3. Per event: `activity` → één `GET /activities/{id}?include_all_efforts=true`
   (ook meteen de segment-inspanningen); `athlete` met
   `updates.authorized = "false"` → koppeling direct opheffen.
4. Nachtelijk (`strava-lifecycle`, 03:40) → openstaande deauthorisaties afmaken,
   opgeruimde koppelingen wissen, inactiviteitsbeleid draaien.

### De levenscyclus van een koppeling

`strava_connections` heeft twee tijdstempels:

- `revoked_at` — de koppeling is opgeheven; de app negeert de rij vanaf dat moment.
- `deauthorized_at` — Strava's kant is ook echt los.

Staat het eerste gezet en het tweede niet, dan moet de deauthorize-call nog. De
rij blijft dán bewust staan: we hebben de token nodig om te kunnen
deauthoriseren. Pas als `deauthorized_at` staat, worden de ruwe Strava-data en de
rij gewist.

| Aanleiding | `revoked_reason` |
|---|---|
| Lid drukt op "Ontkoppel Strava" | `member` |
| Lid verwijdert zijn account | `account_deleted` |
| Lid trekt de app in op strava.com (webhook) | `strava` |
| Refresh-token wordt afgewezen | `invalid_grant` |
| 12 maanden inactief, na waarschuwing | `inactive` |
| Beheerder ruimt de koppeling op | `admin` |

### Dataretentie bij ontkoppelen

De ruwe Strava-data gaat weg: `strava_activities` (cascadeert
`strava_activity_segment_efforts` en `strava_activity_summaries`), de uit Strava
gesynchroniseerde fietsen, `profiles.strava_id` en de avatar als die op Strava's
CDN staat. De afgeleide clubdata blijft: badges, ZWBlokken, onderhoudsstanden en
`profile_climbed_cols` (de FK naar de rit staat op `on delete set null`).

### Inactiviteitsbeleid

Geen ritten **en** geen login in `STRAVA_INACTIVITY_MONTHS` (12) →
waarschuwing via push (`on_strava_link_expiring`) en een melding op `/profiel`.
Blijft het daarna `STRAVA_INACTIVITY_GRACE_DAYS` (30) stil, dan wordt de
koppeling opgeheven en gedeauthoriseerd.

Is `last_sign_in_at` niet leesbaar (Supabase admin-API faalt), dan slaat de run
het hele inactiviteitsbeleid over en meldt dat in `errors`. Doorgaan zou leden
waarschuwen die wél inloggen maar toevallig een jaar niet gereden hebben.

**Let op:** een lid dat twaalf maanden weg is heeft meestal geen werkende
push-subscription meer, en de app kent geen transactionele e-mail. Daarom staat
de teller "Waarschuwing verstuurd" op `/beheer/strava`: benader die leden binnen
de 30 dagen via WhatsApp als je ze wilt behouden.

### Verwacht callvolume

| | Vóór (polling) | Na (webhooks) |
|---|---|---|
| Activiteitenlijsten | ordegrootte 2.000-7.700/dag | ~1 per lid per dag |
| Ritdetails | 0 (stond uit wegens budget) | 1 per daadwerkelijk gereden rit |
| Coltijden/ZWB-segmenten | uit (`..._MAX_FETCHES=0`) | komen gratis mee met de ritdetail |

Het waargenomen verbruik staat in `strava_api_usage` (één rij, uit de
`x-ratelimit-*`-headers). De sync stopt zelf bij 70% van het 15-minutenvenster of
90% van de daglimiet.

### Als er iets misgaat

- **"Er komen geen events meer binnen"** → de health-check-bron
  `strava_webhook` faalt na 48u stilte. Loop dit langs:
  1. `/beheer/strava` → **Status**. Geen subscription? Strava heeft 'm verwijderd
     omdat onze callback te vaak faalde of te traag was → opnieuw **Aanmaken**.
  2. `STRAVA_WEBHOOK_VERIFY_TOKEN` gewijzigd na het aanmaken? Dan mislukt de
     handshake bij een hercontrole → subscription verwijderen en opnieuw zetten.
  3. Domein gewijzigd? De callback-URL staat vast bij Strava → opnieuw aanmaken.
  4. Ondertussen blijft de dagelijkse reconcile de ritten ophalen; er gaat dus
     niets verloren, het is alleen trager.
- **"Events blijven op *wacht* staan"** → de Netlify function
  `strava-webhook-process` draait niet (Netlify → Functions → logs) of
  `STRAVA_SYNC_SECRET` klopt niet. Handmatig: `curl -X POST -H "Authorization:
  Bearer $STRAVA_SYNC_SECRET" https://<site>/api/strava/webhook/process`.
- **"Een event blijft mislukken"** → na 5 pogingen laten we het liggen;
  `last_error` in `strava_webhook_events` zegt waarom. De reconcile haalt de rit
  alsnog op.
- **"Een lid staat op *wacht op opruiming*"** → de deauthorize-call bij Strava
  faalde. De nachtrun probeert het opnieuw; met de knop **Opruiming nu draaien**
  forceer je dat. Blijft het hangen, dan is de token waarschijnlijk al dood aan
  Strava's kant en is de atleet feitelijk al losgekoppeld.
- **"Een lid heeft opnieuw gekoppeld maar wordt overgeslagen"** → hoort niet te
  kunnen: de OAuth-callback wist de revocatievelden. Controleer `revoked_at` in
  `strava_connections`.
