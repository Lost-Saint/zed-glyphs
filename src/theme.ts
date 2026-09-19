import type { IconTheme, IconThemeFamily } from "./types/icon-theme";
import type { SymbolsTheme } from "./types/vscode-icon-theme";

// Zed matches case sensitively. Preserve exact upstream names and add common
// casing variants without overwriting any explicit upstream association.
function associations(source: Record<string, string> = {}) {
  const result: Record<string, string> = {};
  for (const [name, id] of Object.entries(source)) {
    result[name.toLowerCase()] ??= id;
    result[name.toUpperCase()] ??= id;
    result[name.charAt(0).toUpperCase() + name.slice(1)] ??= id;
  }
  return Object.fromEntries(
    Object.entries({ ...result, ...source }).sort(([a], [b]) =>
      a.localeCompare(b, "en"),
    ),
  );
}

export function convertTheme(source: SymbolsTheme, author: string) {
  const themes = (["dark", "light"] as const).map((appearance) => {
    const theme =
      appearance === "light" ? { ...source, ...source.light } : source;
    const definitions = { ...source.iconDefinitions, ...theme.iconDefinitions };
    // Upstream has a dangling LESS extension ID. Its language mapping
    // supplies the intended artwork. Leave a future dedicated icon intact.
    if (!definitions.less && theme.languageIds?.less) {
      const less = definitions[theme.languageIds.less];
      if (less) definitions.less = less;
    }
    const iconPath = (id: string) => {
      const definition = definitions[id];
      if (!definition)
        throw new Error(`Missing upstream icon definition: ${id}`);
      const value = definition.iconPath;
      if (!/^\.\/icons\/(?:[\w-]+\/)*[\w-]+\.svg$/.test(value)) {
        throw new Error(`Unsupported icon path: ${value}`);
      }
      return value;
    };
    const file_icons = Object.fromEntries(
      Object.keys(definitions)
        .sort()
        .map((id) => [id, { path: iconPath(id) }]),
    );
    file_icons.default = { path: iconPath(theme.file) };
    const file_stems = associations({
      ...source.fileNames,
      ...theme.fileNames,
    });
    const file_suffixes = associations({
      ...source.fileExtensions,
      ...theme.fileExtensions,
    });
    for (const id of [
      ...Object.values(file_stems),
      ...Object.values(file_suffixes),
    ])
      iconPath(id);
    const folders = associations({
      ...source.folderNames,
      ...theme.folderNames,
    });
    const expanded = associations({
      ...source.folderNamesExpanded,
      ...theme.folderNamesExpanded,
    });
    return {
      name: `Glyph ${appearance === "dark" ? "Dark" : "Light"}`,
      appearance,
      directory_icons: {
        collapsed: iconPath(theme.folder),
        expanded: iconPath(theme.folderExpanded ?? theme.folder),
      },
      named_directory_icons: Object.fromEntries(
        Object.entries(folders).map(([name, id]) => [
          name,
          {
            collapsed: iconPath(id),
            expanded: iconPath(expanded[name] ?? id),
          },
        ]),
      ),
      file_stems,
      file_suffixes,
      file_icons,
    } satisfies IconTheme;
  });
  return {
    $schema: "https://zed.dev/schema/icon_themes/v0.3.0.json",
    name: "Glyph",
    author,
    themes,
  } satisfies IconThemeFamily;
}
