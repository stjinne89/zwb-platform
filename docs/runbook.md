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
| Strava-sync | Externe cron | ~elke 15-30 min | `POST /api/strava/sync` | `STRAVA_SYNC_SECRET` |
| Event-reminders (24u/2u) | Externe cron | elke 15 min | `POST /api/events/reminders` | `EVENT_REMINDER_SECRET` |
| Event-scan (Zwift/MyWhoosh) | Externe cron | elke 24u | `POST /api/events/scan` | `EVENT_SCAN_SECRET` |
| Training-adaptaties (drafts) | Externe cron | dagelijks | `POST /api/training/adaptations/daily` | `TRAINING_ADAPTATION_SECRET` |
| Team-resultaten sync | Externe cron | naar wens | `POST /api/team-results/sync` | `TEAM_RESULTS_SYNC_SECRET` |
| Achievements finalize | Externe cron | naar wens | `POST /api/achievements/finalize` | `ACHIEVEMENTS_SYNC_SECRET` |

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

**Strava app-cap**: aanvraag 1→100+ atleten staat open bij Strava (extern).
Tot goedkeuring kan de sync tegen de cap lopen.

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
