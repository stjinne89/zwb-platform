-- Extra kolommen op profile_climbed_cols zodat we naast de eerste beklimming
-- ook de laatste kunnen tonen + correcte times_climbed-teller hebben.
-- Backfill: copy first_* naar last_* voor bestaande rijen tot de detector
-- ze bijwerkt bij de eerste re-scan.

alter table public.profile_climbed_cols
  add column if not exists last_activity_id bigint
    references public.strava_activities(id) on delete set null,
  add column if not exists last_climbed_at timestamptz;

update public.profile_climbed_cols
set
  last_activity_id = coalesce(last_activity_id, first_activity_id),
  last_climbed_at = coalesce(last_climbed_at, first_climbed_at);

-- last_climbed_at niet NOT NULL maken om migratie veilig te houden — na
-- de eerste recompute zal alles gevuld zijn.
