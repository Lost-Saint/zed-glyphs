interface SymbolsThemeSource extends SymbolsThemeVariant {
	$schema?: string;
	iconDefinitions: Record<string, SymbolsIconDefinition>;
	fonts?: SymbolsFontDefinition[];
	hidesExplorerArrows?: boolean;
	showLanguageModeIcons?: boolean;

	// Theme variants
	light?: SymbolsThemeVariant;
	highContrast?: SymbolsThemeVariant;
}

interface SymbolsIconDefinition {
	iconPath?: string; // image path; font icons do not require one
	fontCharacter?: string;
	fontColor?: string;
	fontSize?: string;
	fontId?: string;
}

interface SymbolsThemeVariant {
	file?: string;
	folder?: string;
	folderExpanded?: string;
	rootFolder?: string;
	rootFolderExpanded?: string;
	fileNames?: Record<string, string>;
	fileExtensions?: Record<string, string>;
	languageIds?: Record<string, string>;
	folderNames?: Record<string, string>;
	folderNamesExpanded?: Record<string, string>;
	rootFolderNames?: Record<string, string>;
	rootFolderNamesExpanded?: Record<string, string>;
}

interface SymbolsFontDefinition {
	id: string;
	src: { path: string; format: string }[];
	weight?: string;
	style?: string;
	size?: string;
}

/** Glyph's image-only input contract for the upstream Symbols theme. */
type SymbolsImageIconDefinition = SymbolsIconDefinition & { iconPath: string };
type SymbolsImageThemeVariant = SymbolsThemeVariant & {
	// The converter also supports per-variant image definitions.
	iconDefinitions?: Record<string, SymbolsImageIconDefinition>;
};
type SymbolsTheme = Omit<SymbolsThemeSource, "iconDefinitions" | "light" | "highContrast"> & {
	iconDefinitions: Record<string, SymbolsImageIconDefinition>;
	file: string;
	folder: string;
	light?: SymbolsImageThemeVariant;
	highContrast?: SymbolsImageThemeVariant;
};

export type { SymbolsTheme };
