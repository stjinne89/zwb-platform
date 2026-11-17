# Installeert de TTT-bot op deze pc, of werkt hem bij.
#
# Normaal start je dit via ZWB-TTT-bot-installeren.bat (te downloaden onderaan de
# TTT Planner). Dat bestand haalt dit script van GitHub en draait het. Nog een
# keer draaien werkt de bot bij; het token, de stem en het logboek blijven staan.
#
# Alleen ASCII in dit bestand: Windows PowerShell 5.1 leest een script zonder BOM
# als ANSI, en dan worden letters als e-trema onleesbaar.
#
# Om te testen zonder GitHub en zonder het echte bureaublad:
#   powershell -ExecutionPolicy Bypass -File bot\installeren.ps1 -Bron . -Map <map> -ModMap <map> -Bureaublad <map>

param(
  # Map van de repo om uit te kopieren in plaats van GitHub.
  [string]$Bron = "",
  [string]$Map = (Join-Path $env:LOCALAPPDATA "ZWB-TTT-bot"),
  [string]$ModMap = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "SauceMods"),
  [string]$Bureaublad = ([Environment]::GetFolderPath("Desktop"))
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "stjinne89/zwb-platform"
$Branch = "main"
$PiperZip = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
# Vast op v1.0.0: de stem op main is op 2026-11-13 opnieuw getraind en heeft een
# fonemenlijst die deze piper.exe weigert ("is not a single codepoint").
$Voice = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium.onnx"
$ModName = "zwb-zrl-live"
# Spraakherkenning voor /ttt start spraak:true. Gemeten op 2026-11-17: met deze
# versie en het base-model 7 van de 7 testcommando's goed, ongeveer 1,4 s per zin.
$WhisperZip = "https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip"
$WhisperModel = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"

function Step($nummer, $tekst) {
  Write-Host ""
  Write-Host "Stap $nummer van 7: $tekst" -ForegroundColor Cyan
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
  # Zonder BOM: node --env-file leest anders de eerste regel verkeerd.
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

Write-Host "TTT-bot installeren" -ForegroundColor Yellow
Write-Host "Laat dit venster open tot er 'Klaar' staat. Dat duurt een paar minuten."

# 1. Node ------------------------------------------------------------------
Step 1 "Node.js (het programma waarop de bot draait)"
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
    Stop-Met "Node.js is niet gevonden na het installeren. Start de pc opnieuw op en dubbelklik nog een keer op het installatiebestand."
  }
  Ok "Node.js geinstalleerd ($(& node --version))."
}

# 2. De bot zelf ------------------------------------------------------------
Step 2 "De bot ophalen"
New-Item -ItemType Directory -Force -Path $Map | Out-Null
# Oude programmabestanden weg, zodat een verwijderd bestand niet blijft hangen.
# .env, .piper en .cache blijven staan.
foreach ($oud in @("src", "sauce-mod")) {
  $pad = Join-Path $Map $oud
  if (Test-Path $pad) { Remove-Item -Recurse -Force $pad }
}

$bestanden = @()
if ($Bron) {
  $root = (Resolve-Path $Bron).Path
  foreach ($deel in @("bot", "sauce-mod\$ModName")) {
    $basis = Join-Path $root $deel
    Get-ChildItem -Path $basis -Recurse -File | ForEach-Object {
      $bestanden += ($_.FullName.Substring($root.Length + 1) -replace "\\", "/")
    }
  }
} else {
  try {
    $boom = Invoke-RestMethod "https://api.github.com/repos/$Repo/git/trees/$Branch`?recursive=1"
  } catch {
    Stop-Met "GitHub gaf geen antwoord. Controleer je internet en probeer het over een uur nog eens."
  }
  $bestanden = $boom.tree | Where-Object { $_.type -eq "blob" } | ForEach-Object { $_.path }
}

# Alleen wat de bot nodig heeft: geen tests, geen node_modules of eigen gegevens.
$nodig = $bestanden | Where-Object {
  ($_ -like "bot/*" -or $_ -like "sauce-mod/$ModName/*") -and
  $_ -notmatch "^bot/(tests|node_modules|\.cache|\.piper)/" -and
  $_ -notmatch "^bot/(\.env|vitest\.config\.ts|installeren\.ps1)$"
}
if (-not $nodig) { Stop-Met "De bestanden van de bot zijn niet gevonden." }

foreach ($pad in $nodig) {
  $doel = Join-Path $Map ((($pad -replace "^bot/", "")) -replace "/", "\")
  New-Item -ItemType Directory -Force -Path (Split-Path $doel) | Out-Null
  if ($Bron) {
    Copy-Item -Force (Join-Path $root ($pad -replace "/", "\")) $doel
  } else {
    Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/$Repo/$Branch/$pad" -OutFile $doel
  }
}
Ok "$(@($nodig).Count) bestanden in $Map."

Write-Host "  Onderdelen installeren (npm). Dit duurt even."
Push-Location $Map
try {
  & npm.cmd install --omit=dev --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) { Stop-Met "npm install mislukte. Lees de rode tekst hierboven." }
} finally {
  Pop-Location
}
Ok "Onderdelen geinstalleerd."

# 3. Stem ------------------------------------------------------------------
Step 3 "De stem (Nathalie)"
$piperMap = Join-Path $Map ".piper"
$piperExe = Join-Path $piperMap "piper\piper.exe"
$model = Join-Path $piperMap "nl_BE-nathalie-medium.onnx"
New-Item -ItemType Directory -Force -Path $piperMap | Out-Null
if (-not (Test-Path $piperExe)) {
  $zip = Join-Path $env:TEMP "piper_windows_amd64.zip"
  Invoke-WebRequest -UseBasicParsing $PiperZip -OutFile $zip
  Expand-Archive -Force -Path $zip -DestinationPath $piperMap
  Remove-Item -Force $zip
}
if (-not (Test-Path $model)) {
  Write-Host "  De stem downloaden (ongeveer 60 MB)."
  Invoke-WebRequest -UseBasicParsing $Voice -OutFile $model
}
if (-not (Test-Path "$model.json")) {
  Invoke-WebRequest -UseBasicParsing "$Voice.json" -OutFile "$model.json"
}
if (-not (Test-Path $piperExe)) { Stop-Met "piper.exe is niet gevonden na het uitpakken." }
Ok "Stem staat klaar."

# 4. Spraak verstaan -------------------------------------------------------------
Step 4 "Spraak verstaan (whisper)"
$whisperMap = Join-Path $Map ".whisper"
$whisperExe = Join-Path $whisperMap "Release\whisper-cli.exe"
$whisperBin = Join-Path $whisperMap "ggml-base.bin"
New-Item -ItemType Directory -Force -Path $whisperMap | Out-Null
if (-not (Test-Path $whisperExe)) {
  $zip = Join-Path $env:TEMP "whisper-bin-x64.zip"
  Invoke-WebRequest -UseBasicParsing $WhisperZip -OutFile $zip
  Expand-Archive -Force -Path $zip -DestinationPath $whisperMap
  Remove-Item -Force $zip
}
if (-not (Test-Path $whisperBin)) {
  Write-Host "  Het spraakmodel downloaden (ongeveer 140 MB)."
  Invoke-WebRequest -UseBasicParsing $WhisperModel -OutFile "$whisperBin.part"
  Move-Item -Force "$whisperBin.part" $whisperBin
}
if (-not (Test-Path $whisperExe)) { Stop-Met "whisper-cli.exe is niet gevonden na het uitpakken." }
Ok "Spraak verstaan staat klaar."

# 5. Instellingen ------------------------------------------------------------
Step 5 "Instellingen"
$envPad = Join-Path $Map ".env"
$oud = @{}
if (Test-Path $envPad) {
  foreach ($regel in Get-Content $envPad) {
    if ($regel -match "^\s*([A-Z_]+)=(.*)$") { $oud[$Matches[1]] = $Matches[2].Trim() }
  }
}

$token = $oud["DISCORD_TOKEN"]
if ($token) {
  Ok "Het token van je Discord-bot staat er al."
} else {
  Write-Host ""
  Write-Host "  Plak het token van je Discord-bot en druk op Enter."
  Write-Host "  (Plakken in dit venster: klik met de rechtermuisknop.)"
  while (-not $token) {
    $invoer = (Read-Host "  Token").Trim()
    if ($invoer -match "^\d+$") {
      Write-Host "  Dat is de Applicatie-ID, niet het token. Kijk links bij Bot > Token resetten." -ForegroundColor Yellow
    } elseif ($invoer -match "^[0-9a-f]{64}$") {
      Write-Host "  Dat is de Openbare sleutel, niet het token. Kijk links bij Bot > Token resetten." -ForegroundColor Yellow
    } elseif ($invoer.Split(".").Count -lt 3 -or $invoer.Length -lt 50) {
      Write-Host "  Dit lijkt geen token. Kopieer het opnieuw bij Bot > Token resetten." -ForegroundColor Yellow
    } else {
      $token = $invoer
    }
  }
}

$sauce = $oud["SAUCE_URL"]
if (-not $oud.ContainsKey("SAUCE_URL")) {
  Write-Host ""
  $antwoord = (Read-Host "  Staan Zwift en Sauce for Zwift op deze pc? Typ j of n").Trim().ToLower()
  if ($antwoord -eq "n") {
    $ip = (Read-Host "  Typ het IP-adres van de pc met Sauce (bijvoorbeeld 192.168.0.12), of laat leeg").Trim()
    $sauce = if ($ip) { "http://${ip}:1080" } else { "" }
  } else {
    $sauce = "http://localhost:1080"
  }
}

$coach = if ($oud["COACH"]) { $oud["COACH"] } else { "speak" }
$origins = if ($oud["PLAN_ORIGINS"]) { $oud["PLAN_ORIGINS"] } else { "https://zwb-platform.netlify.app" }

Write-Utf8 $envPad (@(
  "# Geschreven door installeren.ps1. Het token blijft op deze pc; deel het met niemand.",
  "DISCORD_TOKEN=$token",
  "SAUCE_URL=$sauce",
  "COACH=$coach",
  "PIPER_PATH=$piperExe",
  "PIPER_MODEL=$model",
  "WHISPER_PATH=$whisperExe",
  "WHISPER_MODEL=$whisperBin",
  "PLAN_ORIGINS=$origins",
  ""
) -join "`r`n")
Ok "Instellingen opgeslagen."

# 6. Sauce-mod ---------------------------------------------------------------
Step 6 "De Sauce-mod ZWB ZRL Live"
$modBron = Join-Path $Map "sauce-mod\$ModName"
$modDoel = Join-Path $ModMap $ModName
New-Item -ItemType Directory -Force -Path $ModMap | Out-Null
if (Test-Path $modDoel) { Remove-Item -Recurse -Force $modDoel }
Copy-Item -Recurse -Force $modBron $modDoel
Ok "Mod staat in $modDoel."

# 7. Snelkoppeling -----------------------------------------------------------
Step 7 "Snelkoppeling op het bureaublad"
$start = Join-Path $Map "start.bat"
Write-Utf8 $start (@(
  "@echo off",
  "title TTT-bot",
  "cd /d `"%~dp0`"",
  "echo De TTT-bot start. Laat dit venster open tijdens de race.",
  "call npm.cmd start",
  "pause",
  ""
) -join "`r`n")
$link = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $Bureaublad "TTT-bot.lnk"))
$link.TargetPath = $start
$link.WorkingDirectory = $Map
$link.Save()
Ok "Snelkoppeling 'TTT-bot' gemaakt."

Write-Host ""
Write-Host "Klaar!" -ForegroundColor Green
Write-Host "Start de bot met de snelkoppeling 'TTT-bot' op je bureaublad."
Write-Host "Start Sauce for Zwift opnieuw en zet de mod aan onder Instellingen > Mods."
