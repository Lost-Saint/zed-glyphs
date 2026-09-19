import { expect, test } from "bun:test";
import { createZedIconThemeFamily } from "./symbols-theme-converter";
import type { SymbolsTheme } from "./types/symbols-icon-theme";

function createSymbolsThemeFixture(): SymbolsTheme {
	return {
		iconDefinitions: {
			document: { iconPath: "./icons/files/document.svg" },
			code: { iconPath: "./icons/files/code.svg" },
			git: { iconPath: "./icons/files/git.svg" },
			folder: { iconPath: "./icons/folders/folder.svg" },
			open: { iconPath: "./icons/folders/folder-open.svg" },
		},
		file: "document",
		folder: "folder",
		fileNames: { "Cargo.toml": "code", ".gitignore": "git" },
		fileExtensions: { "d.ts": "code" },
		folderNames: { src: "folder" },
		folderNamesExpanded: { src: "open" },
	};
}

test("preserves IDs, mixed-case filenames, compound suffixes and default", () => {
	const zedTheme = createZedIconThemeFamily(createSymbolsThemeFixture(), "Maintainer").themes[0];
	if (!zedTheme) throw new Error("Expected a dark theme");
	expect(zedTheme.file_stems["Cargo.toml"]).toBe("code");
	expect(zedTheme.file_stems["cargo.toml"]).toBe("code");
	expect(zedTheme.file_stems[".gitignore"]).toBe("git");
	expect(zedTheme.file_icons.git?.path).toBe("./icons/files/git.svg");
	expect(zedTheme.file_suffixes["d.ts"]).toBe("code");
	expect(zedTheme.file_icons.default?.path).toBe("./icons/files/document.svg");
	expect(zedTheme.named_directory_icons.src?.expanded).toBe("./icons/folders/folder-open.svg");
});

test("light overrides inherit other mappings without altering dark icons", () => {
	const symbolsTheme = createSymbolsThemeFixture();
	symbolsTheme.light = {
		iconDefinitions: { code: { iconPath: "./icons/files/code-light.svg" } },
	};
	const [darkTheme, lightTheme] = createZedIconThemeFamily(symbolsTheme, "Maintainer").themes;
	expect(darkTheme?.file_icons.code?.path).toBe("./icons/files/code.svg");
	expect(lightTheme?.file_icons.code?.path).toBe("./icons/files/code-light.svg");
	expect(lightTheme?.file_stems["Cargo.toml"]).toBe("code");
});

test("repairs upstream LESS association from its language mapping", () => {
	const symbolsTheme = createSymbolsThemeFixture();
	symbolsTheme.fileExtensions = { less: "less" };
	symbolsTheme.languageIds = { less: "code" };
	expect(
		createZedIconThemeFamily(symbolsTheme, "Maintainer").themes[0]?.file_icons.less?.path,
	).toBe("./icons/files/code.svg");
});

test("rejects missing definitions and paths outside bundled icons", () => {
	const symbolsTheme = createSymbolsThemeFixture();
	symbolsTheme.fileExtensions = { broken: "missing" };
	expect(() => createZedIconThemeFamily(symbolsTheme, "Maintainer")).toThrow(
		"Missing upstream icon definition",
	);
	symbolsTheme.fileExtensions = {};
	symbolsTheme.iconDefinitions.document = { iconPath: "../secret.svg" };
	expect(() => createZedIconThemeFamily(symbolsTheme, "Maintainer")).toThrow(
		"Unsupported icon path",
	);
});

test("expanded-only folder mappings use the default collapsed icon", () => {
	const symbolsTheme = createSymbolsThemeFixture();
	symbolsTheme.folderNamesExpanded = { special: "open" };
	const zedTheme = createZedIconThemeFamily(symbolsTheme, "Maintainer").themes[0];
	expect(zedTheme?.named_directory_icons.special).toEqual({
		collapsed: "./icons/folders/folder.svg",
		expanded: "./icons/folders/folder-open.svg",
	});
});

test("light language overrides preserve the base LESS fallback", () => {
	const symbolsTheme = createSymbolsThemeFixture();
	symbolsTheme.fileExtensions = { less: "less" };
	symbolsTheme.languageIds = { less: "code" };
	symbolsTheme.light = { languageIds: { javascript: "code" } };
	expect(
		createZedIconThemeFamily(symbolsTheme, "Maintainer").themes[1]?.file_icons.less?.path,
	).toBe("./icons/files/code.svg");
});

test("case aliases preserve explicit mappings and special object keys", () => {
	const symbolsTheme = createSymbolsThemeFixture();
	symbolsTheme.fileNames = JSON.parse(
		'{"README":"code","readme":"git","constructor":"code","__proto__":"git"}',
	);
	const zedTheme = createZedIconThemeFamily(symbolsTheme, "Maintainer").themes[0];
	expect(zedTheme?.file_stems.README).toBe("code");
	expect(zedTheme?.file_stems.readme).toBe("git");
	const fileStemEntries = new Map(Object.entries(zedTheme?.file_stems ?? {}));
	expect(fileStemEntries.get("constructor")).toBe("code");
	expect(fileStemEntries.get("__proto__")).toBe("git");
});
