#!/usr/bin/env bash
# Enlaza el layout, los mods (archivo por archivo) y el tema en ~/.config/herdr-app.
set -euo pipefail
R="$(cd "$(dirname "$0")" && pwd)"; H="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
mkdir -p "$H/layouts" "$H/mods" "$H/themes"
for f in layouts/zed.json layouts/zed.svg themes/tokyo-night.json; do ln -sfn "$R/$f" "$H/$f"; done
# Mods are real folders: code is symlinked per file (live edits), while assets (svg/png)
# are copied, because Herdr does not serve them through symlinks. Re-run this script
# after adding or changing assets.
for m in "$R"/mods/*/; do
  n=$(basename "$m"); [ -L "$H/mods/$n" ] && rm "$H/mods/$n"
  mkdir -p "$H/mods/$n"; cp -asf "${m%/}/." "$H/mods/$n/"
  find "$H/mods/$n" -type l \( -name '*.svg' -o -name '*.png' \) -exec sh -c 'f=$(readlink -f "$1"); rm "$1"; cp "$f" "$1"' _ {} \;
done
echo "Listo. Activa con: herdr-app do layout.switch --name zed"
