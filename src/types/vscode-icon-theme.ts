interface VSCodeIconTheme extends ThemeVariant {
  $schema?: string;
  iconDefinitions: Record<string, IconDefinition>;
  fonts?: FontDefinition[];
  hidesExplorerArrows?: boolean;
  showLanguageModeIcons?: boolean;

  // Theme variants
  light?: ThemeVariant;
  highContrast?: ThemeVariant;
}

interface IconDefinition {
  iconPath?: string; // image path; font icons do not require one
  fontCharacter?: string;
  fontColor?: string;
  fontSize?: string;
  fontId?: string;
}

interface ThemeVariant {
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

interface FontDefinition {
  id: string;
  src: { path: string; format: string }[];
  weight?: string;
  style?: string;
  size?: string;
}

/** Glyph's image-only input contract, narrower than a general VS Code theme. */
type ImageIconDefinition = IconDefinition & { iconPath: string };
type SymbolsVariant = ThemeVariant & {
  // The converter also supports per-variant image definitions.
  iconDefinitions?: Record<string, ImageIconDefinition>;
};
type SymbolsTheme = Omit<
  VSCodeIconTheme,
  "iconDefinitions" | "light" | "highContrast"
> & {
  iconDefinitions: Record<string, ImageIconDefinition>;
  file: string;
  folder: string;
  light?: SymbolsVariant;
  highContrast?: SymbolsVariant;
};

export type {
  FontDefinition,
  IconDefinition,
  SymbolsTheme,
  ThemeVariant,
  VSCodeIconTheme,
};
