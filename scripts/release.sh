#!/bin/bash
# Pubblica una nuova versione: aumenta la versione, crea .dmg ed .exe,
# installa l'app sul Mac, fa commit + tag + push e crea la GitHub Release.
# Uso: npm run release [-- patch|minor|major]   (default: patch)
set -euo pipefail

cd "$(dirname "$0")/.."
BUMP="${1:-patch}"

case "$BUMP" in
  patch|minor|major) ;;
  *) echo "Tipo di versione non valido: $BUMP (usa patch, minor o major)"; exit 1 ;;
esac

command -v gh >/dev/null || { echo "Serve GitHub CLI: brew install gh"; exit 1; }
# Verifica solo l'account attivo (gh auth status fallisce se un altro account ha il token scaduto)
gh api user >/dev/null 2>&1 || { echo "Esegui prima: gh auth login"; exit 1; }

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || { echo "Sei sul branch '$BRANCH': passa a main per pubblicare"; exit 1; }
git pull --ff-only -q

VERSION="$(npm version "$BUMP" --no-git-tag-version | tr -d v)"
TAG="v$VERSION"
echo "→ Nuova versione $VERSION"

restore_version() {
  echo "✗ Build fallita: ripristino la versione precedente"
  git checkout -- package.json package-lock.json
}
trap restore_version ERR

echo "→ Build macOS e installazione in /Applications"
npm run install-local
echo "→ Build Windows"
npm run dist:win

trap - ERR

# GitHub sostituisce gli spazi nei nomi: copio i file con nomi puliti
ASSETS="$(mktemp -d)"
trap 'rm -rf "$ASSETS"' EXIT
cp "dist/Agency Dashboard SMM-$VERSION-universal.dmg" "$ASSETS/Agency-Dashboard-SMM-$VERSION-mac-universal.dmg"
cp "dist/Agency Dashboard SMM Setup $VERSION.exe" "$ASSETS/Agency-Dashboard-SMM-Setup-$VERSION-windows.exe"

echo "→ Commit, tag e push"
git add -A
git commit -q -m "Release $TAG"
git tag "$TAG"
git push -q origin main "$TAG"

cat > "$ASSETS/notes.md" <<EOF
## Download
- **macOS** (Apple Silicon e Intel): \`Agency-Dashboard-SMM-$VERSION-mac-universal.dmg\`
- **Windows** (x64): \`Agency-Dashboard-SMM-Setup-$VERSION-windows.exe\`

## Installazione
- **macOS** (consigliato): apri il Terminale, incolla questo comando e premi Invio. Scarica e installa l'ultima versione senza il blocco di macOS:
  \`\`\`
  curl -fsSL https://raw.githubusercontent.com/mgallo-solferino3/SMM-Agency-Dashboard/main/scripts/install-mac.sh | bash
  \`\`\`
  Se scarichi il \`.dmg\` dal browser, macOS può bloccare l'app (l'icona saltella nel Dock senza aprirsi) perché non è firmata con Apple Developer ID. In quel caso, dopo averla trascinata in Applicazioni, esegui nel Terminale: \`xattr -cr "/Applications/Agency Dashboard SMM.app"\`
- **Windows**: l'installer non è firmato. Se compare SmartScreen, clicca **Ulteriori informazioni → Esegui comunque**.

EOF

echo "→ Creo la GitHub Release"
gh release create "$TAG" --target main --title "Agency Dashboard SMM $VERSION" \
  --notes-file "$ASSETS/notes.md" --generate-notes \
  "$ASSETS"/*.dmg "$ASSETS"/*.exe

echo "✓ Pubblicata: $(gh release view "$TAG" --json url -q .url)"
