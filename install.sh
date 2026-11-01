#!/usr/bin/env bash
# Enlaza el layout, los mods y el tema en ~/.config/herdr-app (cambios del repo se ven en vivo).
set -euo pipefail
R="$(cd "$(dirname "$0")" && pwd)"; H="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
mkdir -p "$H/layouts" "$H/mods" "$H/themes"
for f in layouts/zed.json layouts/zed.svg themes/tokyo-night.json; do ln -sfn "$R/$f" "$H/$f"; done
for m in "$R"/mods/*/; do n=$(basename "$m"); ln -sfn "${m%/}" "$H/mods/$n"; done
echo "Listo. Activa con: herdr-app do layout.switch --name zed"
