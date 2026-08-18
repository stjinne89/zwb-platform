-- Startvulling voor de tips-databank van Mijn garage.
--
-- Twee bronnen: algemene kennis en samenvattingen van openbaar gepubliceerd
-- advies mét bronlink. Ledencitaten komen apart binnen via /beheer/citaten.
--
-- Toon: lichte feiten, geen werkplaatsinstructies. Bewust géén koppels,
-- demontagestappen of afstelwaarden — dat is precies waar de disclaimer op
-- /voorwaarden je niet tegen beschermt.
--
-- Elke bewering hieronder is nagetrokken. Waar bronnen elkaar tegenspraken (de
-- vervangingsdrempel voor kettingen circuleert ook als "3%", wat niet klopt) is
-- de best onderbouwde waarde aangehouden.

insert into public.maintenance_tips
  (component_type, discipline, body, source_type, source_name, source_url)
select * from (values
  -- ── Ketting ──────────────────────────────────────────────────────────────
  ('chain', null,
   'Een ketting rekt niet uit. De pennen en de busjes slijten, waardoor er speling ontstaat en de ketting langer meet. "Kettingrek" is dus een verkeerde naam die nooit meer weggaat.',
   'algemeen', null, null),
  ('chain', null,
   'De steek van een fietsketting is al ruim een eeuw een halve inch: 12,7 mm van pen tot pen. Een 12-speed ketting is smaller dan een 8-speed, maar per schakel precies even lang.',
   'algemeen', null, null),
  ('chain', null,
   'Vervang bij 0,5% rek voor 11- tot 13-speed en bij 0,75% voor 6- tot 10-speed. Smallere kettingen hebben minder materiaal te verliezen voor het misgaat.',
   'pro', 'BikeRadar', 'https://www.bikeradar.com/advice/workshop/how-to-know-when-its-time-to-replace-your-bicycle-chain'),
  ('chain', null,
   'Een ketting op tijd vervangen is de goedkoopste onderhoudsbeurt die er is: doe je het consequent, dan halen je cassette en bladen er twee tot drie.',
   'algemeen', null, null),
  ('chain', 'indoor',
   'Binnen slijt je ketting het langzaamst van allemaal. Geen zand, geen regen, geen pekel — alleen je eigen vermogen.',
   'algemeen', null, null),

  -- ── Cassette en bladen ───────────────────────────────────────────────────
  ('cassette', null,
   'Een versleten ketting vijlt de tanden van je cassette scheef. Zet je er dan een nieuwe ketting op, dan slaat hij over — en mag de cassette alsnog mee.',
   'algemeen', null, null),
  ('cassette', null,
   'Het verhaal wil dat Tullio Campagnolo in 1927 op de Croce d''Aune zijn wiel niet los kreeg met bevroren handen, en daarna de snelspanner bedacht. Historici twijfelen aan de datum, maar de snelspanner kwam er.',
   'algemeen', null, null),
  ('chainrings', null,
   'Kettingbladen gaan het langst mee van de hele aandrijving. Het teken dat ze op zijn: tanden die de vorm van een haaienvin krijgen.',
   'algemeen', null, null),

  -- ── Banden ───────────────────────────────────────────────────────────────
  ('tire_rear', null,
   'Je achterband draagt het meeste gewicht én al je vermogen. Hij is vaak versleten terwijl de voorband er nog prima uitziet.',
   'algemeen', null, null),
  ('tire_front', null,
   'Een voorband gaat ruwweg twee keer zo lang mee als een achterband. Ze omwisselen kan, maar zet nooit de meest versleten band voorop — daar wil je geen klapband.',
   'algemeen', null, null),
  ('tire_rear', 'race',
   'Breder is niet langzamer. Een 28 mm band rolt bij de juiste druk niet slechter dan een 25 mm, en op echt wegdek meestal beter, omdat je lagere druk kunt rijden zonder over elke oneffenheid te stuiteren.',
   'pro', 'SILCA', 'https://silca.cc/blogs/silca/part-4b-rolling-resistance-and-impedance'),
  ('tire_front', null,
   'Te hard oppompen maakt je op echt asfalt juist langzamer: onder een bepaalde druk win je rolweerstand, erboven verlies je meer aan trillingen dan je wint.',
   'pro', 'Velo', 'https://velo.outsideonline.com/road/road-racing/resistance-futile-tire-pressure-width-affect-rolling-resistance/'),
  ('trainer_tyre', 'indoor',
   'Een trainerband haalt 300 tot 500 uur op de rol. Rubber gaat daar niet alleen kapot van afstand maar ook van hitte, dus ook een weinig gebruikte band veroudert.',
   'pro', 'Joyful Triathlete', 'https://joyfultriathlete.com/tires-wear-and-damage-with-turbo-trainers/'),

  -- ── Sealant ──────────────────────────────────────────────────────────────
  ('sealant', null,
   'Sealant is latex met vezeltjes erin. Bij een gaatje sleept de ontsnappende lucht het naar buiten, waar het indroogt tot een propje. Het gat dicht zichzelf terwijl je doorrijdt.',
   'algemeen', null, null),
  ('sealant', null,
   'Sealant droogt in drie tot zes maanden uit doordat het water verdampt. Een band die niet lek is geweest kan dus alsnog leeg zijn vanbinnen.',
   'pro', 'CyclingAbout', 'https://www.cyclingabout.com/best-tubeless-sealant-for-gravel-road-mtb-tires/'),

  -- ── Remmen ───────────────────────────────────────────────────────────────
  ('brake_pads_disc', null,
   'Remblokken zijn het onderdeel met de grootste spreiding van allemaal. In natte herfstmodder halen organische blokken 200 tot 400 km; dezelfde blokken op droog vlak asfalt gaan een veelvoud daarvan mee.',
   'pro', 'road.cc', 'https://road.cc/content/feature/all-you-need-know-about-replacing-disc-brake-pads-176649'),
  ('brake_pads_disc', 'mtb',
   'Op technische trails is 500 tot 700 km per set blokken heel normaal. Rijd je ze helemaal op, dan komt metaal op metaal en mag de schijf er ook aan.',
   'algemeen', null, null),
  ('brake_pads_rim', null,
   'Bij velgremmen slijt niet alleen het blokje maar ook je velg. Moderne velgen hebben daarom een slijtage-indicator: een groefje of stipje dat verdwijnt als het tijd is.',
   'algemeen', null, null),
  ('brake_fluid', null,
   'DOT-vloeistof trekt water uit de lucht, zo''n 2 tot 3 procent per jaar. Dat water verlaagt het kookpunt fors — vandaar dat je het jaarlijks ververst en niet pas als de rem raar aanvoelt.',
   'pro', 'BikeRadar', 'https://www.bikeradar.com/advice/buyers-guides/brake-fluid-mineral-oil-vs-dot'),
  ('brake_fluid', null,
   'Minerale olie neemt juist géén water op. Klinkt beter, maar het water dat er tóch in komt zakt naar het laagste punt — je remklauw — en kookt daar eerder dan de olie zelf.',
   'pro', 'Epic Bleed Solutions', 'https://epicbleedsolutions.com/blogs/faq/how-often-should-i-bleed-my-brakes'),

  -- ── Bediening en comfort ─────────────────────────────────────────────────
  ('cables', null,
   'Kabels slijten niet van kilometers maar van vuil en vocht in de buitenkabel. Een fiets die een winter buiten stond schakelt slechter dan een fiets die er duizend kilometer bij reed.',
   'algemeen', null, null),
  ('cables', 'indoor',
   'Binnen is zweet de vijand van je kabels. Het is zout, het kruipt overal in en het blijft zitten waar je het niet ziet.',
   'algemeen', null, null),
  ('bar_tape', null,
   'Nieuw stuurlint is de goedkoopste manier om je fiets weer als nieuw te laten voelen. Niemand ziet je nieuwe cassette; iedereen ziet je lint.',
   'algemeen', null, null),
  ('bar_tape', null,
   'Monteurs wikkelen van het uiteinde naar het stuur toe, zodat de wikkelrichting meedraait met de kant waar je handen aan trekken. Andersom rolt het na een paar ritten open.',
   'algemeen', null, null),
  ('bar_tape', 'indoor',
   'Binnen sneuvelt stuurlint niet van slijtage maar van zweet. Een handdoek over je stuur scheelt meer dan welk merk lint dan ook.',
   'algemeen', null, null),
  ('grips', 'mtb',
   'Lock-on handvatten schoven ooit weg als ze nat werden; sinds ze met klembouten vastzitten is dat verleden tijd. De ouderwetse truc met haarlak werkt overigens nog steeds.',
   'algemeen', null, null),

  -- ── Vering en dropper ────────────────────────────────────────────────────
  ('susp_lowers', 'mtb',
   'RockShox schrijft de lowers-service voor na 50 rij-uren, Fox na 30 tot 50. Dat zijn draaiuren, geen kilometers: bij drie uur mtb per week zit je er na een maand of vier tegenaan.',
   'pro', 'FOX', 'https://tech.ridefox.com/fox_tech_center/owners_manuals/011/Content/Service_Intervals.html'),
  ('susp_full', 'mtb',
   'Een volledige service volgt bij Fox na 125 uur of jaarlijks, bij RockShox na 100 tot 200 uur. De kalender telt mee omdat olie en afdichtingen ook verouderen als je niet rijdt.',
   'pro', 'Flow Mountain Bike', 'https://flowmountainbike.com/features/flows-guide-to-understanding-suspension-service-intervals-and-upgrade-options/'),
  ('shock_service', 'mtb',
   'Een demper werkt harder dan een voorvork: kleiner oliehuis, meer warmte, kortere slag. Dat hij eerder aan de beurt is dan je vork is dus geen pech maar natuurkunde.',
   'algemeen', null, null),
  ('dropper', 'mtb',
   'De eerste dropperpost was de Hite-Rite uit 1984, van Joe Breeze en Josh Angell: een veer tussen zadelpen en frame. De slogan was "Descend with conviction" en het werd even het best verkochte mtb-accessoire.',
   'algemeen', null, null),

  -- ── Binnenfiets ──────────────────────────────────────────────────────────
  ('bottom_bracket', 'indoor',
   'Zweet loopt via je bidonbouten langs het frame naar beneden en komt uit bij je trapas. Daar hoort geen zout water, en het lager merkt dat eerder dan jij.',
   'pro', 'Zwift Insider', 'https://zwiftinsider.com/dont-let-zwifting-damage-bike/'),
  ('headset_check', 'indoor',
   'Je balhoofd ligt precies in de druipzone. Zweet laat de bouten vastroesten, en een vastgeroeste balhoofdbout merk je pas als je er iets aan wilt doen.',
   'pro', 'Cyclingnews', 'https://www.cyclingnews.com/features/indoor-cycling-tips-five-ways-to-sweatproof-your-bike-for-indoor-riding-and-racing/'),
  ('seatpost_check', 'indoor',
   'Een zadelpen die een jaar niet bewogen heeft komt er soms niet meer uit. Af en toe losdraaien en invetten kost een minuut en bespaart een dure noodgreep.',
   'algemeen', null, null)
) as seed(component_type, discipline, body, source_type, source_name, source_url)
-- Alleen vullen als er nog geen niet-lid tips staan, zodat opnieuw draaien
-- niets dubbel zet.
where not exists (
  select 1 from public.maintenance_tips where source_type in ('pro', 'algemeen')
);

notify pgrst, 'reload schema';
