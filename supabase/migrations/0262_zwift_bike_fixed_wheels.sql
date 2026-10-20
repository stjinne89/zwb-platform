-- Frames die met hun eigen, vaste wielen in de ZwiftInsider-sheet staan.
--
-- De halo-fietsen (Pinarello Espada, Specialized PROJECT 74, Cannondale R4000
-- Roller Blade, Zwift Concept Z1) zijn niet getest op de Zwift 32mm Carbon
-- maar op hun eigen wielen; die zitten dus al in cda_delta en kg_delta. Wielen
-- erbij kiezen telde ze dubbel, en het fietsadvies (2026-10-20) zette er
-- daardoor de snelste wielset bovenop. src/lib/zwift/bike-sheet.ts zet dit veld
-- voortaan bij elke ophaalronde; de update hieronder vult de lijst die er al staat.

alter table public.zwift_bike_parts
  add column if not exists fixed_wheels boolean not null default false;

update public.zwift_bike_parts
   set fixed_wheels = true
 where part = 'frame'
   and name in (
     'Cannondale R4000 Roller Blade',
     'Pinarello Espada',
     'Specialized PROJECT 74',
     'Zwift Concept Z1'
   );
