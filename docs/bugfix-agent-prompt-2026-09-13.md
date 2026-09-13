# Prompt voor de uitvoerende AI-agent

Los de bugs op uit het blok **Bugs/ wensen etc** in het [ZWBasis-plannenboek](https://docs.google.com/document/d/1R8bKCys5Ic-MUmjRVS-eCCxZKIfReu3qpPkFxqx9shI/edit). Onderstaande opdracht is gebaseerd op de 22 meldingen van Jeroen van 4–13 september, gelezen op 13 september 2026, en een gerichte inspectie van de lokale code op basiscommit `71724b4` met bestaande ongecommitte wijzigingen.

De eigenaar heeft bevestigd: **eerst bugs oplossen; uitbreidingswensen apart houden. Het wijzigen van doeltype repareren, het veld niet verwijderen. Met einddatum in punt 3 wordt de datum van het doel/evenement bedoeld.** Voer de reparaties daadwerkelijk uit; lever niet alleen een analyse. Lees de actuele bron opnieuw als die beschikbaar is. Bewaar de oorspronkelijke nummers in je bevindingen en oplevering.

## Werkwijze en grenzen

- Lees `AGENTS.md` en de relevante actuele delen van `PLAN.md`. Lees vóór codewijzigingen de toepasselijke Next.js-documentatie in `node_modules/next/dist/docs/`.
- Begin met `git status` en de relevante diffs. Er bestaan al wijzigingen in onder andere `src/app/api/training/adaptations/daily/route.ts`, `src/app/(app)/_components/nav-config.ts`, `tests/e2e/smoke.spec.ts` en Omnium-bestanden. Behoud die; neem andermans werk niet ongemerkt over in jouw commit. Controleer of een bug al lokaal gerepareerd is maar nog niet uitgerold.
- Werk lokaal. Niet pushen, deployen, productiegegevens aanpassen of echte pushmeldingen versturen. Gebruik fixtures/mocks voor betaalde AI-generaties en externe schrijfacties.
- Reproduceer per bug het probleem, bepaal de oorzaak en voeg passende regressieverificatie toe. De hieronder genoemde oorzaken zijn code-aanwijzingen, geen bewezen productie-diagnoses.
- Houd productcopy kort. Noodzakelijke uitleg hoort op `/hulp`, met een bijgewerkte zoekindex; privacy-uitleg in de privacyverklaring. Behoud eigenaarscontroles, RLS, opt-in en afscherming van hersteldata.
- Leg elke afgeronde ronde met reden, migratienummers, verificatiebeperkingen en commitverwijzing vast in `PLAN.md`, samen met de bijbehorende code. Corrigeer achterhaalde claims. Verzin geen commit-hash; gebruik de projectconventie voor een nog ongecommitte ronde. Toekomstwensen blijven in het Drive-plannenboek.
- De voorbereidende analyse omvat geen reproductie op een iPhone, geen productiegegevens en geen visuele inspectie van de ingevoegde screenshots. Raadpleeg die screenshots in het bronbestand voordat je naar de blauwe/groene rit of kalenderafbeeldingen verwijst als bewijs.

## 1. Activiteiten, rapportages en automatische aanpassingen

Behandel **1, 14, 15, 17 en 22** als één samenhangende keten: geplande workout → werkelijk gereden activiteit → koppeling → rapportage → trainingsbelasting → aanpassing → melding.

**1 — RPE-vraag verschijnt schijnbaar willekeurig op iPhone.** Onderzoek zowel de push-trigger als de automatisch geopende dialoog. In `src/app/(app)/zwbeter-worden/_data.ts` draait `loadPendingReview` eerst detectie, kiest vervolgens een onbevestigde rapportage op `updated_at` en toont de titel/datum van de geplande workout. `workout-review-dialog.tsx` opent bij mount; ‘Later’ sluit alleen de lokale dialoog. Controleer herhaald openen na navigatie, refresh, gewijzigde snapshots en vertraagde synchronisatie. Een bevestigde rapportage mag niet opnieuw worden gevraagd; een uitgestelde vraag mag niet direct bij iedere navigatie terugspringen. Maak de keuze van de te beoordelen rit stabiel en verklaarbaar. Vraag de eigenaar naar de gewenste herinnertijd als daarvoor een nieuw productbeleid nodig is.

**14 en 17 — Overgeslagen donderdag, andere rit op vrijdag 11 september, verkeerde vergelijking en herstelvoorstel op zaterdag 12 september.** De huidige matching in `src/lib/training/compliance.ts` gebruikt Amsterdam-kalenderdag en bij meerdere ritten de duur. Daarmee is niet aangetoond dat een activiteit werkelijk de geplande training was. Onderzoek ook `completion.ts`, `unplanned-rides.ts`, `adapt-context.ts` en de context die de AI ontvangt.

Acceptatie:

- Een werkelijk gereden rit telt precies eenmaal mee. Een niet-gereden geplande training levert geen fictieve uitgevoerde belasting op.
- RPE, gevoel en opmerkingen blijven gekoppeld aan de bedoelde activiteit; toon duidelijk welke werkelijk gereden rit wordt beoordeeld. Verwar een afwijking ten opzichte van het plan niet met bewijs dat de activiteit onbedoeld extra was.
- Een verschoven donderdagtraining op vrijdag wordt niet zonder bewijs als extra sweetspot bovenop een uitgevoerde donderdagtraining behandeld. Werkelijke vrijdagbelasting mag uiteraard wel aanleiding geven tot herstel op zaterdag; herstel hoeft niet per definitie te verdwijnen.
- Maak een onzekere koppeling corrigeerbaar of vraag bevestiging; trek niet uitsluitend uit een gelijke datum of kleur de conclusie dat twee trainingen dezelfde zijn.
- Overgeslagen trainingen blijven beschikbaar als historie, maar niet als nog uit te voeren achterstallige training in de actuele lijst. Verwijder geen historische rapportages om de lijst op te schonen.
- Test geen rit, één rit, meerdere ritten op één dag, verschoven training, dubbele import, vertraagde import en een daggrens in Europe/Amsterdam.

**15 — Veel automatische schema-updates.** Inspecteer eerst de bestaande lokale diff van `src/app/api/training/adaptations/daily/route.ts`. Die bevat al een reparatie voor een dagcheck die alleen op een niet-opgeslagen `queued`-status vertrouwde, plus een daglimiet. Dit is nog geen bewijs van herstel in productie. Verifieer de hele keten met `replan.ts`, `draft.ts`, `training_ai_generations`, `training_adaptation_runs` en `training_replan_requests`.

Acceptatie: herhaalde en gelijktijdige runs met dezelfde aanleiding maken geen dubbele voorstellen, generaties of meldingen. Controleer databasefouten, retries, lopende generaties, basisplan versus afgeleide plannen en consistente daggrenzen. Een cooldown of globale kostenlimiet alleen is geen sluitende bescherming tegen gelijktijdige starts. Nieuwe legitieme wijzigingen mogen wel verwerkt worden. Gebruik mocks, geen echte betaalde generatie om de regressie te bewijzen.

**22 — Gevoel verdwijnt na opslaan.** Volg `athlete_feel` door `workout-report-form.tsx`, `workout-review-dialog.tsx`, beide opslaagroutes in `_actions.ts`, de rapportagetabel en alle uitlees-/weergavepaden. De opslaagroutine schrijft dit veld al; concludeer dus niet zonder bewijs dat een kolom ontbreekt. Onderzoek ook de reset van ongecontroleerde formuliervelden en verouderde props na een Server Action.

Acceptatie: Goed/Neutraal/Zwaar/Slecht blijven zichtbaar na opslaan, refresh, navigatie en een volgende activiteitensync. Bewijs apart of het databaseverlies of alleen een weergaveprobleem was. RPE en opmerkingen blijven behouden; fouten worden niet als succes getoond. Test de gewone rapportage én de bevestigingsdialoog.

## 2. Schema bijwerken

**2 — Gewijzigd doeltype wordt niet meegenomen.** Behoud het veld en repareer de verwerking, zoals de eigenaar heeft gekozen. Start bij `plan-update-form.tsx`, `src/app/api/training/plan-update/route.ts` en `preparePlanUpdate` in `src/lib/training/draft.ts`. De code ontvangt `goal_type`, werkt het doel bij en bouwt daarna nieuwe input. Traceer daarom formulier, opgeslagen doel, AI-input, gegenereerd concept, publiceren en opnieuw openen; corrigeer de werkelijke breuk.

Acceptatie: een wijziging bijvoorbeeld van basisconditie naar gran fondo blijft na herladen behouden en wordt in de gegenereerde trainingsopzet verwerkt. Oude samenvattingen of defaults mogen geen oude doelkeuze blijven suggereren. Afgeronde trainingen blijven intact. Controleer ook wat gebeurt wanneer de generatie faalt nadat het doel al is opgeslagen.

**3 — Gewijzigde einddatum wordt niet meegenomen.** Het formulier verstuurt `target_date`, maar `preparePlanUpdate` bepaalt `toDate` uit de bestaande `plan.end_date`; de prompt begrenst het herplannen vervolgens expliciet op dat bereik. Dit is een concrete aanwijzing voor verwarring tussen doeldatum en schema-einddatum.

De eigenaar heeft verduidelijkt: het gaat om **de datum van het doel/evenement**. Repareer het bewaren en gebruiken van deze persoonlijke doeldatum in doel, AI-input, trainingsopbouw en weergave, met zowel een eerdere als latere datum. Maak de schemahorizon niet zonder meer gelijk aan de doeldatum: dat zijn verschillende begrippen. Controleer of de bestaande begrenzing onbedoeld verhindert dat de gewijzigde doeldatum effect heeft. Verplaats niet de gedeelde evenementdatum voor alle leden. Laat geen verouderde toekomstige workouts naast hun vervangers staan. Neem het wissen van een optionele datum mee: de huidige `??`-fallback behoudt de oude waarde.

**10 — Annuleren gedraagt zich vreemd op iPhone.** Nog niet voldoende gespecificeerd. Vraag wat er precies gebeurt en of de gebruiker alleen het formulier heeft geopend of al een generatie heeft gestart. Inspecteer `plan-update-form.tsx` en `use-ai-draft-poll.ts`; de huidige Annuleer-knop is tijdens `busy` uitgeschakeld.

Acceptatie voor gewoon sluiten: annuleren vóór verzenden start geen request, bewaart geen wijziging en laat geen fout- of bezigstatus achter. Opnieuw openen heeft consistente waarden. Bouw geen nieuwe annulering van servergeneraties zonder eerst te bevestigen dat dat de gemelde verwachting is; een fetch afbreken annuleert niet vanzelf de servertaak.

## 3. Navigatie

**4 — Meerdere menuopties geselecteerd.** `isActiveHref` in `src/app/(app)/_components/nav-config.ts` matcht exact én iedere onderliggende route. Daardoor matchen bijvoorbeeld `/zwbeter-worden` en `/zwbeter-worden/schema` tegelijk. Inspecteer mobiele en desktopconsumenten, inclusief profiel/subpagina's.

Acceptatie: per navigatielijst is alleen de meest specifieke toepasselijke link actief. Een groepskop mag zijn actieve groep aanduiden zonder een tweede paginalink als huidig te markeren. Test geneste trainerpagina's, profiel/segments, querystrings en onbekende subroutes. Behoud bestaande rechtenfiltering en lokale wijzigingen.

## 4. Pacing en jaarplan

**5 — Samengevoegde klimmen worden onder de kaart nog oorspronkelijk weergegeven.** `src/lib/pacing/route-loader.ts` leest al `event_climbs`-overrides. Onderzoek daarom het volledige pad van klim-editor, opslag, routelader, kaart/hoogteprofiel, segmentlijst, opgeslagen pacingplan en herlaad-/verouderingslogica. Start ook bij `src/app/(app)/events/[id]/pacing/` en `src/lib/pacing/staleness.ts`.

Acceptatie: na samenvoegen en herladen verwijzen de betreffende klimweergaven naar dezelfde actuele indeling, namen en afstanden. Bestaande opgeslagen pacingkeuzes mogen niet stil worden overschreven. Als een oud pacingplan herberekening nodig heeft, moet de bestaande verouderingsflow dat correct afhandelen. Test een nieuw plan én een plan dat al vóór de samenvoeging was opgeslagen.

**8 — Marmotte staat als C-doel; prioriteit en eventkoppeling zijn niet te wijzigen.** Onderzoek het onderscheid tussen een clubevent, `training_goals` en een jaarplanmikpunt. In `jaarplan/_components/season-forms.tsx` staat een aanmaakformulier zonder eventkiezer; in `_actions.ts` bestaat al een update-actie. Controleer de volledige bestaande UI voordat je een ontbrekende ingang toevoegt.

Acceptatie: een lid kan het bedoelde bestaande event als eigen mikpunt koppelen en de eigen prioriteit wijzigen naar A; de keuze blijft behouden en komt in de jaarplan-/trainingsinput terecht. Maak geen duplicaat om een bestaande prioriteit te kunnen wijzigen en verander niet de prioriteiten van andere leden. Neem geen echte Marmotte-data aan of over zonder de juiste editie te identificeren.

**9 — Event en gekoppeld mikpunt dubbel in de lijst** is een aparte UX-wens, geen automatische opdracht in deze bugronde. De huidige `season-list.tsx` voegt targets en events apart toe; de melding is daarmee plausibel. Behoud voor later de gewenste oplossing: één regel per gekoppeld event met persoonlijke mikpuntprioriteit, met behoud van losse mikpunten. Alleen aanpassen als dit strikt nodig is voor bug 8; motiveer dan die afhankelijkheid.

## 5. Hersteldata en kalender

**20 — Hersteldata lijken niet mee te komen.** Open vraag aan eigenaar: welke waarden ontbreken, uit welke bron en op welk scherm? Inspecteer onafhankelijk daarvan de keten `src/lib/intervals/client.ts` → `src/lib/training/wellness.ts` → `_data.ts` → `recovery-card.tsx`/gereedscore. Controleer veldmapping, opt-in, apparaatkeuze, actualiteit, ontbrekende waarden en foutafhandeling.

Acceptatie na verduidelijking: de specifiek bedoelde beschikbare waarden worden correct opgehaald, verwerkt en weergegeven; ontbrekende data worden niet als nul of herstelbewijs behandeld. Behoud privacygrenzen. Lever bij ontbrekende productie-toegang een gerichte verificatiestap en geen ongefundeerde claim dat de synchronisatie werkt.

**21 — Voor mij verbergt events waarvoor het lid is aangemeld.** `src/lib/events/fit.ts` houdt in `MemberFit` wel afgemelde event-ID's bij, maar geen bevestigde inschrijvingen. De filtering kan vervolgens op team, interesse, afstand of hoogtemeters uitsluiten. Inspecteer ook `src/app/(app)/kalender/page.tsx` en de inschrijfbronnen voor verschillende eventtypes.

Acceptatie: een expliciete Ja-aanmelding houdt een event zichtbaar onder Voor mij, ook buiten interesses of afgeleide grenzen, zolang het lid toegang tot dat event heeft. Nee blijft onder Alles terugvindbaar. Voorkeurfilters blijven voor overige events werken. Onderzoek de huidige betekenis van Misschien; vraag de eigenaar als het productbeleid daarover ontbreekt. Bypass nooit toegangsrechten. Test Ja/Nee/geen antwoord, teams, grenzen en verschillende aanmeldpaden.

## Wensen apart houden — niet in deze ronde bouwen

- **6:** extra pacingsegmenten naast neutralisatie. Onderzoeksvraag voor later: hoe afdalingen nu worden gemodelleerd en welke extra indelingen nodig zijn.
- **7:** pacingvoorstel vanuit gewenste eindtijd; vraagt aparte haalbaarheids- en rekenkeuzes.
- **9:** event en gekoppeld mikpunt als één regel, met prioriteit.
- **11 en 18:** FTP-test, eventueel ramp-test, slim in de komende week inpassen met omliggende rust. Punt 18 meldt dat een FTP-test inmiddels is toegevoegd; behandel 11 dus niet als bewijs dat die functie nog helemaal ontbreekt. Controleer later de bestaande implementatie in `src/lib/training/ftp-test.ts`.
- **12:** zonekleuren laten aansluiten bij Zwift; scope en bestaande kleurbetekenissen eerst afstemmen.
- **13:** W/kg tonen; nog vaststellen op welke schermen en met welke gewichtsbasis.
- **16:** historische trainingen met zones/structuur naast RPE tonen; bepaal later of het om geplande blokken of werkelijk gemeten tijd in zones gaat.
- **19:** doelgerichte krachttraining naast core; eigen inhoudelijke en technische scope, niet ongezien aan fietsbelasting toevoegen.

Deze wensen zijn bewaard in het bron-plannenboek. Voeg ze niet als nieuwe actieve roadmap toe aan `PLAN.md`.

## Verificatie en oplevering

Gebruik de bestaande Vitest- en Playwright-infrastructuur. Bouw voort op onder andere `tests/unit/compliance.test.ts`, `training-completion.test.ts`, `season.test.ts`, `wellness.test.ts` en pacingtests. Voeg regressies toe die het gemelde gedrag bewijzen, geen tests die alleen de nieuwe implementatie herhalen. Mock externe diensten en kritieke racecondities.

Voer passende unit-/integratietests, lint, `npm.cmd run build` en de relevante e2e-scenario's uit. Controleer mobiele viewport en waar mogelijk WebKit, maar presenteer dat niet als een test op een echte iPhone/PWA. Meld bestaande, niet door jouw wijzigingen veroorzaakte fouten apart.

Migraties kunnen hier volgens de projectinstructies niet lokaal tegen Supabase worden uitgevoerd. Als SQL nodig is: gebruik een vrij migratienummer, lever volgorde, compatibiliteit en verificatiequery's en meld expliciet dat uitvoering niet lokaal is getest.

Lever per bugnummer: oorzaak, wijziging, verificatie, resterende onzekerheid. Sluit af met de aparte wensenlijst, noodzakelijke vragen en eventuele handmatige verificatiestappen. Markeer een bug alleen als opgelost als het gedrag is geverifieerd; maak onderscheid tussen lokaal gerepareerd en in productie uitgerold.
