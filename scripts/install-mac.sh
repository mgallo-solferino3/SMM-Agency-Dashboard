#!/bin/bash
# Installa (o aggiorna) Solferino 3 Dashboard sul Mac con l'ultima versione pubblicata su GitHub.
# Scaricando con curl il file non riceve la "quarantena" del browser, quindi macOS non blocca l'app.
# Uso: curl -fsSL https://raw.githubusercontent.com/mgallo-solferino3/SMM-Agency-Dashboard/main/scripts/install-mac.sh | bash
set -euo pipefail

REPO="mgallo-solferino3/SMM-Agency-Dashboard"
APP_NAME="Solferino 3 Dashboard"
OLD_APP_NAME="Agency Dashboard SMM" # nome fino alla 1.3.x
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
SRC_APP="$(find "$MNT" -maxdepth 1 -name "*.app" | head -1)"
[ -n "$SRC_APP" ] || { echo "✗ App non trovata nel file scaricato"; exit 1; }
ditto "$SRC_APP" "$TMP/$APP_NAME.app"

# Mai sostituire l'app mentre è aperta: si bloccherebbe
for name in "$APP_NAME" "$OLD_APP_NAME"; do
  if pgrep -x "$name" >/dev/null; then
    echo "→ Chiudo l'app aperta ($name)"
    pkill -x "$name" || true
    for _ in $(seq 1 50); do pgrep -x "$name" >/dev/null || break; sleep 0.2; done
    pkill -9 -x "$name" 2>/dev/null || true
  fi
done

echo "→ Installo in Applicazioni"
rm -rf "$DEST" "/Applications/$OLD_APP_NAME.app"
ditto "$TMP/$APP_NAME.app" "$DEST"
xattr -cr "$DEST"

echo "→ Apro l'app"
open "$DEST"
echo "✓ Fatto: $(defaults read "$DEST/Contents/Info" CFBundleShortVersionString) installata. I dati restano quelli di prima."
