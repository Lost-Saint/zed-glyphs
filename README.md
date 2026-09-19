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

`upstream.json` records the Symbols repository and exact commit. Normal
builds reproduce that commit; the first build downloads it into `.cache/symbols`.
Later builds can use that cache offline. `build:check` compares generated files
and icons byte for byte, validates the JSON against the vendored Zed schema,
and fails on missing icon definitions or assets.

The commit identifies the imported icons, independently of upstream's stale
package version.
The bundled commit `ab3c31d3bf63` (September 17, 2026) includes additions after
that release. Build output reports the commit to avoid mislabeling the assets.

To import the latest upstream default branch:

```sh
bun run update:icons
```

Review and commit `upstream.json`, `icon_themes/`, `icons/`, and `LICENSE.symbols`
together. Updates are explicit so ordinary builds cannot silently change icons.

## Zed integration

The extension follows [Zed's icon theme format](https://zed.dev/docs/extensions/icon-themes):
an `extension.toml` manifest, theme JSON in `icon_themes/`, and SVG paths relative
to the extension root. No Rust or WebAssembly component is needed.

- File associations keep their upstream IDs, including compound suffixes.
- Unknown files use Symbols' document icon through Zed's `default` key.
- Exact upstream names are preserved, with lowercase, uppercase, and initial-capital
  aliases for Zed's case-sensitive lookup. Arbitrary mixed casing is not supported.
- Folder mappings preserve upstream names and expanded states when supplied.
- Symbols currently supplies a single palette; light and dark entries share it.
  The converter also handles upstream light overrides if they are added later.
- The missing upstream `less` definition uses the upstream LESS language icon.

Zed does not expose VS Code's language-ID associations, separate root-folder
icons, or Symbols' runtime configuration switches through this schema. Zed also
matches file names through its suffix lookup, so matching is not identical to
VS Code in every case.

## Publishing

Confirm the version in `extension.toml`, commit the generated assets, and follow
[Zed's publishing guide](https://zed.dev/docs/extensions/publishing/publishing-guide).
This project has not been published to the extension registry.

## Credits and license

Icons and upstream associations: Miguel Solorio's Symbols, MIT licensed; the
original notice is preserved in `LICENSE.symbols`. The build tooling is MIT
licensed in `LICENSE`. Inspired by [Joan Garcia's Zed port](https://github.com/joansgarcia/zed-symbols).
