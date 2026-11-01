# herdr-zed-layout

Layout de Herdr inspirado en Zed: barra de título propia, pestañas estilo Zed, sidebar de spaces/agents y barra de estado.

- `layouts/zed.json`: el layout (usa los mods de Herdr `spaces`, `agents`, `workspace-status`).
- `mods/zed-title`, `mods/zed-tabs`, `mods/zed-new-space`, `mods/zed-panel-switch`, `mods/zed-changes`: mods propios.
- `mods/zed-quota`: barras de cuota por agente (copia de un mod de terceros con PRs aplicados, ver Créditos). Requiere `quota-axi`.
- `mods/zed-file`: abre un archivo del panel Files como pestaña propia, con resaltado de sintaxis y edición con Ctrl/Cmd-S (solo lectura si es remoto, truncado o binario).
- `mods/zed-sidebar-footer`: pie del sidebar con Settings (ajustes de Herdr), Layout settings y Add machine.
- `mods/zed-settings`: ventana de ajustes del layout (fila «Layout settings» del pie del sidebar): word wrap global y opciones de cuota.
- `mods/zed-file-icons`: panel Files con los iconos de Material Icon Theme (copia modificada de un mod de terceros, ver Créditos).
- `themes/tokyo-night.json`: tema.

## Requisitos

- `quota-axi` para las barras de cuota: `npm install -g quota-axi` (`quota-axi --json` debe responder). Consulta el uso de cada proveedor con las credenciales que ya tengas en la máquina.

## Instalar
    ./install.sh && herdr-app do layout.switch --name zed

`install.sh` copia los mods (no los enlaza): vuelve a ejecutarlo después de editar cualquier cosa en `mods/`.

Verificar mods: `for m in mods/*/; do herdr-app check "$m"; done`

## Créditos

- **`mods/zed-file/icons/zed.png`** es el icono de la aplicación Zed (© Zed Industries), reducido a 64 px; se usa solo para identificar el editor en el botón «abrir con». Los iconos de VS Code, Cursor y Sublime Text vienen de Material Icon Theme (MIT), con su licencia junto a ellos.

- **`mods/zed-file-icons`** es una copia de [`amster93/herdr-file-icons`](https://github.com/amster93/herdr-file-icons) (Apache-2.0), autor: Dave (`amster93`). Cambio hecho aquí: la raíz del panel ya no dibuja su propia tarjeta redondeada con borde (anotado en la cabecera de `main.js`). Conserva su `LICENSE`, `LICENSE-Lucide.txt` y `LICENSE-material-icon-theme.txt`.
  - Los 1184 iconos son de [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) (MIT, © Material Extensions).
  - Se basa en el mod `files` de [Herdr](https://github.com/herdrdev/herdr-app) (Apache-2.0).
  - Ese mismo ajuste de la tarjeta también aparece en el layout [`0OZ/0oz-design`](https://github.com/0OZ/0oz-design) (Apache-2.0), de donde lo conocí.
- **`mods/zed-panel-switch/icons/`**: iconos de [Lucide](https://lucide.dev) (ISC), ver `NOTICE.txt`.
- `zed-changes`, `zed-new-space` y los mods de Herdr referenciados (`spaces`, `agents`, `workspace-status`, `worktree`) forman parte o derivan de Herdr (Apache-2.0).
- **`mods/zed-quota`** es una copia de [`Lakris2407/herdr-quota`](https://github.com/Lakris2407/herdr-quota) (MIT, © 2026 Lakris2407; licencia en el propio mod), que a su vez lee los datos de [`quota-axi`](https://github.com/kunchenguid/quota-axi) de kunchenguid. Se aplicaron aquí seis pull requests abiertos y aún sin fusionar en el original, con sus autores:
  - [#3](https://github.com/Lakris2407/herdr-quota/pull/3) soporte de `percentRemaining`, [#4](https://github.com/Lakris2407/herdr-quota/pull/4) alternar usado/restante, [#5](https://github.com/Lakris2407/herdr-quota/pull/5) controles del popup y [#6](https://github.com/Lakris2407/herdr-quota/pull/6) cuota en máquinas remotas: [`ruilopesm`](https://github.com/ruilopesm).
  - [#7](https://github.com/Lakris2407/herdr-quota/pull/7) soporte de shims de npm en Windows y [#8](https://github.com/Lakris2407/herdr-quota/pull/8) límites de Antigravity: [`jotafurtado`](https://github.com/jotafurtado).
  - Cambios hechos aquí: se resolvieron los conflictos entre los PRs y se renombraron el mod, el overlay y las claves de estado compartido con el prefijo `zed-quota`, y se añadió el prop `windows` (lista de ventanas por proveedor que dibuja la barra, p. ej. `{"grok": ["credits"]}`), con pruebas.
