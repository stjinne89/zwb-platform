-- F6 — Upload-hardening: zet MIME-type-allowlists en bestandsgrootte-limieten op
-- de storage-buckets. Voorkomt dat (per ongeluk of kwaadwillig) niet-afbeeldingen
-- of veel te grote bestanden worden geüpload. Idempotent via update.
--
-- De afbeeldings-buckets ontvangen client-side verkleinde afbeeldingen; we staan
-- de gangbare image-types toe. De GPX-bucket (privé) krijgt alleen een grootte-
-- limiet, omdat GPX-uploads met wisselende content-types binnenkomen.

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id in ('avatars', 'sponsors');

update storage.buckets
set
  file_size_limit = 20971520, -- 20 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'event-photos';

update storage.buckets
set
  file_size_limit = 10485760 -- 10 MB; geen MIME-restrictie (wisselende GPX content-types)
where id = 'event-gpx';
