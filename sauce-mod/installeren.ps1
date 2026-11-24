# Installeert de Sauce-mod ZWB ZRL Live op deze pc, of werkt hem bij.
#
# Normaal start je dit via Sauce-mod-ZRL-live-installeren.bat (te downloaden op
# /hulp/wedstrijden#sauce-mod). Dat bestand haalt dit script van GitHub en draait
# het. Nog een keer draaien zet de nieuwste versie neer. De TTT-bot installeert
# dezelfde mod mee (bot/installeren.ps1).
#
# Alleen ASCII in dit bestand: Windows PowerShell 5.1 leest een script zonder BOM
# als ANSI, en dan worden letters als e-trema onleesbaar.
#
# Om te testen zonder GitHub en zonder de echte Documenten-map:
#   powershell -ExecutionPolicy Bypass -File sauce-mod\installeren.ps1 -Bron . -ModMap <map>

param(
  # Map van de repo om uit te kopieren in plaats van GitHub.
  [string]$Bron = "",
  [string]$ModMap = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "SauceMods")
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "stjinne89/zwb-platform"
$Branch = "main"
$ModName = "zwb-zrl-live"
$Prefix = "sauce-mod/$ModName/"

function Ok($tekst) { Write-Host "  OK  $tekst" -ForegroundColor Green }

function Stop-Met($tekst) {
  Write-Host ""
  Write-Host "Dit lukte niet:" -ForegroundColor Red
  Write-Host "  $tekst" -ForegroundColor Red
  Write-Host ""
  exit 1
}

Write-Host "Sauce-mod ZWB ZRL Live installeren" -ForegroundColor Yellow

$bestanden = @()
if ($Bron) {
  $root = (Resolve-Path $Bron).Path
  Get-ChildItem -Path (Join-Path $root "sauce-mod\$ModName") -Recurse -File | ForEach-Object {
    $bestanden += ($_.FullName.Substring($root.Length + 1) -replace "\\", "/")
  }
} else {
  try {
    $boom = Invoke-RestMethod "https://api.github.com/repos/$Repo/git/trees/$Branch`?recursive=1"
  } catch {
    Stop-Met "GitHub gaf geen antwoord. Controleer je internet en probeer het over een uur nog eens."
  }
  $bestanden = $boom.tree | Where-Object { $_.type -eq "blob" -and $_.path -like "$Prefix*" } | ForEach-Object { $_.path }
}
if (-not $bestanden) { Stop-Met "De bestanden van de mod zijn niet gevonden." }

# Eerst alles in een tijdelijke map: een afgebroken download laat de oude mod staan.
$tijdelijk = Join-Path $env:TEMP "zwb-sauce-mod-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Force -Path $tijdelijk | Out-Null
try {
  foreach ($pad in $bestanden) {
    $doel = Join-Path $tijdelijk ($pad.Substring($Prefix.Length) -replace "/", "\")
    New-Item -ItemType Directory -Force -Path (Split-Path $doel) | Out-Null
    if ($Bron) {
      Copy-Item -Force (Join-Path $root ($pad -replace "/", "\")) $doel
    } else {
      Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/$Repo/$Branch/$pad" -OutFile $doel
    }
  }
  if (-not (Test-Path (Join-Path $tijdelijk "manifest.json"))) { Stop-Met "De mod is niet compleet binnengekomen." }

  $versie = (Get-Content -Raw (Join-Path $tijdelijk "manifest.json") | ConvertFrom-Json).version
  $modDoel = Join-Path $ModMap $ModName
  New-Item -ItemType Directory -Force -Path $ModMap | Out-Null
  if (Test-Path $modDoel) { Remove-Item -Recurse -Force $modDoel }
  Copy-Item -Recurse -Force $tijdelijk $modDoel
} catch {
  Stop-Met $_.Exception.Message
} finally {
  if (Test-Path $tijdelijk) { Remove-Item -Recurse -Force $tijdelijk }
}

Ok "Versie $versie staat in $modDoel."
Write-Host ""
Write-Host "Klaar. Start Sauce for Zwift opnieuw en zet ZWB ZRL Live aan onder Instellingen, Mods." -ForegroundColor Yellow
