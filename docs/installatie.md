# Installatiehandleiding: het platform voor een andere club

Fase 5 en 7 van [multi-club-ontwerp.md](multi-club-ontwerp.md). Zo zet je een
eigen installatie op voor een club: een eigen Netlify-site met een eigen
Supabase-project. ZWB zelf draait niet op deze route: ZWB houdt zijn
migratiegeschiedenis.

**Getest op een echt project, behalve Netlify.** Op 2026-11-09 (fase 7) is §2 tot
en met §5 doorlopen op een leeg Supabase-project (`zwb-proefclub`, Postgres 17),
met de app lokaal ertegen (§9). Wat anders bleek, staat hieronder verwerkt.
Niet getest: de Netlify-site (§3), een eigen SMTP, en de koppelingen en
geplande taken (§6).

## 1. Wat je nodig hebt

- Een Supabase-project (Postgres 17) en een Netlify-site.
- Node 20.6 of nieuwer (`--env-file`) en een checkout van de repository, voor het
  migratiescript.
- Een eigen SMTP-dienst voor de inlogmails. De standaardmail van Supabase is
  traag en heeft een lage limiet per uur; in de proef kwam de bevestigingsmail
  niet aan.
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

Zet de database op met `scripts/migrate-installation.mjs`. Het script zet op
een lege database de baseline en de seed, daarna elke migratie na `0320`, en
houdt in de tabel `installation.applied_migrations` bij wat er staat. Elk
bestand loopt in een eigen transactie. Een database met clubtabellen maar
zonder die tabel (ZWB) weigert het.

1. Maak in de repository een bestand `.env.<club>` (valt onder `.gitignore`)
   met één regel:

   ```
   DATABASE_URL=postgresql://postgres.<project-ref>:<wachtwoord>@aws-0-<regio>.pooler.supabase.com:5432/postgres
   ```

   Dat is de **Session pooler** bij Connect → Connection string. De directe
   verbinding (`db.<ref>.supabase.co`) is alleen IPv6 en werkt vanaf veel
   thuisnetwerken niet. Het wachtwoord is het databasewachtwoord van het
   project.

2. Eerst kijken wat het gaat doen:

   ```bash
   node --env-file=.env.<club> scripts/migrate-installation.mjs --init --dry-run
   ```

3. Dan echt. `--init` mag alleen op een lege database:

   ```bash
   node --env-file=.env.<club> scripts/migrate-installation.mjs --init
   ```

4. Bij een nieuwe migratie in de repository, per installatie:

   ```bash
   node --env-file=.env.<club> scripts/migrate-installation.mjs
   ```

In de proef duurde de eerste keer (baseline, seed en `0321`) ongeveer twee
seconden.

Daarna in Supabase:

- Authentication → URL Configuration: de Site URL en de redirect-URL's van de
  Netlify-site.
- Authentication → Email Templates: zie
  [supabase-auth-email-templates.md](supabase-auth-email-templates.md).
- Authentication → SMTP Settings: de eigen SMTP-dienst uit §1.

## 3. Netlify

Niet getest in fase 7.

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

Meld je aan op de nieuwe site. Komt de bevestigingsmail niet (zie §1), dan kun
je het account in Supabase bevestigen bij Authentication → Users.

Zet daarna in de SQL-editor van Supabase je eigen account op beheerder en
goedgekeurd (keuze eigenaar 2026-11-09: geen automatische eerste beheerder).
De trigger `profiles_protect_admin_fields` laat alleen een beheerder iemand
beheerder maken; voor de eerste gaat hij in dezelfde transactie even uit:

```sql
begin;
alter table public.profiles disable trigger profiles_protect_admin_fields;
update public.profiles
set is_admin = true, is_approved = true, approved_at = now(), community_roles = array['board']
where id = (select id from auth.users where email = 'jij@example.com');
alter table public.profiles enable trigger profiles_protect_admin_fields;
commit;
```

Andere leden keur je daarna goed vanuit de app.

## 5. De club inrichten

In de app: Beheer → App → Inrichting (`/beheer/inrichting`). Zolang die niet is
afgerond, toont het dashboard de beheerder een balk ernaartoe. De stappen staan
op `/hulp`, onder "De club inrichten". Teams maak je daarna in de app; de seed
heeft er geen.

Zonder eigen logo (stap Huisstijl) staat de clubnaam in de kop en op het
inlogscherm; zonder eigen beeldmerk heeft de app geen favicon, app-iconen of
deelkaart. Zet ze dus meteen. De vaste ZWB-bestanden gelden alleen bij ZWB
(`static_brand`, migratie `0322`).

## 6. Koppelingen en geplande taken

Niet getest in fase 7. Op de stap Herkenning en koppelingen van de inrichting
staat welke env-variabelen er nog niet zijn.

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
- ZWB krijgt hem via de Supabase-connector; elke andere installatie via het
  script uit §2.
- De baseline blijft op `0320` staan. Hem verschuiven naar een later nummer kan
  met `node scripts/build-baseline.mjs` na het ophogen van `BASELINE_VERSION`
  in `scripts/baseline/stub.mjs`; de test vergelijkt daarna beide routes. Een
  installatie die al draait, merkt daar niets van: het script slaat bestanden
  over die in `installation.applied_migrations` staan. Een nieuwe baseline
  heeft wel een eigen bestandsnaam, dus zet een bestaande installatie er nooit
  `--init` op.

## 8. Bekende verschillen met de ZWB-productie

Gevonden 2026-11-09 door het schema van de proefinstallatie naast productie te
leggen. Geen van drieën komt uit een migratie; een nieuwe installatie mist niets.

- Productie heeft een kolom `external_event_participants.screenshot_path` en een
  bucket `event-scan-screenshots` die geen migratie aanmaakt en geen code
  gebruikt.
- Productie mist de foreign key
  `profile_climbed_cols_best_time_activity_id_fkey`, die migratie `0075` zou
  aanmaken. Een nieuwe installatie heeft hem wel.

## 9. Lokaal proefdraaien tegen een installatie

Zonder Netlify, bijvoorbeeld om een installatie te testen. Maak naast het
bestand uit §2 een `.env.<club>-app` met de variabelen uit §3 en
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`, en zet in Supabase
`http://localhost:3000` bij de redirect-URL's.

Next leest `.env.local` altijd in. Haal dat bestand tijdens de proef weg, anders
praat de app met ZWB. `node --env-file` werkt niet voor `next build`: de
workers van Next weigeren het in `NODE_OPTIONS`. Zet de variabelen dus zelf in
de omgeving voordat je `next build` en `next start` draait.

Bouw daarna opnieuw voor ZWB, want `.next` bevat dan de proefclub.
