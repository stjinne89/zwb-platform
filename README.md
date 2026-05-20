# ZWB Cycling Platform

PWA voor de ZWB Cycling Community: kalender (met GPX), individuele training (intervals.icu / Strava), teams (WTRL / Ladder standings), materiaalzone en end-to-end encrypted chat.

Plan: `C:\Users\sjmma\.claude\plans\ik-zou-voor-zwb-expressive-gosling.md`

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
- Tailwind CSS v4 + shadcn/ui
- PWA via `manifest.json` + Web Push (later)

## Lokaal draaien

```powershell
# 1. Supabase project aanmaken op https://supabase.com/dashboard
#    Project name: zwb-platform
# 2. Env vars invullen:
copy .env.local.example .env.local
# Vul NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.

# 3. Migrations toepassen (kies één):
#    - Plak supabase/migrations/0001_initial.sql in Supabase Studio → SQL Editor.
#    - Of via CLI:
npm i -g supabase
supabase link --project-ref <ref>
supabase db push

# 4. Dev-server:
npm run dev
```

Open http://localhost:3000 → wordt geredirect naar `/login`. Magische link verschijnt in Supabase Studio → Auth → Logs (of in je inbox).

## Mappenstructuur

```
src/
  app/
    (auth)/login/        magic-link login
    (app)/               protected layout + pages
      dashboard/
      kalender/
      teams/
      training/
      materiaal/
      chat/
    auth/confirm/        magic-link callback
  lib/
    supabase/            client + server + middleware helpers
  components/ui/         shadcn components
supabase/
  migrations/            SQL migrations
public/
  manifest.json          PWA manifest
```

## Volgende stappen (fase 1)

- [ ] GPX-upload + Mapbox-rendering op event-detail
- [ ] RSVP-knoppen op event-detail
- [ ] Profiel-edit pagina
- [ ] Materiaal: markdown-posts + tags
- [ ] Teams: detail-pagina met handmatige standings-entry
- [ ] PWA-icons (192 + 512) toevoegen in `public/`
- [ ] Chat: Matrix self-hosted of Signal-protocol embedded
