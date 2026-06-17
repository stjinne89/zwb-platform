-- MyWhoosh-ID op profielen voor betrouwbare deelnemer-matching bij de eventscan.
-- `zwift_id` bestaat al sinds 0001; dit vult de tweede platformbron aan.

alter table public.profiles
  add column if not exists mywhoosh_id text;
