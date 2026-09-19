# Glyph for Zed

Glyph packages the upstream [Symbols](https://github.com/miguelsolorio/vscode-symbols)
file and folder artwork as native Zed icon themes. The repository ships both Glyph Dark and
Glyph Light. Users install the checked-in extension directly; Bun and the generator are maintainer
tools, not runtime dependencies.

## What makes Glyph special?

### 1. Open at the core

Glyph is truly open. We share how the theme is generated, we pin the exact upstream source, and of
course we share all our code. Users should be able to inspect, reproduce, and fork the project. We
work in the open, and should strive to stay that way.

### 2. Performance without compromise

Lots of extensions have gotten bogged down with bad tech decisions and "slop". We have not, and
we're proud that Glyph is a native Zed icon theme with no runtime dependencies. Make sure all
changes are considerate of extension size, generated theme size, and editor performance.

## A note from Lost Saint

I like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.

The rest of this document is meant to help you navigate the codebase and make changes effectively. Think of these instructions less as "hard rules", more as "good defaults". The developer's preferences should be able to override anything here.

## Generated files and upstream updates

- `bun run build` regenerates the theme and referenced SVGs from the commit in `upstream.json`.
- `bun run build:check` verifies generated files without rewriting them.
- `bun run update:icons` is the deliberate networked operation: it resolves upstream `HEAD`,
  updates `upstream.json`, and regenerates the artifacts. Do not update upstream as a side effect of
  unrelated work.
- `.cache/symbols` is a disposable, gitignored checkout used by the generator. Never depend on or
  commit its contents. The generator refuses to proceed if that checkout contains local changes;
  inspect those changes instead of discarding them blindly.
- Keep the upstream copyright and permission notice in `LICENSE.md`. An upstream update is not
  complete until its license and generated diff have been reviewed.
- Treat large generated diffs as evidence to inspect, not noise to hide. Confirm that a changed
  pinned commit explains them.

## Verifying changes

Install dependencies with `bun install --frozen-lockfile`.

Use the smallest useful proof while iterating:

- `bun test <test-file>` for focused converter or validation behavior.
- `bun run check` for Biome formatting and linting.
- `bun run typecheck` for TypeScript.
- `bun run build:check` whenever generator code, manifests, upstream metadata, the theme, or icons
  may have changed.

Before finishing a code, manifest, or generated-artifact change, run the same checks as CI:

```sh
bun run check
bun run typecheck
bun test
bun run build:check
```

Behavior changes in `src/` should have focused tests that assert observable conversion or
validation results. Avoid tests that merely duplicate the implementation. This project has no web
app to exercise; only open Zed for visual verification when the developer explicitly asks for it.

## How it works

`src/generate-icon-theme.ts` validates local metadata, checks out the pinned Symbols commit in the
cache, converts its VS Code theme, validates the result against Zed's schema, and then writes or
checks the committed artifacts. Input validation happens before writes so malformed or hostile
metadata cannot produce a partial build.

`src/symbols-theme-converter.ts` is the pure conversion layer. It combines base and light mappings,
adds safe casing aliases for Zed's case-sensitive matching, resolves folder states, and rejects
missing definitions or paths outside the bundled SVG tree.

## Where code lives

- `src/generate-icon-theme.ts` — build/update/check CLI and filesystem/Git boundary.
- `src/input-validation.ts` — runtime validation for upstream data and project manifests.
- `src/symbols-theme-converter.ts` — pure Symbols-to-Zed conversion.
- `src/types/` — the input and output data shapes.
- `schemas/icon-theme.json` — vendored Zed output schema used during generation.
- `upstream.json` — the exact Symbols repository and commit used for the build.
- `extension.toml` and `package.json` — extension/package metadata; their versions must match.
- `icon_themes/` and `icons/` — generated, committed extension payload.

## Pull requests and work artifacts

- Never create a pull request unless the developer explicitly asks.
- Keep one concern per change. Use conventional, plain-language commit or PR titles when requested.
- Explain the problem and the fix; do not narrate every edited file.
- Do not commit implementation plans, research notes, cache contents, screenshots, or other agent
  scratch artifacts.
- Update `README.md` only when installation or maintainer workflows change. The code, types, and
  tests should carry implementation details.

## Taste

- Complexity belongs at the adapter boundary. Orchestration stays pure, UI stays dumb.
- Inferred types over annotations. `any` is the enemy.
- Comments describe how a thing is used, and move when the code moves. To be used mostly to describe functions, not to annotate every line of behavior.
- Our users drive agents all day and notice a dropped frame, a lying spinner, and a stale label. No continuously repainting animations; they peg the GPU on high-refresh displays.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Additional tips

- Don't verify with browsers or computer use unless the user explicitly agrees or requests it.
- Security is important, but should not be over-indexed on.
