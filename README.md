# Glyph for Zed

[Symbols](https://github.com/miguelsolorio/vscode-symbols) file and folder icons
by Miguel Solorio, packaged as a native Zed icon theme. Includes **Glyph Dark**
and **Glyph Light**, using the upstream artwork unchanged.

## Install locally

In Zed, run `zed: install dev extension` from the command palette and select
this repository. Then run `icon theme selector: toggle` and choose Glyph Dark
or Glyph Light. The generated `icon_themes/` and `icons/` directories are
included; installing the extension does not require Bun or a build.

To follow your editor's appearance, add this to Zed's settings:

```json
{
  "icon_theme": {
    "mode": "system",
    "light": "Glyph Light",
    "dark": "Glyph Dark"
  }
}
```

## Build and update

Requires Bun and Git:

```sh
bun install --frozen-lockfile
bun run build
bun run check
bun run typecheck
bun test
bun run build:check
```
