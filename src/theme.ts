import type { IconTheme, IconThemeFamily } from "./types/icon-theme";
import type { SymbolsTheme } from "./types/vscode-icon-theme";

// Zed matches case sensitively. Preserve exact upstream names and add common
// casing variants without overwriting any explicit upstream association.
function expandCaseAliases(source: Record<string, string> = {}) {
  const result: Record<string, string> = Object.create(null);
  for (const [name, id] of Object.entries(source)) {
    result[name.toLowerCase()] ??= id;
    result[name.toUpperCase()] ??= id;
    result[name.charAt(0).toUpperCase() + name.slice(1)] ??= id;
  }
  return Object.fromEntries(
    Object.entries({ ...result, ...source }).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
  );
}

export function convertSymbolsTheme(
  source: SymbolsTheme,
  author: string,
  name = "Glyph",
) {
  const themes = (["dark", "light"] as const).map((appearance) => {
    const theme =
      appearance === "light" ? { ...source, ...source.light } : source;
    const definitions = Object.assign(
      Object.create(null),
      source.iconDefinitions,
      theme.iconDefinitions,
    ) as SymbolsTheme["iconDefinitions"];
    const languageIds = { ...source.languageIds, ...theme.languageIds };
    // Upstream has a dangling LESS extension ID. Its language mapping
    // supplies the intended artwork. Leave a future dedicated icon intact.
    if (!definitions.less && languageIds.less) {
      const less = definitions[languageIds.less];
      if (less) definitions.less = less;
    }
    const resolveIconPath = (id: string) => {
      const definition = definitions[id];
      if (!definition)
        throw new Error(`Missing upstream icon definition: ${id}`);
      const value = definition.iconPath;
      if (!/^\.\/icons\/(?:[\w-]+\/)*[\w-]+\.svg$/.test(value)) {
        throw new Error(`Unsupported icon path: ${value}`);
      }
      return value;
    };
    const fileIcons = Object.fromEntries(
      Object.keys(definitions)
        .sort()
        .map((id) => [id, { path: resolveIconPath(id) }]),
    );
    fileIcons.default = { path: resolveIconPath(theme.file) };
    const fileStems = expandCaseAliases({
      ...source.fileNames,
      ...theme.fileNames,
    });
    const fileSuffixes = expandCaseAliases({
      ...source.fileExtensions,
      ...theme.fileExtensions,
    });
    for (const id of [
      ...Object.values(fileStems),
      ...Object.values(fileSuffixes),
    ])
      resolveIconPath(id);
    const folders = expandCaseAliases({
      ...source.folderNames,
      ...theme.folderNames,
    });
    const expanded = expandCaseAliases({
      ...source.folderNamesExpanded,
      ...theme.folderNamesExpanded,
    });
    return {
      name: `${name} ${appearance === "dark" ? "Dark" : "Light"}`,
      appearance,
      directory_icons: {
        collapsed: resolveIconPath(theme.folder),
        expanded: resolveIconPath(theme.folderExpanded ?? theme.folder),
      },
      named_directory_icons: Object.fromEntries(
        [...new Set([...Object.keys(folders), ...Object.keys(expanded)])]
          .sort()
          .map((folderName) => [
            folderName,
            {
              collapsed: resolveIconPath(folders[folderName] ?? theme.folder),
              expanded: resolveIconPath(
                expanded[folderName] ??
                  folders[folderName] ??
                  theme.folderExpanded ??
                  theme.folder,
              ),
            },
          ]),
      ),
      file_stems: fileStems,
      file_suffixes: fileSuffixes,
      file_icons: fileIcons,
    } satisfies IconTheme;
  });
  return {
    $schema: "https://zed.dev/schema/icon_themes/v0.3.0.json",
    name,
    author,
    themes,
  } satisfies IconThemeFamily;
}
