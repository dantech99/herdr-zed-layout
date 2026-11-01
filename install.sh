#!/usr/bin/env bash
# Enlaza el layout y el tema, y copia los mods, en ~/.config/herdr-app.
set -euo pipefail
R="$(cd "$(dirname "$0")" && pwd)"; H="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
mkdir -p "$H/layouts" "$H/mods" "$H/themes"
for f in layouts/zed.json layouts/zed.svg themes/tokyo-night.json; do ln -sfn "$R/$f" "$H/$f"; done
# Mods are copied as real files: Herdr serves no assets (svg/png) through symlinks and
# refuses modules (import "./x.js") that resolve outside its folder. Re-run this script
# after editing anything in mods/.
for m in "$R"/mods/*/; do
  n=$(basename "$m"); [ -L "$H/mods/$n" ] && rm "$H/mods/$n"
  mkdir -p "$H/mods/$n"; find "$H/mods/$n" -type l -delete
  cp -rf "${m%/}/." "$H/mods/$n/"
done
echo "Listo. Activa con: herdr-app do layout.switch --name zed"
