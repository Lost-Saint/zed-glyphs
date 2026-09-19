import type { IconTheme, IconThemeFamily } from "./types/zed-icon-theme";
import type { SymbolsTheme } from "./types/symbols-icon-theme";

// Zed matches case sensitively. Preserve exact upstream names and add common
// casing variants without overwriting any explicit upstream association.
function addCaseAliases(associations: Record<string, string> = {}) {
	const aliases: Record<string, string> = Object.create(null);
	for (const [name, iconId] of Object.entries(associations)) {
		aliases[name.toLowerCase()] ??= iconId;
		aliases[name.toUpperCase()] ??= iconId;
		aliases[name.charAt(0).toUpperCase() + name.slice(1)] ??= iconId;
	}
	return Object.fromEntries(
		Object.entries({ ...aliases, ...associations }).sort(([a], [b]) =>
			a < b ? -1 : a > b ? 1 : 0,
		),
	);
}

export function createZedIconThemeFamily(
	symbolsTheme: SymbolsTheme,
	authorName: string,
	familyName = "Glyph",
) {
	const zedThemes = (["dark", "light"] as const).map((appearance) => {
		const appearanceTheme =
			appearance === "light" ? { ...symbolsTheme, ...symbolsTheme.light } : symbolsTheme;
		const iconDefinitions = Object.assign(
			Object.create(null),
			symbolsTheme.iconDefinitions,
			appearanceTheme.iconDefinitions,
		) as SymbolsTheme["iconDefinitions"];
		const languageIds = {
			...symbolsTheme.languageIds,
			...appearanceTheme.languageIds,
		};
		// Upstream has a dangling LESS extension ID. Its language mapping
		// supplies the intended artwork. Leave a future dedicated icon intact.
		if (!iconDefinitions.less && languageIds.less) {
			const lessIconDefinition = iconDefinitions[languageIds.less];
			if (lessIconDefinition) iconDefinitions.less = lessIconDefinition;
		}
		const resolveIconPath = (iconId: string) => {
			const iconDefinition = iconDefinitions[iconId];
			if (!iconDefinition) throw new Error(`Missing upstream icon definition: ${iconId}`);
			const iconPath = iconDefinition.iconPath;
			if (!/^\.\/icons\/(?:[\w-]+\/)*[\w-]+\.svg$/.test(iconPath)) {
				throw new Error(`Unsupported icon path: ${iconPath}`);
			}
			return iconPath;
		};
		const fileIcons = Object.fromEntries(
			Object.keys(iconDefinitions)
				.sort()
				.map((iconId) => [iconId, { path: resolveIconPath(iconId) }]),
		);
		fileIcons.default = { path: resolveIconPath(appearanceTheme.file) };
		const fileStems = addCaseAliases({
			...symbolsTheme.fileNames,
			...appearanceTheme.fileNames,
		});
		const fileSuffixes = addCaseAliases({
			...symbolsTheme.fileExtensions,
			...appearanceTheme.fileExtensions,
		});
		for (const iconId of [...Object.values(fileStems), ...Object.values(fileSuffixes)])
			resolveIconPath(iconId);
		const folderAssociations = addCaseAliases({
			...symbolsTheme.folderNames,
			...appearanceTheme.folderNames,
		});
		const expandedFolderAssociations = addCaseAliases({
			...symbolsTheme.folderNamesExpanded,
			...appearanceTheme.folderNamesExpanded,
		});
		return {
			name: `${familyName} ${appearance === "dark" ? "Dark" : "Light"}`,
			appearance,
			directory_icons: {
				collapsed: resolveIconPath(appearanceTheme.folder),
				expanded: resolveIconPath(appearanceTheme.folderExpanded ?? appearanceTheme.folder),
			},
			named_directory_icons: Object.fromEntries(
				[
					...new Set([
						...Object.keys(folderAssociations),
						...Object.keys(expandedFolderAssociations),
					]),
				]
					.sort()
					.map((folderName) => [
						folderName,
						{
							collapsed: resolveIconPath(
								folderAssociations[folderName] ?? appearanceTheme.folder,
							),
							expanded: resolveIconPath(
								expandedFolderAssociations[folderName] ??
									folderAssociations[folderName] ??
									appearanceTheme.folderExpanded ??
									appearanceTheme.folder,
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
		name: familyName,
		author: authorName,
		themes: zedThemes,
	} satisfies IconThemeFamily;
}
