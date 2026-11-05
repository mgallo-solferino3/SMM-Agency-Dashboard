#!/bin/bash
# Installa (o aggiorna) Agency Dashboard SMM sul Mac con l'ultima versione pubblicata su GitHub.
# Scaricando con curl il file non riceve la "quarantena" del browser, quindi macOS non blocca l'app.
# Uso: curl -fsSL https://raw.githubusercontent.com/mgallo-solferino3/SMM-Agency-Dashboard/main/scripts/install-mac.sh | bash
set -euo pipefail

REPO="mgallo-solferino3/SMM-Agency-Dashboard"
APP_NAME="Agency Dashboard SMM"
DEST="/Applications/$APP_NAME.app"

TMP="$(mktemp -d)"
MNT="$TMP/mnt"
cleanup() {
  hdiutil detach "$MNT" -force >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "→ Cerco l'ultima versione"
URL="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*mac-universal\.dmg"' | head -1 | cut -d'"' -f4)"
[ -n "$URL" ] || { echo "✗ Non trovo il file per Mac nell'ultima release"; exit 1; }
echo "  $(basename "$URL")"

echo "→ Scarico"
curl -fL --progress-bar -o "$TMP/app.dmg" "$URL"

echo "→ Preparo l'installazione"
mkdir -p "$MNT"
hdiutil attach "$TMP/app.dmg" -nobrowse -noautoopen -noverify -mountpoint "$MNT" >/dev/null
ditto "$MNT/$APP_NAME.app" "$TMP/$APP_NAME.app"

# Mai sostituire l'app mentre è aperta: si bloccherebbe
if pgrep -x "$APP_NAME" >/dev/null; then
  echo "→ Chiudo l'app aperta"
  pkill -x "$APP_NAME" || true
  for _ in $(seq 1 50); do pgrep -x "$APP_NAME" >/dev/null || break; sleep 0.2; done
  pkill -9 -x "$APP_NAME" 2>/dev/null || true
fi

echo "→ Installo in Applicazioni"
rm -rf "$DEST"
ditto "$TMP/$APP_NAME.app" "$DEST"
xattr -cr "$DEST"

echo "→ Apro l'app"
open "$DEST"
echo "✓ Fatto: $(defaults read "$DEST/Contents/Info" CFBundleShortVersionString) installata. I dati restano quelli di prima."
