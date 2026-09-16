# Historische Omnium-import

Gecontroleerd op 15 september 2026 via de gekoppelde Google Drive. Dit document
legt alleen bronstructuur en importkeuzes vast; de Sheets zelf zijn niet
gewijzigd.

## Bronnen

Het seizoen uit voorjaar 2026 bestaat uit zeven wedstrijdsheets en één
samengesteld klassement:

- [ZWB Omnium Race 1](https://docs.google.com/spreadsheets/d/15odDmj6cjKf2SPJuCjuaN3HVobO2Wrh9a3_jEtSKsZ8/edit)
- [ZWB Omnium Race 2](https://docs.google.com/spreadsheets/d/1568lwMHVXfR3LnfSlAAbt-0o__-sy1YjcuKxYY-E-v0/edit)
- [ZWB Omnium Race 3](https://docs.google.com/spreadsheets/d/1wGNXvpeDuAsoQ1I0Kflty8vbP3nX_bdIlWIXvORQlyM/edit)
- [ZWB Omnium Race 4](https://docs.google.com/spreadsheets/d/1E6YX2Qfbel8CAFB5KKLYPqO4-OHMkjeQzE8793yZ_r0/edit)
- [ZWB Omnium Race 5](https://docs.google.com/spreadsheets/d/1zzEQqb4a9SBan_VT-R1gOftzyq5LRlqzLzF-Y6PC-dY/edit)
- [ZWB Omnium Race 6](https://docs.google.com/spreadsheets/d/1eUnFSFSO4GGX85oUUPprjgFVTnMju5zo49TdDjJesc4/edit)
- [ZWB Omnium Race 7](https://docs.google.com/spreadsheets/d/1P0tDJ0tl0AK7LkVB0v1mKcGo6j9PcOh47xCklsnZTfs/edit)
- [Master GC Sheet](https://docs.google.com/spreadsheets/d/10Fo7F4uV5QnIuVY_meGR9zlQcwTV_nXoKFjSnMFv02k/edit)

Iedere wedstrijdsheet heeft een tab `Results` met dezelfde tabel:
`Pos, Rider, Team, Cat, Prologue, Sprint, Scratch, Crit, Total`. De categorie
bevat al de vijf volledige vELO-leaguenamen. Daardoor is voor de historische
import geen A-E-mapping nodig.

## Importbesluit

Maak voor dit archiefseizoen zeven edities aan. Exporteer per wedstrijd alleen
de tab `Results` als CSV en importeer hetzelfde bestand bij elk van de vier
onderdelen van die editie. De importer kiest per onderdeel de bijbehorende
puntenkolom. Er zijn geen startlijsten voor dit archief, zodat alle historische
uitslagen meetellen.

De tab `GC Totaal` wordt alleen als controle gebruikt. De applicatie berekent
de editie- en seizoensstanden opnieuw uit de vier onderdelen; de oude GC wordt
niet als waarheid geïmporteerd. Naamkoppelingen zijn exact en kunnen daarna via
`/beheer/omnium/renners` worden samengevoegd. Publiceer het archiefseizoen pas
nadat de opnieuw berekende totalen steekproefsgewijs overeenkomen met `GC
Totaal`.

De exacte wedstrijddatums en openbare editiegegevens zijn niet uit de tabellen
af te leiden. Die moeten bij het aanmaken van het archiefseizoen uit de
oorspronkelijke planning worden overgenomen.

## Gevonden bronafwijkingen

Een volledige vergelijking van alle 479 wedstrijdregels met de 360 regels in
`GC Totaal` gaf geen interne optelfouten in de wedstrijdsheets en geen optelfout
in de GC. De identiteitssleutels verschillen wel:

- 38 niet-nul racevermeldingen in de GC hebben geen exacte combinatie van naam
  en league in de betreffende wedstrijdsheet;
- 41 wedstrijdvermeldingen hebben geen exacte naam/league-combinatie in de GC;
- 3 exacte naam/league-combinaties hebben een ander wedstrijdtotaal.

Voorbeelden zijn een teamnaam die in de ene sheet aan de rennernaam is geplakt,
een later opgeschoonde naam en een renner die in de Master GC naar een andere
league is verplaatst. Deze correcties zijn inhoudelijke beslissingen. Een
automatische fuzzy match zou een verkeerde renner of league publiek kunnen
maken en is daarom niet uitgevoerd.
