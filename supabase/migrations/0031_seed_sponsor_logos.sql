-- Sponsor-logo's: direct linken naar de bestaande beelden op zwbcycling.nl.
-- Admins kunnen ze later via de UI vervangen met een eigen upload naar
-- de 'sponsors' Storage bucket. Idempotent: we updaten alleen wanneer er
-- nog geen eigen upload (Supabase Storage URL) staat.

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/Haga.png'
  where slug = 'haga-rubbers' and (logo_url is null or logo_url not like '%/storage/v1/%');

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/RSC%20corp_%20recruiters%20hoog%20full%20colour.png'
  where slug = 'rsc-corp-recruiters' and (logo_url is null or logo_url not like '%/storage/v1/%');

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/Sportr.png'
  where slug = 'spotr' and (logo_url is null or logo_url not like '%/storage/v1/%');

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/Jeka%20technisch%20projectmanagement.jpg'
  where slug = 'jeka-projectmanagement' and (logo_url is null or logo_url not like '%/storage/v1/%');

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/kalas.jpg'
  where slug = 'kalas' and (logo_url is null or logo_url not like '%/storage/v1/%');

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/A-%20Lourens%20Interim%20(2).png'
  where slug = 'a-lourens-interim' and (logo_url is null or logo_url not like '%/storage/v1/%');

update public.sponsors set logo_url = 'https://www.zwbcycling.nl/uploaded/Sponsor/Borst%20Logo%20KP%20Design.png'
  where slug = 'kp-design' and (logo_url is null or logo_url not like '%/storage/v1/%');

-- NexReply: hun logo op zwbcycling.nl is een base64-inline (geen losse file).
-- Slaan we over; admin kan een eigen upload doen via /sponsors → upload-knop.
