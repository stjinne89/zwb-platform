#!/bin/bash
# Installeert de ZWB stream-hulp op deze Mac, of werkt hem bij.
#
# Plak in Terminal (staat ook op /hulp bij Livestreams):
#   curl -fsSL https://raw.githubusercontent.com/stjinne89/zwb-platform/main/stream-hulp/installeren.sh | bash
# Nog een keer draaien werkt de hulp bij; de koppelcode blijft staan.
#
# Om te testen zonder GitHub: BRON=<repo-map> MAP=<map> BUREAUBLAD=<map> bash stream-hulp/installeren.sh

set -euo pipefail

REPO="stjinne89/zwb-platform"
BRANCH="main"
MAP="${MAP:-$HOME/ZWB-stream-hulp}"
BUREAUBLAD="${BUREAUBLAD:-$HOME/Desktop}"
BRON="${BRON:-}"

stap() { printf '\n\033[36mStap %s van 4: %s\033[0m\n' "$1" "$2"; }
ok() { printf '  \033[32mOK\033[0m  %s\n' "$1"; }
stop_met() { printf '\n\033[31mDit lukte niet:\n  %s\033[0m\n\n' "$1"; exit 1; }

# Lezen van het toetsenbord, ook als dit script via curl | bash draait.
vraag() { local antwoord; read -r -p "$1" antwoord < /dev/tty; printf '%s' "$antwoord"; }

echo "ZWB stream-hulp installeren"

stap 1 "Node.js (het programma waarop de hulp draait)"
node_major() { command -v node >/dev/null 2>&1 && node --version | sed 's/^v//; s/\..*//' || echo 0; }
if [ "$(node_major)" -ge 22 ]; then
  ok "Node.js staat er al ($(node --version))."
elif command -v brew >/dev/null 2>&1; then
  brew install node
  [ "$(node_major)" -ge 22 ] || stop_met "Node.js 22 of nieuwer is niet gevonden na het installeren."
  ok "Node.js geinstalleerd ($(node --version))."
else
  stop_met "Installeer Node.js via https://nodejs.org (kies LTS, het .pkg-bestand) en plak deze regel daarna opnieuw in Terminal."
fi

stap 2 "De hulp ophalen"
mkdir -p "$MAP/src"
for pad in package.json tsconfig.json src/index.ts src/protocol.ts; do
  if [ -n "$BRON" ]; then
    cp "$BRON/stream-hulp/$pad" "$MAP/$pad"
  else
    curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/stream-hulp/$pad" -o "$MAP/$pad" \
      || stop_met "GitHub gaf geen antwoord. Controleer je internet en probeer het later nog eens."
  fi
done
ok "Bestanden in $MAP."
echo "  Onderdelen installeren (npm). Dit duurt even."
(cd "$MAP" && npm install --omit=dev --no-audit --no-fund --loglevel=error) || stop_met "npm install mislukte. Lees de tekst hierboven."
ok "Onderdelen geinstalleerd."

stap 3 "Instellingen"
ENV="$MAP/.env"
code=""; wachtwoord=""; obs_url="ws://127.0.0.1:4455"; heeft_wachtwoord=0
if [ -f "$ENV" ]; then
  code="$(grep -E '^STREAM_HULP_CODE=' "$ENV" | cut -d= -f2- || true)"
  if grep -qE '^OBS_PASSWORD=' "$ENV"; then heeft_wachtwoord=1; wachtwoord="$(grep -E '^OBS_PASSWORD=' "$ENV" | cut -d= -f2- || true)"; fi
  oud_url="$(grep -E '^OBS_URL=' "$ENV" | cut -d= -f2- || true)"; [ -n "$oud_url" ] && obs_url="$oud_url"
fi
if [ -n "$code" ] && [ "$(vraag '  Er staat al een koppelcode. Een nieuwe plakken? Typ j of n: ')" = "j" ]; then code=""; fi
while [ -z "$code" ]; do
  echo "  Plak de koppelcode van je profiel (YouTube > Hulp-app koppelen) en druk op Enter."
  invoer="$(vraag '  Koppelcode: ')"
  case "$invoer" in
    zwb1.*) [ ${#invoer} -gt 100 ] && code="$invoer" || echo "  Dit lijkt geen koppelcode. Kopieer hem opnieuw." ;;
    *) echo "  Dit lijkt geen koppelcode. Kopieer hem opnieuw." ;;
  esac
done
if [ "$heeft_wachtwoord" -eq 0 ]; then
  echo "  In OBS: Extra > WebSocket Server-instellingen. Zet de server aan,"
  echo "  klik op Verbindingsinfo tonen en kopieer het wachtwoord."
  wachtwoord="$(vraag '  Wachtwoord van OBS (leeg als je er geen gebruikt): ')"
fi
umask 077
printf '%s\n' "# Geschreven door installeren.sh. Deel de koppelcode met niemand." \
  "STREAM_HULP_CODE=$code" "OBS_URL=$obs_url" "OBS_PASSWORD=$wachtwoord" > "$ENV"
ok "Instellingen opgeslagen."

stap 4 "Startbestand op het bureaublad"
START="$BUREAUBLAD/ZWB stream-hulp.command"
printf '%s\n' "#!/bin/bash" "cd \"$MAP\"" "echo 'De stream-hulp start. Laat dit venster open tijdens de race.'" "npm start" > "$START"
chmod +x "$START"
ok "Startbestand 'ZWB stream-hulp' gemaakt."

printf '\n\033[32mKlaar!\033[0m\nStart OBS, en daarna de hulp met dubbelklikken op "ZWB stream-hulp" op je bureaublad.\n'
