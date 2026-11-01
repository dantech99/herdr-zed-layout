# herdr-zed-layout

Layout de Herdr inspirado en Zed: barra de título propia, pestañas estilo Zed, sidebar de spaces/agents y barra de estado.

- `layouts/zed.json`: el layout (usa los mods de Herdr `spaces`, `agents`, `workspace-status`).
- `mods/zed-title`, `mods/zed-tabs`: mods propios.
- `themes/tokyo-night.json`: tema.

## Instalar
    ./install.sh && herdr-app do layout.switch --name zed

Verificar mods: `herdr-app check mods/zed-title && herdr-app check mods/zed-tabs`
