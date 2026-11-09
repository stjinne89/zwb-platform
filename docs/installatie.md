# Installatiehandleiding: het platform voor een andere club

Fase 5 van [multi-club-ontwerp.md](multi-club-ontwerp.md). Zo zet je een eigen
installatie op voor een club: een eigen Netlify-site met een eigen
Supabase-project. ZWB zelf draait niet op deze route: ZWB houdt zijn
migratiegeschiedenis.

**Niet getest op een echt leeg project.** De baseline is alleen getest op PGlite
met een Supabase-stub (`tests/unit/baseline.test.ts`). De eerste echte
installatie is fase 7. Loop daarna deze handleiding na en zet erin wat anders
bleek.

## 1. Wat je nodig hebt

- Een Supabase-project (Postgres 17) en een Netlify-site.
- Een eigen Strava-app, als de club Strava wil gebruiken.
- Een eigen Telegram-bot, als de club meldingen op de fietscomputer wil.
- Een account op cron-job.org voor de geplande taken.
- Optioneel: een Resend-account (LiveTrack-mail), een OpenAI- of
  Anthropic-sleutel, een YouTube-sleutel en een Instagram-token.

De Zwift-serviceaccount en de sessiecookies voor WTRL en de ladder zijn per
installatie. Delen met ZWB kan niet.

## 2. Database

De baseline staat in `supabase/baseline/`:

| Bestand | Wat |
|---|---|
| `0320_baseline.sql` | het schema na migratie `0320`: tabellen, functies, policies, rechten, storage-buckets, triggers en realtime |
| `0320_seed.sql` | de startinhoud: rollen en rechten, cols, workouts, mobiliteit, voeding en recepten, onderhoudstips, kennis- en racetips, segmenten, ladderroutes en badges |

De seed bevat geen ledenroster, teams, sponsors of releasenotes van ZWB. De
clubrij heet "Club" en de modules hebben geen eigen naam.

Zet ze met `psql` op het lege project. De bestanden zijn samen 1,6 MB, te groot
voor de SQL-editor van Supabase. De verbindingsgegevens staan bij Project
Settings → Database → Connection string (de directe verbinding, niet de pooler).

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/baseline/0320_baseline.sql
```

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/baseline/0320_seed.sql
```

Draai daarna elke migratie **na** `0320` uit `supabase/migrations/`, op volgorde
van nummer:

```bash
for f in $(ls supabase/migrations/*.sql | sort); do n=$(basename "$f" | cut -c1-4); [ "$n" -gt 320 ] && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Een script dat de migraties op alle installaties bijhoudt, komt in fase 7
(keuze eigenaar 2026-11-09). Tot die tijd: noteer per installatie tot welk
nummer je bent.

Daarna in Supabase:

- Authentication → URL Configuration: de Site URL en de redirect-URL's van de
  Netlify-site.
- Authentication → Email Templates: zie
  [supabase-auth-email-templates.md](supabase-auth-email-templates.md).

## 3. Netlify

- Koppel de repository. Build: `npm run build`.
- Zet de env-variabelen bij Site configuration → Environment variables. De
  volledige lijst met uitleg staat in `.env.local.example`. Nodig om te
  beginnen:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`;
  - `NEXT_PUBLIC_SITE_URL`;
  - `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`);
  - de `…_SECRET`-waarden van de crons die je aanzet (zie §6).
- Clubwaarden die geheim of per installatie zijn, blijven env: het Zwift-club-ID
  (`ZWIFT_CLUB_ID`), de Zwift-accounts, `WTRL_COOKIE`, `LADDER_COOKIE`, de
  Instagram-token en `PODCAST_RSS_URL`. Zet ze nooit in de repository: de
  secrets-scan van Netlify laat de build dan falen.
- Elke push naar `main` bouwt elke installatie opnieuw. Met meer clubs telt dat
  op in de Netlify-credits (ontwerp §9, punt 2).

## 4. De eerste beheerder

Meld je aan op de nieuwe site. Zet daarna in de SQL-editor van Supabase je
eigen account op beheerder en goedgekeurd (keuze eigenaar 2026-11-09: geen
automatische eerste beheerder):

```sql
update public.profiles
set is_admin = true, is_approved = true, approved_at = now(), community_roles = array['board']
where id = (select id from auth.users where email = 'jij@example.com');
```

Andere leden keur je daarna goed vanuit de app.

## 5. De club inrichten

Een scherm daarvoor komt in fase 6. Tot dan gaat het met SQL. De kolommen staan
in het ontwerp (§4) en in de migraties `0313`, `0314`, `0315`, `0319` en
`0320`:

```sql
update public.club_settings set
  name = 'Testclub Utrecht', short_name = 'TCU',
  member_noun = 'TCU''er', member_noun_plural = 'TCU''ers',
  contact_email = 'bestuur@example.com', website_url = 'https://example.com',
  team_tag = 'TCU', event_markers = array['tcu'];
```

- Een module uitzetten of een eigen naam geven: `club_modules` (`enabled`,
  `label`).
- Kleuren, letter en logo: `/beheer/huisstijl`.
- Teams maak je in de app; de seed heeft er geen.

## 6. Koppelingen en geplande taken

| Wat | Waar |
|---|---|
| Strava-app en webhook | [runbook §7](runbook.md). Een nieuwe Strava-app mag 10 sporters koppelen tot Strava meer toestaat; intervals.icu en de CSV/GPX-import werken zonder. |
| Geplande taken | [runbook §2](runbook.md): elke job is een POST met `Authorization: Bearer <SECRET>`, tijdzone Europe/Amsterdam. Zet alleen de jobs aan van modules die de club gebruikt. |
| Telegram-bot | [runbook §5](runbook.md), "Telegram-bot voor berichten op de fietscomputer". Maak een eigen bot. |
| LiveTrack-mail (Resend) | [runbook §5](runbook.md), "Live volgen via Garmin/Wahoo instellen". |
| Integratiecheck | `/beheer` → koppelingen, en [runbook §5](runbook.md). |

## 7. Nieuwe migraties

Een migratie na `0320` geldt voor ZWB en voor elke nieuwe installatie. Daarom:

- Data die alleen voor ZWB is, alleen met een voorwaarde op de club, zoals in
  `0319` en `0320`: `where id and short_name = 'ZWB'`.
- Geen namen, Zwift-ID's of andere persoonsgegevens in een migratie.
- De baseline blijft op `0320` staan. Hem verschuiven naar een later nummer kan
  met `node scripts/build-baseline.mjs` na het ophogen van `BASELINE_VERSION`
  in `scripts/baseline/stub.mjs`; de test vergelijkt daarna beide routes.

## 8. Bekend verschil met de ZWB-productie

Productie heeft een kolom `external_event_participants.screenshot_path` en een
bucket `event-scan-screenshots` die geen migratie aanmaakt en geen code
gebruikt (gevonden 2026-11-09). Een nieuwe installatie krijgt ze niet en mist
ze niet.
