# Installeert de ZWB stream-hulp op deze Windows-pc, of werkt hem bij.
#
# Normaal start je dit via ZWB-stream-hulp-installeren.bat (op je profiel bij
# YouTube > Hulp-app). Dat bestand haalt dit script van GitHub en draait het.
# Nog een keer draaien werkt de hulp bij; de koppelcode blijft staan.
#
# Alleen ASCII in dit bestand: Windows PowerShell 5.1 leest een script zonder BOM
# als ANSI.
#
# Om te testen zonder GitHub en zonder het echte bureaublad:
#   powershell -ExecutionPolicy Bypass -File stream-hulp\installeren.ps1 -Bron . -Map <map> -Bureaublad <map>

param(
  [string]$Bron = "",
  [string]$Map = (Join-Path $env:LOCALAPPDATA "ZWB-stream-hulp"),
  [string]$Bureaublad = ([Environment]::GetFolderPath("Desktop"))
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "stjinne89/zwb-platform"
$Branch = "main"

function Step($nummer, $tekst) {
  Write-Host ""
  Write-Host "Stap $nummer van 4: $tekst" -ForegroundColor Cyan
}
function Ok($tekst) { Write-Host "  OK  $tekst" -ForegroundColor Green }
function Stop-Met($tekst) {
  Write-Host ""
  Write-Host "Dit lukte niet:" -ForegroundColor Red
  Write-Host "  $tekst" -ForegroundColor Red
  Write-Host ""
  exit 1
}
function Write-Utf8($pad, $tekst) {
  [IO.File]::WriteAllText($pad, $tekst, (New-Object Text.UTF8Encoding($false)))
}
function Update-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}
function Get-NodeMajor {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { return 0 }
  $versie = (& node --version) -replace "^v", ""
  return [int]($versie.Split(".")[0])
}

Write-Host "ZWB stream-hulp installeren" -ForegroundColor Yellow
Write-Host "Laat dit venster open tot er 'Klaar' staat."

# 1. Node ------------------------------------------------------------------
Step 1 "Node.js (het programma waarop de hulp draait)"
if ((Get-NodeMajor) -ge 22) {
  Ok "Node.js staat er al ($(& node --version))."
} else {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Stop-Met "Installeer Node.js zelf via https://nodejs.org (kies LTS) en dubbelklik daarna opnieuw op het installatiebestand."
  }
  Write-Host "  Node.js wordt geinstalleerd. Vraagt Windows om toestemming, klik dan op Ja."
  & winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
  Update-Path
  if ((Get-NodeMajor) -lt 22) {
    Stop-Met "Node.js is niet gevonden na het installeren. Start de pc opnieuw op en probeer het nog een keer."
  }
  Ok "Node.js geinstalleerd ($(& node --version))."
}

# 2. De hulp zelf ------------------------------------------------------------
Step 2 "De hulp ophalen"
New-Item -ItemType Directory -Force -Path $Map | Out-Null
$srcMap = Join-Path $Map "src"
if (Test-Path $srcMap) { Remove-Item -Recurse -Force $srcMap }

$nodig = @("package.json", "tsconfig.json", "src/index.ts", "src/protocol.ts")
foreach ($pad in $nodig) {
  $doel = Join-Path $Map ($pad -replace "/", "\")
  New-Item -ItemType Directory -Force -Path (Split-Path $doel) | Out-Null
  if ($Bron) {
    Copy-Item -Force (Join-Path (Resolve-Path $Bron).Path ("stream-hulp\" + ($pad -replace "/", "\"))) $doel
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/$Repo/$Branch/stream-hulp/$pad" -OutFile $doel
    } catch {
      Stop-Met "GitHub gaf geen antwoord. Controleer je internet en probeer het later nog eens."
    }
  }
}
Ok "Bestanden in $Map."

Write-Host "  Onderdelen installeren (npm). Dit duurt even."
Push-Location $Map
try {
  & npm.cmd install --omit=dev --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) { Stop-Met "npm install mislukte. Lees de rode tekst hierboven." }
} finally {
  Pop-Location
}
Ok "Onderdelen geinstalleerd."

# 3. Instellingen ------------------------------------------------------------
Step 3 "Instellingen"
$envPad = Join-Path $Map ".env"
$oud = @{}
if (Test-Path $envPad) {
  foreach ($regel in Get-Content $envPad) {
    if ($regel -match "^\s*([A-Z_]+)=(.*)$") { $oud[$Matches[1]] = $Matches[2].Trim() }
  }
}
$code = $oud["STREAM_HULP_CODE"]
if ($code) {
  $antwoord = (Read-Host "  Er staat al een koppelcode. Een nieuwe plakken? Typ j of n").Trim().ToLower()
  if ($antwoord -eq "j") { $code = "" }
}
while (-not $code) {
  Write-Host ""
  Write-Host "  Plak de koppelcode van je profiel (YouTube > Hulp-app koppelen) en druk op Enter."
  Write-Host "  (Plakken in dit venster: klik met de rechtermuisknop.)"
  $invoer = (Read-Host "  Koppelcode").Trim()
  if ($invoer -like "zwb1.*" -and $invoer.Length -gt 100) { $code = $invoer }
  else { Write-Host "  Dit lijkt geen koppelcode. Kopieer hem opnieuw." -ForegroundColor Yellow }
}
$wachtwoord = $oud["OBS_PASSWORD"]
if (-not $oud.ContainsKey("OBS_PASSWORD")) {
  Write-Host ""
  Write-Host "  In OBS: Extra > WebSocket Server-instellingen. Zet de server aan,"
  Write-Host "  klik op Verbindingsinfo tonen en kopieer het wachtwoord."
  $wachtwoord = (Read-Host "  Wachtwoord van OBS (leeg als je er geen gebruikt)").Trim()
}
$obsUrl = if ($oud["OBS_URL"]) { $oud["OBS_URL"] } else { "ws://127.0.0.1:4455" }
Write-Utf8 $envPad (@(
  "# Geschreven door installeren.ps1. Deel de koppelcode met niemand.",
  "STREAM_HULP_CODE=$code",
  "OBS_URL=$obsUrl",
  "OBS_PASSWORD=$wachtwoord",
  ""
) -join "`r`n")
Ok "Instellingen opgeslagen."

# 4. Snelkoppeling -----------------------------------------------------------
Step 4 "Snelkoppeling op het bureaublad"
$start = Join-Path $Map "start.bat"
Write-Utf8 $start (@(
  "@echo off",
  "title ZWB stream-hulp",
  "cd /d `"%~dp0`"",
  "echo De stream-hulp start. Laat dit venster open tijdens de race.",
  "call npm.cmd start",
  "pause",
  ""
) -join "`r`n")
$link = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $Bureaublad "ZWB stream-hulp.lnk"))
$link.TargetPath = $start
$link.WorkingDirectory = $Map
$link.Save()
Ok "Snelkoppeling 'ZWB stream-hulp' gemaakt."

Write-Host ""
Write-Host "Klaar!" -ForegroundColor Green
Write-Host "Start OBS, en daarna de hulp met de snelkoppeling 'ZWB stream-hulp'."
