-- ZWBriljant: je steen is standaard zichtbaar voor alle goedgekeurde leden; wie
-- dat niet wil, verbergt hem (eigenaar, 2026-10-21). Tot nu toe (0265, 0266)
-- moest een lid zelf kiezen om te delen (`consent_version`).
--
-- Nu telt alleen `visible`: een voorkeur ontstaat zodra een lid ZWBriljant opent
-- (met `visible` standaard aan), en verbergen zet hem uit. `consent_version` blijft
-- bestaan maar beslist niet meer. Wie ZWBriljant nooit opende, heeft geen voorkeur
-- en geen snapshots, en is dus ook niet zichtbaar.
--
-- Let op: bij het toepassen worden alle huidige deelnemers met een voorkeur
-- meteen zichtbaar voor andere leden (op 2026-10-21 drie leden, niemand had
-- gedeeld). De privacytekst zegt dat vanaf dezelfde push.

create or replace function public.zwbriljant_shares(p_profile uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.zwbriljant_preferences pref
    join public.profiles p on p.id = pref.profile_id
    where pref.profile_id = p_profile
      and pref.visible
      and p.is_approved
  )
$$;

revoke all on function public.zwbriljant_shares(uuid) from public, anon;
grant execute on function public.zwbriljant_shares(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select prosrc from pg_proc where proname = 'zwbriljant_shares';  -- zonder consent_version
