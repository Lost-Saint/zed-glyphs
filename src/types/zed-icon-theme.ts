type DirectoryIcons = {
	collapsed?: string | null;
	expanded?: string | null;
};

type NamedDirectoryIcons = {
	[key: string]: DirectoryIcons;
};

type ChevronIcons = DirectoryIcons;

type IconDefinition = {
	path: string;
};

export type IconTheme = {
	name: string;
	appearance: "light" | "dark";
	directory_icons?: DirectoryIcons;
	named_directory_icons?: NamedDirectoryIcons;
	chevron_icons?: ChevronIcons;
	file_stems?: Record<string, string>;
	file_suffixes?: Record<string, string>;
	file_icons?: Record<string, IconDefinition>;
};

/** Zed's icon-theme family, matching schemas/icon-theme.json (v0.3.0). */
export type IconThemeFamily = {
	$schema?: string;
	name: string;
	author: string;
	themes: IconTheme[];
};
