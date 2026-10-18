---
name: kennisbank-scan
description: Maandelijkse literatuurscan van de ZWB-kennisbanken en protocollen. Zoekt nieuwe wetenschappelijke artikelen sinds de vorige scan (Consensus en PubMed), controleert de bestaande bronnen op terugtrekking, en schrijft een voorstel wat aangescherpt, toegevoegd of verwijderd moet worden. Wijzigt geen code. Draait als geplande taak op de eigen pc; ook met de hand te starten met "draai de kennisbank-scan".
argument-hint: "[JJJJ-MM], standaard de huidige maand"
---

# Maandelijkse literatuurscan van de kennisbank

Opdracht van de eigenaar (2026-10-16): "elke maand alle relevante
wetenschappelijke artikelen scannen op bruikbaarheid voor de app en automatisch
een voorstel schrijven wat aangescherpt, toegevoegd of verwijderd dient te
worden."

Het geheugen van de scan staat in `docs/kennisbank-scan/README.md`: het logboek
(waar de vorige scan ophield), de zoekvragen per thema en de lijst met artikelen
die al bekeken en bewust gelaten zijn. Lees dat eerst.

## Spelregels

- **Alleen een voorstel.** Geen code, geen kennisbanktekst, geen `PLAN.md`
  wijzigen. Uitvoeren gebeurt pas na akkoord van de eigenaar, zoals bij de
  wetenschappelijke toets (`docs/wetenschappelijke-toets.md`, "Werkwijze").
- **Eigen branch, niet pushen.** Werk in een eigen worktree, zodat de checkout
  waarin de eigenaar werkt onaangeroerd blijft. Commit alleen
  `docs/kennisbank-scan/`. Nooit pushen: Netlify-credits zijn beperkt.
- **Geen verzonnen bronnen.** Elke bron in het voorstel is in PubMed of via de
  DOI bevestigd: auteurs, jaar, tijdschrift en DOI kloppen. Kan dat niet, dan
  staat de bron onder "Niet bevestigd" en niet in een voorstel.
- **Eigen woorden.** Samenvattingen, geen citaten uit artikelen.
- **Gelezen op abstract of op volle tekst** staat bij elke bron. Volle tekst
  alleen bij open access.
- **Preprints en congresabstracts** zijn geen bron voor de kennisbank. Noem ze
  hooguit onder "In de gaten houden".
- **Persoonsgegevens** van leden komen niet in de scan; die gaat alleen over
  literatuur en de tekst in code.

## Stappen

### 1. Voorbereiden

Bepaal de maand: het argument, anders de huidige maand (`JJJJ-MM`). Werk vanuit
de hoofdcheckout `C:\Users\sjmma\Projects\zwb-platform`:

```bash
git -C C:/Users/sjmma/Projects/zwb-platform fetch origin main
git -C C:/Users/sjmma/Projects/zwb-platform worktree add .claude/worktrees/kennisbank-scan-JJJJ-MM -b kennisbank-scan/JJJJ-MM origin/main
```

`origin/main` en niet de lokale `main`: wat live staat is de kennisbank die
leden lezen, en de lokale `main` loopt vaak achter.

Bestaat die branch al, dan is deze maand al gescand: stop en meld dat. Doe al
het verdere werk in die nieuwe worktree.

Lees daar:
- `docs/kennisbank-scan/README.md`. Het **venster** loopt van de datum in de
  laatste regel van het logboek tot vandaag.
- De inventaris: `node scripts/kennisbank-inventaris.mjs`. Per artikel en
  protocol de kern, de beperkingen en de bronnen, en onderaan alle bronnen met
  waar ze gebruikt worden.
- Het claimregister in `docs/wetenschappelijke-toets.md` (fase 0): de
  rekenregels in code (FTP-test, HRV-band, TSB, zones, CP en W′). Die tellen
  net zo mee als de kennisbanktekst.

### 2. Bestaande bronnen controleren

Haal de DOI's en PMID's op met `node scripts/kennisbank-inventaris.mjs --ids`
en zoek in PubMed, in porties van zo'n vijftig, naar teruggetrokken artikelen:

```
("10.xxxx/yyy"[aid] OR "10.xxxx/zzz"[aid] OR 12345678[pmid] ...) AND "retracted publication"[pt]
```

Elke treffer is een voorstel "verwijderen of vervangen". Zoek ook per bron uit
de laatste twee jaar of er een erratum of expression of concern bij staat
(`get_article_metadata`), als die bron een getal in de app draagt.

### 3. Zoeken per thema

Draai elk thema uit `docs/kennisbank-scan/README.md`:

- **Consensus** (`search`) met de Engelse zoekvraag, `year_min` het jaar van
  het begin van het venster en `month_min` de maand, `exclude_preprints: true`.
  Het jaarfilter is hier bewust: de scan gaat alleen over wat nieuw is. Het
  geeft veel treffers buiten het onderwerp; schift op titel en abstract.
  Hooguit drie zoekvragen tegelijk; bij een rate limit dertig seconden wachten.
- **PubMed** (`search_articles`) met de PubMed-termen uit de tabel,
  `date_from` het begin en `date_to` het einde van het venster (allebei, anders
  telt het filter niet), `datetype: "edat"` (zo valt ook een artikel mee dat
  eerder online stond maar nu pas is opgenomen), `max_results: 40`. Eén verzoek
  tegelijk. Haal de titels en abstracts op met `get_article_metadata`.
- Een thema met bruikbare treffers mag één gerichte vervolgvraag krijgen.
- Houd het bij hooguit veertig Consensus-zoekvragen per scan.

Sla over wat al in de inventaris staat of onder "Gezien en bewust gelaten".

### 4. Schiften

Per treffer de vraag: verandert dit iets aan wat een ZWB-lid leest of aan wat
de app uitrekent? ZWB is een club van amateurrenners, veel indoor op Zwift,
mannen en vrouwen, ook masters.

Weeg mee:
- **Soort bewijs**: consensus of richtlijn > systematische review of
  meta-analyse > RCT > ander onderzoek. Een enkele kleine studie wint niet van
  een review in de kennisbank; hij kan hooguit een beperking toevoegen.
- **Populatie**: getrainde wielrenners of duursporters. Elite-only of niet-
  sporters kan, maar dan staat dat in de beperking.
- **Omvang en opzet**: aantal deelnemers, controlegroep, duur.
- **Herhaling**: bevestigt het wat er staat, of wijst het een andere kant op?

Artikelen en protocollen met het label Nieuwe methode (in de inventaris:
`Label: veelbelovend` of `Label: experimenteel`; beide tonen in de app "Nieuwe
methode") verdienen extra aandacht: daar kan één goede trainingsstudie bij
fietsers het niveau verschuiven.

Elk artikel en protocol heeft ook een bewijsniveau (in de inventaris:
`Bewijs:`, met `geen-effect` of `nadelig` erachter als de conclusie is dat
iets niet helpt). Het beleid, de criteria, de begrenzingen, de werkwijze en het
goedgekeurde niveau per artikel staan in
`docs/beoordelingsbeleid-bewijsniveau.md`. Volg die werkwijze, en vergelijk met
de ijkpunten daar. Verandert het bewijs zo dat het niveau of de conclusie
volgens dat beleid anders wordt, of krijgt een nieuw artikel een niveau, dan is
dat een voorstel onder **Label**.

Lees bij twijfel het abstract volledig (`get_article_metadata`) en bij open
access de volle tekst (`get_full_text_article`).

Elke beoordeelde treffer krijgt één van:

| Oordeel | Betekenis |
|---|---|
| **Aanscherpen** | Een punt, getal of beperking in een bestaand artikel of protocol wordt preciezer of voorzichtiger |
| **Toevoegen** | Een nieuwe bron bij een bestaand punt, een nieuw punt, of een nieuw artikel of protocol |
| **Verwijderen** | Een bewering of bron is weerlegd, teruggetrokken of ingehaald door beter bewijs |
| **Functionaliteit** | Een rekenregel of drempel in code (claimregister) moet anders |
| **Label** | Het bewijsniveau of de conclusie (geen effect, nadelig) van een artikel of protocol verandert, of een nieuw artikel krijgt een niveau (`docs/beoordelingsbeleid-bewijsniveau.md`); of het label Nieuwe methode kan eraf |
| **Bevestigt** | Steunt wat er staat; hooguit als extra bron, geen wijziging nodig |
| **Bewust laten** | Niet bruikbaar, met reden (te klein, verkeerde populatie, buiten scope) |

### 5. Bevestigen

Zoek elke bron die in een voorstel komt op in PubMed (of volg de DOI als hij
niet in PubMed staat) en controleer auteurs, jaar, tijdschrift, volume en DOI.
Noteer de verwijzing in de vorm van de bestaande bronnen
(`Achternaam AB, ... Titel. Tijdschrift Jaargang(nummer):pagina's.`) en de
soort (`consensus`, `review`, `studie`, `richtlijn`), zodat hij zo in een
`KnowledgeSource` past.

### 6. Voorstel schrijven

Schrijf `docs/kennisbank-scan/JJJJ-MM.md`:

```markdown
# Literatuurscan JJJJ-MM

Venster: JJJJ-MM-DD t/m JJJJ-MM-DD. Zoekvragen: N (Consensus N, PubMed N).
Bekeken: N artikelen. Voorstellen: N.

## Kort
Twee tot vijf zinnen: wat er deze maand toe doet, of "geen wijzigingen nodig".

## Voorstellen
### 1. <Aanscherpen|Toevoegen|Verwijderen|Functionaliteit|Label>: <onderwerp>
- **Waar**: artikel of protocol met pad (bv. `/zwbeter-worden/kennis/taper`) en
  bestand (bv. `src/lib/training/training-library.ts`), of de rekenregel.
- **Nu**: wat er nu staat, in één zin.
- **Nieuw bewijs**: wat het artikel laat zien, in eigen woorden, met opzet en
  aantal deelnemers.
- **Voorstel**: de nieuwe tekst of het nieuwe getal, zo concreet dat het
  uitgevoerd kan worden.
- **Bron**: volledige verwijzing, DOI, soort, gelezen op abstract of volle tekst.
- **Zekerheid**: hoog · middel · laag, met reden.

## Teruggetrokken of gecorrigeerd
Bronnen uit de kennisbank met een terugtrekking, erratum of expression of
concern, of "geen".

## Bevestigt wat er staat
Korte lijst: bron, thema, welk artikel. Geen wijziging nodig.

## In de gaten houden
Preprints, lopende trials, of één kleine studie die een richting aangeeft.

## Niet bevestigd
Bronnen die niet in PubMed of via de DOI te bevestigen waren.

## Zoekvragen
Per thema het aantal treffers en hoeveel er nieuw en bruikbaar waren. Een
voorstel voor een nieuwe of betere zoekvraag hoort hier.
```

Rangschik de voorstellen op belang: eerst wat een getal in de app of een
bewering met gezondheidsgevolg verandert, dan aanscherpingen, dan extra bronnen.
Geen voorstellen is een goede uitkomst; schrijf dan alleen "Kort", "Bevestigt"
en "Zoekvragen".

### 7. Logboek bijwerken

In `docs/kennisbank-scan/README.md`:
- Een regel in het logboek: maand, venster, aantal zoekvragen, bekeken,
  voorstellen, link naar `JJJJ-MM.md`, status "Voorstel, wacht op akkoord".
- Alles met oordeel **Bewust laten** in "Gezien en bewust gelaten", met DOI of
  PMID, thema en reden.
- Een nieuwe of betere zoekvraag pas je nog niet aan; die staat als voorstel in
  de scan.

### 8. Committen en melden

```bash
git add docs/kennisbank-scan
git commit -m "Literatuurscan JJJJ-MM: N voorstellen"
```

Niet pushen. Eindig met een korte melding aan de eigenaar: hoeveel voorstellen,
de belangrijkste in één regel elk, de branch `kennisbank-scan/JJJJ-MM` en het
pad van het voorstel. Neem de gebruiksmelding van Consensus letterlijk over als
het hulpmiddel er een gaf.

## Na akkoord

Wanneer de eigenaar (een deel van) het voorstel goedkeurt, in dezelfde
worktree:
1. Voer de goedgekeurde punten uit in code en kennisbanktekst, met de bestaande
   vorm (`KnowledgeSource`, `doi()`, beperkingen bij elk artikel).
2. Draai `npm test` (en `npx tsc --noEmit` als typen veranderen).
3. Werk het claimregister in `docs/wetenschappelijke-toets.md` bij als een
   claim een andere status krijgt.
4. Zet in `PLAN.md` een ronde "Literatuurscan JJJJ-MM" met datum, commit, wat er
   veranderde en waarom, en wat bewust niet is overgenomen.
5. Status in het logboek op "Uitgevoerd" (of "Deels uitgevoerd", met welke
   punten niet). Afgewezen punten gaan naar "Gezien en bewust gelaten".
6. Commit alles in één keer. Pushen alleen als de eigenaar dat vraagt; daarna
   kan de worktree weg.
