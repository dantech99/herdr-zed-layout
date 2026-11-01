# herdr-zed-layout

Layout de Herdr inspirado en Zed: barra de título propia, pestañas estilo Zed, sidebar de spaces/agents y barra de estado.

- `layouts/zed.json`: el layout (usa los mods de Herdr `spaces`, `agents`, `workspace-status`).
- `mods/zed-title`, `mods/zed-tabs`, `mods/zed-new-space`, `mods/zed-quota`, `mods/zed-panel-switch`, `mods/zed-changes`: mods propios.
- `mods/zed-file-icons`: panel Files con los iconos de Material Icon Theme (copia modificada de un mod de terceros, ver Créditos).
- `themes/tokyo-night.json`: tema.

## Instalar
    ./install.sh && herdr-app do layout.switch --name zed

`install.sh` copia los mods (no los enlaza): vuelve a ejecutarlo después de editar cualquier cosa en `mods/`.

Verificar mods: `for m in mods/*/; do herdr-app check "$m"; done`

## Créditos

- **`mods/zed-file-icons`** es una copia de [`amster93/herdr-file-icons`](https://github.com/amster93/herdr-file-icons) (Apache-2.0), autor: Dave (`amster93`). Cambio hecho aquí: la raíz del panel ya no dibuja su propia tarjeta redondeada con borde (anotado en la cabecera de `main.js`). Conserva su `LICENSE`, `LICENSE-Lucide.txt` y `LICENSE-material-icon-theme.txt`.
  - Los 1184 iconos son de [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) (MIT, © Material Extensions).
  - Se basa en el mod `files` de [Herdr](https://github.com/herdrdev/herdr-app) (Apache-2.0).
  - Ese mismo ajuste de la tarjeta también aparece en el layout [`0OZ/0oz-design`](https://github.com/0OZ/0oz-design) (Apache-2.0), de donde lo conocí.
- **`mods/zed-panel-switch/icons/`**: iconos de [Lucide](https://lucide.dev) (ISC), ver `NOTICE.txt`.
- `zed-changes`, `zed-new-space` y los mods de Herdr referenciados (`spaces`, `agents`, `workspace-status`, `worktree`) forman parte o derivan de Herdr (Apache-2.0).
